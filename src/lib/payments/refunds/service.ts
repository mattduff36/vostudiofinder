import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { applyRefundBenefit } from './access-effects';
import { getRefundEligibility, paymentRevision, readRefundPayment, subscriptionPeriod } from './eligibility';
import { canReplayProviderRequest, HELD_MONEY_STATES, providerMoneyState, REFUND_PAUSED_MESSAGE, RefundError, refundActivationEnabled, refundLifecycleEnabled, settlementProjection, settledPaymentStatus, validateRefundChoices, type RefundRequest } from './contracts';
import { providerId, refundFingerprint } from './identity';

const LEASE_MS = 60_000;

export { operationSummary } from './presentation';

export async function getRefundOperation(id: string) {
  const operation = await db.refund_operations.findUnique({ where: { id } });
  if (!operation) throw new RefundError('OPERATION_NOT_FOUND', 'Refund operation not found', 404);
  return operation;
}

/** Durable identity is created before any provider submission. */
export async function prepareRefund(paymentId: string, actorId: string, request: RefundRequest) {
  if (!refundLifecycleEnabled() || !refundActivationEnabled()) throw new RefundError('REFUND_INITIATION_PAUSED', REFUND_PAUSED_MESSAGE, 503);
  const hash = refundFingerprint({ paymentId, actorId, request });
  const existing = await db.refund_operations.findUnique({ where: { request_key: request.requestKey } });
  if (existing) {
    if (existing.payload_hash !== hash) throw new RefundError('REQUEST_KEY_CONFLICT', 'This request key already belongs to a different refund.');
    return existing;
  }
  const eligibility = await getRefundEligibility(paymentId);
  if (!eligibility.enabled) throw new RefundError('REFUND_UNAVAILABLE', eligibility.reason ?? 'Refund unavailable');
  if (request.previewToken !== eligibility.previewToken) throw new RefundError('PREVIEW_CHANGED', 'Payment or renewal details changed. Review the refund again.');
  const full = validateRefundChoices(request, eligibility);
  return db.$transaction(async tx => {
    const payment = await tx.payments.findUnique({ where: { id: paymentId } });
    if (!payment) throw new RefundError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${payment.user_id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM payments WHERE id = ${paymentId} FOR UPDATE`;
    const duplicate = await tx.refund_operations.findUnique({ where: { request_key: request.requestKey } });
    if (duplicate) {
      if (duplicate.payload_hash !== hash) throw new RefundError('REQUEST_KEY_CONFLICT', 'This request key already belongs to a different refund.');
      return duplicate;
    }
    const current = await tx.payments.findUnique({ where: { id: paymentId }, include: {
      refunds: true, refund_operations: true, benefit_grants: true,
      users: { select: { id: true, status: true, deletion_status: true, deletion_requested_at: true, deletion_scheduled_for: true } },
    } });
    if (!current || paymentRevision(current) !== eligibility.revision) throw new RefundError('PAYMENT_CHANGED', 'Payment state changed. Review the refund again.');
    if (current.refund_operations.some(o => HELD_MONEY_STATES.includes(o.money_status as typeof HELD_MONEY_STATES[number]))) {
      throw new RefundError('REFUND_IN_PROGRESS', 'An existing refund must be reconciled first.');
    }
    if (current.refunded_amount + request.amount > current.amount || !current.stripe_payment_intent_id) throw new RefundError('INSUFFICIENT_BALANCE', 'The refundable balance changed.');
    const id = randomUUID();
    return tx.refund_operations.create({ data: {
      id, request_key: request.requestKey, payload_hash: hash, payment_id: paymentId,
      user_reference: payment.user_id, actor_id: actorId, source: 'ADMIN',
      stripe_payment_intent_id: current.stripe_payment_intent_id, amount: request.amount, currency: current.currency,
      reason: request.reason, comment: request.comment || null, idempotency_key: `refund/${id}`,
      benefit_action: full ? request.benefitAction ?? null : null,
      benefit_grant_id: full && request.benefitAction === 'END' ? eligibility.benefit!.id : null,
      benefit_status: full ? 'PENDING' : 'NOT_APPLICABLE',
      billing_action: full ? request.billingAction ?? null : null,
      billing_status: full && eligibility.billing ? 'PENDING' : 'NOT_APPLICABLE',
      stripe_subscription_id: full ? eligibility.billing?.subscriptionId ?? null : null,
      billing_effective_at: full && eligibility.billing?.periodEnd ? new Date(eligibility.billing.periodEnd) : null,
      billing_idempotency_key: `refund-renewal/${id}`,
      eligibility_snapshot: JSON.parse(JSON.stringify(eligibility)) as Prisma.InputJsonValue,
    } });
  });
}

export async function claimOperation(id: string) {
  const token = randomUUID();
  const now = new Date();
  const result = await db.refund_operations.updateMany({ where: { id, OR: [{ lease_expires_at: null }, { lease_expires_at: { lte: now } }] },
    data: { lease_token: token, lease_expires_at: new Date(now.getTime() + LEASE_MS), reconciliation_attempts: { increment: 1 } } });
  if (!result.count) throw new RefundError('RECONCILIATION_BUSY', 'This refund is already being reconciled. Retry shortly.');
  return token;
}

export async function releaseOperation(id: string, token: string) {
  await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { lease_token: null, lease_expires_at: null } });
}

/** Initial submission and same-operation recovery. No new request ID is invented. */
export async function submitRefundMoney(id: string) {
  let operation = await getRefundOperation(id);
  if (operation.stripe_refund_id) return reconcileProviderRefund(operation.stripe_refund_id);
  if (operation.source !== 'ADMIN' || ['FAILED', 'CANCELLED', 'SUCCEEDED'].includes(operation.money_status)) return operation;
  const token = await claimOperation(id);
  try {
    operation = await getRefundOperation(id);
    if (!operation.payment_id) throw new RefundError('PAYMENT_MAPPING_REQUIRED', 'The original payment is unavailable. Manual reconciliation is required.');
    // Provider evidence can recover an accepted request even after the replay window.
    if (operation.submitted_at) {
      for await (const refund of stripe.refunds.list({ payment_intent: operation.stripe_payment_intent_id, limit: 100 })) {
        if (refund.metadata?.refund_operation_id === id) {
          await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { stripe_refund_id: refund.id } });
          await releaseOperation(id, token);
          return reconcileProviderRefund(refund.id);
        }
      }
    }
    if (!canReplayProviderRequest(operation.submitted_at)) {
      await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { money_status: 'REVIEW', last_error_code: 'PROVIDER_REPLAY_WINDOW_EXPIRED' } });
      return getRefundOperation(id);
    }
    // Pausing initiation also prevents an undispatched prepared operation starting later.
    if (!operation.submitted_at && !refundActivationEnabled()) throw new RefundError('REFUND_INITIATION_PAUSED', REFUND_PAUSED_MESSAGE, 503);
    await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { money_status: 'SUBMITTING', submitted_at: operation.submitted_at ?? new Date() } });
    let refund: Stripe.Refund;
    try {
      refund = await stripe.refunds.create({ payment_intent: operation.stripe_payment_intent_id, amount: operation.amount,
        reason: operation.reason as Stripe.RefundCreateParams.Reason,
        metadata: { refund_operation_id: id, payment_id: operation.payment_id } }, { idempotencyKey: operation.idempotency_key });
    } catch (error) {
      // Only a definitive pre-execution validation rejection releases the reservation.
      const rejected = error instanceof Stripe.errors.StripeInvalidRequestError && error.statusCode === 400;
      await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: {
        money_status: rejected ? 'FAILED' : 'UNKNOWN', last_error_code: rejected ? 'PROVIDER_REJECTED_REQUEST' : 'PROVIDER_OUTCOME_UNKNOWN',
      } });
      return getRefundOperation(id);
    }
    await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { stripe_refund_id: refund.id, provider_status: refund.status ?? null } });
    await releaseOperation(id, token);
    return reconcileProviderRefund(refund.id);
  } finally { await releaseOperation(id, token); }
}

/** Fenced provider reads distinguish old event payloads from genuine later returns/failures. */
export async function reconcileProviderRefund(refundId: string) {
  const hint = await stripe.refunds.retrieve(refundId);
  const intentId = providerId(hint.payment_intent);
  if (!intentId) throw new RefundError('REFUND_PAYMENT_UNKNOWN', 'Provider refund has no attributable payment intent.');
  const payment = await db.payments.findUnique({ where: { stripe_payment_intent_id: intentId } });
  if (!payment) throw new RefundError('REFUND_PAYMENT_UNKNOWN', 'Payment mapping is missing. This refund remains in the event inbox for review.');
  const operation = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${payment.user_id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM payments WHERE id = ${payment.id} FOR UPDATE`;
    const existing = await tx.refund_operations.findUnique({ where: { stripe_refund_id: refundId } });
    if (existing) return existing;
    const requestedId = hint.metadata?.refund_operation_id;
    const requested = requestedId ? await tx.refund_operations.findUnique({ where: { id: requestedId } }) : null;
    if (requested) {
      if (requested.payment_id !== payment.id || requested.amount !== hint.amount || requested.currency !== hint.currency
        || (requested.stripe_refund_id && requested.stripe_refund_id !== refundId)) throw new RefundError('REFUND_IDENTITY_CONFLICT', 'Refund identifiers require review.');
      return tx.refund_operations.update({ where: { id: requested.id }, data: { stripe_refund_id: refundId } });
    }
    return tx.refund_operations.create({ data: {
      id: `stripe-${refundId}`, payload_hash: refundFingerprint({ refundId, intentId }), payment_id: payment.id,
      user_reference: payment.user_id, source: 'PROVIDER', stripe_payment_intent_id: intentId,
      stripe_refund_id: refundId, amount: hint.amount, currency: hint.currency, reason: hint.reason,
      idempotency_key: `external/${refundId}`, billing_idempotency_key: `external-renewal/${refundId}`, money_status: 'UNKNOWN',
    } });
  });
  const token = await claimOperation(operation.id);
  try {
    const checked = await stripe.refunds.retrieve(refundId);
    const checkedAt = new Date();
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${operation.user_reference} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM payments WHERE id = ${payment.id} FOR UPDATE`;
      const current = await tx.refund_operations.findUnique({ where: { id: operation.id } });
      if (!current || current.lease_token !== token || !current.lease_expires_at || current.lease_expires_at < checkedAt) throw new RefundError('LEASE_CHANGED', 'Refund reconciliation will resume with a fresh provider check.');
      if (providerId(checked.payment_intent) !== intentId || checked.amount !== current.amount || checked.currency !== payment.currency) {
        await tx.refund_operations.update({ where: { id: current.id }, data: { money_status: 'REVIEW', last_error_code: 'PROVIDER_IDENTITY_MISMATCH' } });
        return;
      }
      const money = providerMoneyState(checked.status);
      const reversed = current.money_status === 'SUCCEEDED' && money !== 'SUCCEEDED';
      await tx.refunds.upsert({ where: { stripe_refund_id: refundId },
        create: { id: randomUUID(), stripe_refund_id: refundId, stripe_payment_intent_id: intentId,
          amount: checked.amount, currency: checked.currency, reason: checked.reason, comment: current.comment,
          status: settlementProjection(money), processed_by: current.actor_id, user_id: payment.user_id, payment_id: payment.id,
          operation_id: current.id, source: current.source, provider_status: checked.status ?? null, provider_checked_at: checkedAt, updated_at: checkedAt },
        update: { status: settlementProjection(money), provider_status: checked.status ?? null, provider_checked_at: checkedAt,
          operation_id: current.id, updated_at: checkedAt },
      });
      const sum = await tx.refunds.aggregate({ where: { payment_id: payment.id, status: 'SUCCEEDED' }, _sum: { amount: true } });
      const settled = sum._sum.amount ?? 0;
      if (settled > payment.amount) throw new RefundError('REFUND_LEDGER_CONFLICT', 'Refund totals exceed the original payment. Review provider records.');
      const full = settled === payment.amount;
      const review = reversed || (full && !current.benefit_action);
      await tx.payments.update({ where: { id: payment.id }, data: { refunded_amount: settled, status: settledPaymentStatus(payment.amount, settled), updated_at: checkedAt } });
      await tx.refund_operations.update({ where: { id: current.id }, data: {
        money_status: money, provider_status: checked.status ?? null, provider_checked_at: checkedAt,
        last_error_code: reversed ? 'PROVIDER_SETTLEMENT_CHANGED' : null,
        access_review_required: current.access_review_required || review,
        ...(review ? { benefit_status: 'REVIEW', ...(current.billing_status !== 'NOT_APPLICABLE' ? { billing_status: 'REVIEW' } : {}) } : {}),
        ...(money === 'SUCCEEDED' && current.source === 'ADMIN' && current.notification_status === 'NOT_REQUESTED' ? { notification_status: 'PENDING' } : {}),
      } });
    });
  } finally { await releaseOperation(operation.id, token); }
  await applyRefundBenefit(operation.id);
  await reconcileRefundBilling(operation.id);
  return getRefundOperation(operation.id);
}

/** Billing recovery is separate: this function cannot call refunds.create. */
export async function reconcileRefundBilling(id: string) {
  const initial = await getRefundOperation(id);
  if (initial.money_status !== 'SUCCEEDED' || !['PENDING', 'UNKNOWN', 'SUBMITTING'].includes(initial.billing_status)) return initial;
  const token = await claimOperation(id);
  try {
    const operation = await getRefundOperation(id);
    if (operation.money_status !== 'SUCCEEDED' || operation.access_review_required) return operation;
    if (operation.billing_action === 'KEEP') {
      await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { billing_status: 'APPLIED' } });
      return getRefundOperation(id);
    }
    if (operation.billing_action !== 'CANCEL_AT_PERIOD_END' || !operation.stripe_subscription_id || !operation.billing_effective_at) {
      await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { billing_status: 'REVIEW', last_error_code: 'BILLING_MAPPING_REQUIRED' } });
      return getRefundOperation(id);
    }
    const target = await db.subscriptions.findUnique({ where: { stripe_subscription_id: operation.stripe_subscription_id }, include: { users: true } });
    if (!target || target.user_id !== operation.user_reference || target.users.deletion_status !== 'ACTIVE' || target.users.deletion_requested_at || target.users.deletion_scheduled_for) {
      await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { billing_status: 'REVIEW', last_error_code: 'BILLING_MAPPING_CHANGED' } });
      return getRefundOperation(id);
    }
    let subscription = await stripe.subscriptions.retrieve(operation.stripe_subscription_id);
    const period = subscriptionPeriod(subscription);
    if (subscription.id !== operation.stripe_subscription_id || (subscription.status !== 'canceled' && period?.end.getTime() !== operation.billing_effective_at.getTime())) {
      await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { billing_status: 'REVIEW', last_error_code: 'BILLING_PERIOD_CHANGED' } });
      return getRefundOperation(id);
    }
    if (!subscription.cancel_at_period_end && subscription.status !== 'canceled') {
      if (!canReplayProviderRequest(operation.billing_submitted_at)) {
        await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { billing_status: 'REVIEW', last_error_code: 'BILLING_REPLAY_WINDOW_EXPIRED' } });
        return getRefundOperation(id);
      }
      await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { billing_status: 'SUBMITTING', billing_submitted_at: operation.billing_submitted_at ?? new Date() } });
      try {
        await stripe.subscriptions.update(operation.stripe_subscription_id, { cancel_at_period_end: true }, { idempotencyKey: operation.billing_idempotency_key });
        // API v1 may replay a cached acceptance even after someone re-enabled renewal.
        // Only a new authoritative read can establish the current billing outcome.
        subscription = await stripe.subscriptions.retrieve(operation.stripe_subscription_id);
      } catch {
        await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { billing_status: 'UNKNOWN', last_error_code: 'BILLING_OUTCOME_UNKNOWN' } });
        return getRefundOperation(id);
      }
    }
    if (subscription.id !== operation.stripe_subscription_id
      || (subscription.status !== 'canceled' && (!subscription.cancel_at_period_end
        || subscriptionPeriod(subscription)?.end.getTime() !== operation.billing_effective_at.getTime()))) {
      await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: {
        billing_status: 'REVIEW', last_error_code: 'BILLING_CURRENT_STATE_CHANGED',
        billing_evidence: { subscriptionId: subscription.id, cancelAtPeriodEnd: subscription.cancel_at_period_end, providerStatus: subscription.status, checkedAt: new Date().toISOString() },
      } });
      return getRefundOperation(id);
    }
    await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: {
      billing_status: 'APPLIED', billing_evidence: { subscriptionId: subscription.id, cancelAtPeriodEnd: subscription.cancel_at_period_end, providerStatus: subscription.status, checkedAt: new Date().toISOString() },
    } });
    return getRefundOperation(id);
  } finally { await releaseOperation(id, token); }
}

export function isRefundEvent(type: string) {
  return ['charge.refunded', 'refund.created', 'refund.updated', 'refund.failed'].includes(type);
}

export async function ingestRefundEvent(event: Stripe.Event) {
  await db.stripe_webhook_events.upsert({ where: { stripe_event_id: event.id }, update: {}, create: {
    id: randomUUID(), stripe_event_id: event.id, type: event.type, payload: event.data.object as unknown as Prisma.InputJsonValue,
  } });
  // Containment is schema-independent. Keep receipts pending for a later approved replay.
  if (!refundLifecycleEnabled()) return { pending: true };
  await db.stripe_webhook_events.update({ where: { stripe_event_id: event.id }, data: { last_attempt_at: new Date(), attempt_count: { increment: 1 } } });
  try {
    await processRefundEvent(event.type, event.data.object);
    await db.stripe_webhook_events.update({ where: { stripe_event_id: event.id }, data: { processed: true, processed_at: new Date(), error: null } });
    return { pending: false };
  } catch (error) {
    await db.stripe_webhook_events.update({ where: { stripe_event_id: event.id }, data: { processed: false, error: error instanceof RefundError ? error.code : 'REFUND_RECONCILIATION_FAILED' } });
    throw error;
  }
}

export async function processRefundEvent(type: string, object: unknown) {
  if (!object || typeof object !== 'object' || !('id' in object) || typeof object.id !== 'string') throw new RefundError('INVALID_EVENT', 'Invalid refund event', 400);
  if (type === 'charge.refunded') {
    for await (const refund of stripe.refunds.list({ charge: object.id, limit: 100 })) await reconcileProviderRefund(refund.id);
  } else if (isRefundEvent(type)) await reconcileProviderRefund(object.id);
}

export async function reconcilePaymentRefunds(paymentId: string) {
  const payment = await readRefundPayment(paymentId);
  if (!payment?.stripe_payment_intent_id) throw new RefundError('PAYMENT_NOT_FOUND', 'Payment intent not found', 404);
  for await (const refund of stripe.refunds.list({ payment_intent: payment.stripe_payment_intent_id, limit: 100 })) await reconcileProviderRefund(refund.id);
}
