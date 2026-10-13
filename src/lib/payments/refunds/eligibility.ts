import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { describePaymentPackage } from '@/lib/payment-package';
import { HELD_MONEY_STATES, REFUND_PAUSED_MESSAGE, RefundError, refundActivationEnabled, refundLifecycleEnabled, type RefundEligibility } from './contracts';
import { metadataRecord, refundFingerprint } from './identity';
import type Stripe from 'stripe';
import { operationSummary } from './presentation';
import { canEndBenefit } from './access-effects';

export function subscriptionPeriod(subscription: Stripe.Subscription) {
  const periods = subscription.items.data.map(item => ({ start: item.current_period_start, end: item.current_period_end }));
  if (!periods.length || periods.some(p => !p.start || !p.end || p.end !== periods[0]?.end)) return null;
  return { start: new Date(periods[0]!.start * 1000), end: new Date(periods[0]!.end * 1000) };
}

export async function readRefundPayment(paymentId: string) {
  return db.payments.findUnique({ where: { id: paymentId }, include: {
    refunds: true, refund_operations: true, benefit_grants: true,
    users: { select: { id: true, status: true, deletion_status: true, deletion_requested_at: true, deletion_scheduled_for: true } },
  } });
}

export function paymentRevision(payment: NonNullable<Awaited<ReturnType<typeof readRefundPayment>>>) {
  return refundFingerprint({ payment: [payment.id, payment.updated_at, payment.status, payment.refunded_amount],
    refunds: payment.refunds.map(r => [r.id, r.updated_at, r.status]).sort(),
    operations: payment.refund_operations.map(o => [o.id, o.updated_at, o.money_status]).sort(),
    grants: payment.benefit_grants.map(g => [g.id, g.updated_at, g.status]).sort(),
    user: payment.users,
  });
}

export async function getRefundEligibility(paymentId: string): Promise<RefundEligibility & { revision?: string }> {
  if (!refundLifecycleEnabled()) {
    const payment = await db.payments.findUnique({ where: { id: paymentId } });
    if (!payment) throw new RefundError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
    return { enabled: false, recoveryEnabled: false, reason: REFUND_PAUSED_MESSAGE, paymentId, currency: payment.currency, amount: payment.amount,
      settledAmount: payment.refunded_amount, heldAmount: 0, availableAmount: 0, packageLabel: describePaymentPackage(payment.metadata).label,
      previewToken: '', benefit: null, billing: null, operations: [] };
  }
  const payment = await readRefundPayment(paymentId);
  if (!payment) throw new RefundError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
  const settled = payment.refunds.filter(r => r.status === 'SUCCEEDED').reduce((sum, r) => sum + r.amount, 0);
  const held = payment.refund_operations.filter(o => HELD_MONEY_STATES.includes(o.money_status as typeof HELD_MONEY_STATES[number])).reduce((sum, o) => sum + o.amount, 0);
  const grants = payment.benefit_grants.filter(g => g.mapping_source === 'PURCHASE' && g.status === 'ACTIVE');
  const grant = grants.length === 1 ? grants[0]! : null;
  const meta = metadataRecord(payment.metadata);
  const subscriptionId = grant?.stripe_subscription_id ?? (typeof meta.subscription_id === 'string' ? meta.subscription_id : null);
  let billing: RefundEligibility['billing'] = null;
  let reason: string | null = null;
  if (settled !== payment.refunded_amount) reason = 'Recorded refund totals need reconciliation before another refund.';
  if (payment.refund_operations.some(operation => operation.access_review_required)) reason = 'An earlier refund requires an explicit access or provider-settlement review before another refund.';
  if (held) reason = 'An existing refund is pending or needs reconciliation. Resolve it before starting another.';
  if (!payment.stripe_payment_intent_id || !['SUCCEEDED', 'PARTIALLY_REFUNDED'].includes(payment.status)) reason = 'Only settled payments with a payment intent can be refunded.';
  if (payment.users.deletion_status !== 'ACTIVE' || payment.users.deletion_requested_at || payment.users.deletion_scheduled_for) reason = 'This account is undergoing deletion. Review its payment and access state first.';
  if (subscriptionId) {
    billing = { subscriptionId, state: 'REVIEW', cancelAtPeriodEnd: false, periodEnd: null, nextChargeAt: null, nextChargeAmount: null, currency: null };
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const period = subscriptionPeriod(subscription);
      const target = await db.subscriptions.findUnique({ where: { stripe_subscription_id: subscriptionId }, select: { user_id: true } });
      if (period && target?.user_id === payment.user_id) billing = {
        subscriptionId, state: 'KNOWN', cancelAtPeriodEnd: subscription.cancel_at_period_end || subscription.status === 'canceled',
        periodEnd: period.end.toISOString(), nextChargeAt: subscription.cancel_at_period_end || subscription.status === 'canceled' ? null : period.end.toISOString(),
        nextChargeAmount: null, currency: subscription.items.data[0]?.price.currency ?? null,
      };
    } catch { /* Unknown billing is surfaced and blocks a full-refund choice. */ }
  }
  if (!reason && payment.stripe_payment_intent_id) {
    try {
      const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
      if (intent.status !== 'succeeded' || intent.amount_received !== payment.amount || intent.currency !== payment.currency) reason = 'Provider payment details differ. Reconcile this payment before refunding.';
      let providerSettled = 0;
      let providerHeld = 0;
      for await (const refund of stripe.refunds.list({ payment_intent: payment.stripe_payment_intent_id, limit: 100 })) {
        if (refund.status === 'succeeded') providerSettled += refund.amount;
        else if (refund.status !== 'failed' && refund.status !== 'canceled') providerHeld += refund.amount;
      }
      if (providerSettled !== settled || providerHeld !== held) reason = 'Provider refunds differ from the local ledger. Reconcile this payment before refunding.';
    } catch { reason = 'Provider payment details could not be verified. Retry before issuing a refund.'; }
  }
  const recurringUnmapped = !subscriptionId && (meta.auto_renew === true || meta.auto_renew === 'true'
    || meta.plan === 'PREMIUM_YEARLY' || meta.purpose === 'switch_to_subscription');
  if (recurringUnmapped) billing = { subscriptionId: 'Unmapped recurring purchase', state: 'REVIEW', cancelAtPeriodEnd: false,
    periodEnd: null, nextChargeAt: null, nextChargeAmount: null, currency: null };
  const endReady = grant ? await canEndBenefit(grant, payment.user_id) : false;
  const revision = paymentRevision(payment);
  const result: RefundEligibility = {
    enabled: refundActivationEnabled() && !reason, recoveryEnabled: true, reason: !refundActivationEnabled() ? REFUND_PAUSED_MESSAGE : reason,
    paymentId, currency: payment.currency, amount: payment.amount, settledAmount: settled, heldAmount: held,
    availableAmount: Math.max(0, payment.amount - settled - held), packageLabel: describePaymentPackage(payment.metadata).label,
    benefit: grant ? { id: grant.id, kind: grant.kind, startsAt: grant.starts_at.toISOString(), endsAt: grant.ends_at.toISOString(), canEnd: endReady } : null,
    billing, operations: payment.refund_operations.map(operationSummary).sort((a, b) => a.id.localeCompare(b.id)), previewToken: '',
  };
  result.previewToken = refundFingerprint({ revision, billing, benefit: result.benefit });
  return { ...result, revision };
}
