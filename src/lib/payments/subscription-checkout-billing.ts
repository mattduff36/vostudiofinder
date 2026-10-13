import { randomUUID } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { canReplayProviderRequest } from './refunds/contracts';
import { subscriptionPeriod } from './refunds/eligibility';

const setupSchema = z.object({
  version: z.literal(1), checkoutId: z.string(), invoiceId: z.string(), subscriptionId: z.string(),
  cancelAtPeriodEnd: z.boolean(), periodEnd: z.string(),
  ownerRevision: z.string(),
  status: z.enum(['PREPARED', 'SUBMITTING', 'UNKNOWN', 'APPLIED', 'REVIEW']),
  submittedAt: z.string().nullable(), leaseToken: z.string().nullable(), leaseExpiresAt: z.string().nullable(),
  error: z.string().nullable(), checkedAt: z.string().nullable(),
});
type Setup = z.infer<typeof setupSchema>;
interface CheckoutBillingInput {
  userId: string; checkoutId: string; checkoutCreatedAt: Date; invoiceId: string;
  subscriptionId: string; wantsRenewal: boolean; periodEnd: Date;
}

/** Configure an original checkout once. A later replay cannot restore its old renewal
 * choice after a refund or customer change. Evidence uses the existing metadata table. */
export async function initializeCheckoutBilling(input: CheckoutBillingInput) {
  const key = `subscription_checkout_billing/${input.subscriptionId}`;
  const token = randomUUID(); const now = new Date();
  const setup = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${input.userId} FOR UPDATE`;
    const [user, subscription, saved, grant, refund] = await Promise.all([
      tx.users.findUnique({ where: { id: input.userId } }),
      tx.subscriptions.findUnique({ where: { stripe_subscription_id: input.subscriptionId } }),
      tx.user_metadata.findUnique({ where: { user_id_key: { user_id: input.userId, key } } }),
      tx.payment_benefit_grants.findUnique({ where: { source_key: `invoice/${input.invoiceId}` }, include: { payment: true } }),
      tx.refund_operations.findFirst({ where: { stripe_subscription_id: input.subscriptionId, billing_action: { not: null } }, select: { id: true } }),
    ]);
    if (!user || user.deletion_status !== 'ACTIVE' || user.deletion_requested_at || user.deletion_scheduled_for
      || !subscription || subscription.user_id !== input.userId || !grant || grant.user_reference !== input.userId
      || grant.subscription_id !== subscription.id || grant.ends_at.getTime() !== input.periodEnd.getTime()) throw new Error('Checkout billing identity requires review');
    const state: Setup = saved?.value ? setupSchema.parse(JSON.parse(saved.value)) : {
      version: 1, checkoutId: input.checkoutId, invoiceId: input.invoiceId, subscriptionId: input.subscriptionId,
      cancelAtPeriodEnd: !input.wantsRenewal, periodEnd: input.periodEnd.toISOString(), status: 'PREPARED',
      ownerRevision: user.updated_at.toISOString(),
      submittedAt: null, leaseToken: null, leaseExpiresAt: null, error: null, checkedAt: null,
    };
    if (state.checkoutId !== input.checkoutId || state.invoiceId !== input.invoiceId || state.subscriptionId !== input.subscriptionId
      || state.cancelAtPeriodEnd !== !input.wantsRenewal || state.periodEnd !== input.periodEnd.toISOString()) throw new Error('Checkout billing request changed');
    if (state.status === 'APPLIED') return null;
    if (state.status === 'REVIEW') throw new Error('Checkout billing requires review');
    if (state.leaseExpiresAt && new Date(state.leaseExpiresAt) > now) throw new Error('Checkout billing already processing');
    // Never replay an old checkout choice over a later refund decision. Unknown old
    // sessions need review instead of silently changing today's future billing.
    const requiresReview = !!refund || grant.status !== 'ACTIVE' || !!grant.payment?.refunded_amount
      || (!saved && !canReplayProviderRequest(input.checkoutCreatedAt, now));
    const next: Setup = { ...state, status: requiresReview ? 'REVIEW' : state.status,
      error: requiresReview ? 'LATER_BILLING_DECISION_OR_OLD_CHECKOUT' : null,
      leaseToken: requiresReview ? null : token, leaseExpiresAt: requiresReview ? null : new Date(now.getTime() + 60_000).toISOString() };
    await tx.user_metadata.upsert({ where: { user_id_key: { user_id: input.userId, key } },
      create: { id: randomUUID(), user_id: input.userId, key, value: JSON.stringify(next), updated_at: now },
      update: { value: JSON.stringify(next), updated_at: now },
    });
    return next;
  });
  if (!setup) return;
  if (setup.status === 'REVIEW') throw new Error('Checkout billing requires review');

  async function save(change: Partial<Setup>, autoRenew?: boolean) {
    return db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${input.userId} FOR UPDATE`;
      const saved = await tx.user_metadata.findUnique({ where: { user_id_key: { user_id: input.userId, key } } });
      if (!saved?.value) throw new Error('Checkout billing evidence missing');
      const state = setupSchema.parse(JSON.parse(saved.value));
      if (state.leaseToken !== token) throw new Error('Checkout billing claim changed');
      let next = { ...state, ...change };
      let mayWriteAutoRenew = autoRenew !== undefined;
      if (autoRenew !== undefined) {
        const [user, grant, refund] = await Promise.all([
          tx.users.findUnique({ where: { id: input.userId } }),
          tx.payment_benefit_grants.findUnique({ where: { source_key: `invoice/${input.invoiceId}` }, include: { payment: true } }),
          tx.refund_operations.findFirst({ where: { stripe_subscription_id: input.subscriptionId, billing_action: { not: null } }, select: { id: true } }),
        ]);
        const changed = !user || user.deletion_status !== 'ACTIVE' || user.deletion_requested_at || user.deletion_scheduled_for
          || !grant || grant.status !== 'ACTIVE' || !!grant.payment?.refunded_amount || !!refund
          || (user.updated_at.toISOString() !== state.ownerRevision && user.auto_renew !== autoRenew);
        if (changed) {
          next = { ...next, status: 'REVIEW', error: 'CHECKOUT_BILLING_CONTEXT_CHANGED' };
          mayWriteAutoRenew = false;
        } else if (user?.auto_renew === autoRenew) mayWriteAutoRenew = false;
      }
      await tx.user_metadata.update({ where: { id: saved.id }, data: { value: JSON.stringify(next), updated_at: new Date() } });
      if (mayWriteAutoRenew) await tx.users.update({ where: { id: input.userId }, data: { auto_renew: autoRenew!, updated_at: new Date() } });
      return next.status !== 'REVIEW';
    });
  }
  try {
    let current = await stripe.subscriptions.retrieve(input.subscriptionId);
    const matchesPeriod = () => current.id === input.subscriptionId && current.status !== 'canceled'
      && subscriptionPeriod(current)?.end.getTime() === input.periodEnd.getTime();
    if (!matchesPeriod()) {
      await save({ status: 'REVIEW', error: 'CHECKOUT_BILLING_PERIOD_CHANGED' });
      throw new Error('Checkout billing period changed');
    }
    if (current.cancel_at_period_end !== setup.cancelAtPeriodEnd) {
      // Stripe creates subscriptions with renewal enabled. Enabling it again here
      // could overwrite a newer customer cancellation; there is no need to do so.
      if (!setup.cancelAtPeriodEnd) {
        await save({ status: 'REVIEW', error: 'CHECKOUT_BILLING_CHOICE_CHANGED' });
        throw new Error('Checkout billing choice changed');
      }
      if (!canReplayProviderRequest(setup.submittedAt ? new Date(setup.submittedAt) : null)) {
        await save({ status: 'REVIEW', error: 'CHECKOUT_BILLING_REPLAY_WINDOW_EXPIRED' });
        throw new Error('Checkout billing replay window expired');
      }
      await save({ status: 'SUBMITTING', submittedAt: setup.submittedAt ?? new Date().toISOString() });
      try {
        await stripe.subscriptions.update(input.subscriptionId, { cancel_at_period_end: true }, { idempotencyKey: `checkout-renewal/${input.checkoutId}` });
        current = await stripe.subscriptions.retrieve(input.subscriptionId);
      } catch {
        await save({ status: 'UNKNOWN', error: 'CHECKOUT_BILLING_OUTCOME_UNKNOWN' });
        throw new Error('Checkout billing outcome unknown');
      }
      if (!matchesPeriod() || current.cancel_at_period_end !== setup.cancelAtPeriodEnd) {
        await save({ status: 'REVIEW', error: 'CHECKOUT_BILLING_CURRENT_STATE_CHANGED' });
        throw new Error('Checkout billing current state changed');
      }
    }
    if (!await save({ status: 'APPLIED', error: null, checkedAt: new Date().toISOString() }, !current.cancel_at_period_end)) throw new Error('Checkout billing context changed');
  } finally {
    await save({ leaseToken: null, leaseExpiresAt: null });
  }
}
