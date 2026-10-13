import { randomUUID } from 'crypto';
import type Stripe from 'stripe';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { recordBenefitGrant } from './benefit-grants';
import { providerId } from './refunds/identity';
import { calculate5YearRenewalExpiry, calculateEarlyRenewalExpiry, calculateStandardRenewalExpiry } from '@/lib/membership-renewal';

async function lockPurchaser(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
  const user = await tx.users.findUnique({ where: { id: userId } });
  if (!user || user.deletion_status !== 'ACTIVE' || user.deletion_requested_at || user.deletion_scheduled_for) throw new Error('Purchased benefit requires account review');
  return user;
}

/** Paid processing can create a blank admin-visible row, never republish an existing row. */
async function ensurePurchasedStudio(tx: Prisma.TransactionClient, userId: string, now: Date) {
  await tx.studio_profiles.upsert({ where: { user_id: userId }, update: {}, create: {
    id: randomUUID(), user_id: userId, name: '', city: '', is_profile_visible: false, show_email: true, updated_at: now,
  } });
}

/** Records an observed pre-purchase interval without attributing it to a historic payment. */
async function preserveSubscriptionBaseline(tx: Prisma.TransactionClient, subscription: { id: string; user_id: string; current_period_start: Date | null; current_period_end: Date | null; stripe_subscription_id: string | null }) {
  const known = await tx.payment_benefit_grants.findFirst({ where: { subscription_id: subscription.id } });
  if (known || !subscription.current_period_start || !subscription.current_period_end || subscription.current_period_end <= subscription.current_period_start) return;
  await recordBenefitGrant(tx, { sourceKey: `baseline/${subscription.id}`, paymentId: null, userId: subscription.user_id,
    kind: 'PREMIUM', subscriptionId: subscription.id, stripeSubscriptionId: subscription.stripe_subscription_id,
    startsAt: subscription.current_period_start, endsAt: subscription.current_period_end, mappingSource: 'OBSERVED_BASELINE' });
}

export async function grantPurchasedMembership(userId: string, paymentId: string, months: number, customerId?: string | null,
  tracking?: { payment_attempted_at: Date; payment_retry_count: number }) {
  return db.$transaction(async tx => {
    await lockPurchaser(tx, userId);
    const existing = await tx.payment_benefit_grants.findUnique({ where: { source_key: `payment/${paymentId}` }, include: { subscription: true } });
    if (existing?.subscription) return existing.subscription;
    const now = new Date();
    const end = new Date(now); end.setMonth(end.getMonth() + months);
    const subscription = await tx.subscriptions.create({ data: { id: randomUUID(), user_id: userId, stripe_customer_id: customerId ?? null,
      status: 'ACTIVE', payment_method: 'STRIPE', current_period_start: now, current_period_end: end, updated_at: now } });
    await recordBenefitGrant(tx, { sourceKey: `payment/${paymentId}`, paymentId, userId, kind: 'PREMIUM', subscriptionId: subscription.id, startsAt: now, endsAt: end });
    await tx.users.update({ where: { id: userId }, data: { status: 'ACTIVE', membership_tier: 'PREMIUM', updated_at: now,
      ...(tracking ? { ...tracking, day2_reminder_sent_at: null, day5_reminder_sent_at: null, failed_payment_email_sent_at: null } : {}) } });
    await ensurePurchasedStudio(tx, userId, now);
    return subscription;
  });
}

export async function renewPurchasedMembership(userId: string, paymentId: string, renewalType: 'early' | 'standard' | '5year') {
  return db.$transaction(async tx => {
    await lockPurchaser(tx, userId);
    await tx.$queryRaw`SELECT id FROM subscriptions WHERE user_id = ${userId} FOR UPDATE`;
    if (await tx.payment_benefit_grants.findUnique({ where: { source_key: `payment/${paymentId}` } })) return;
    const subscription = await tx.subscriptions.findFirst({ where: { user_id: userId }, orderBy: [{ created_at: 'desc' }, { id: 'asc' }] });
    if (!subscription?.current_period_end && renewalType !== '5year') throw new Error('Membership renewal requires an existing expiry');
    if (subscription) await preserveSubscriptionBaseline(tx, subscription);
    const now = new Date();
    const current = subscription?.current_period_end ?? null;
    const end = renewalType === 'early' ? calculateEarlyRenewalExpiry(current!) : renewalType === 'standard' ? calculateStandardRenewalExpiry(current!) : calculate5YearRenewalExpiry(current);
    const start = renewalType === '5year' && (!current || current < now) ? now : current ?? now;
    const target = subscription
      ? await tx.subscriptions.update({ where: { id: subscription.id }, data: { current_period_end: end, status: 'ACTIVE', updated_at: now } })
      : await tx.subscriptions.create({ data: { id: randomUUID(), user_id: userId, status: 'ACTIVE', payment_method: 'STRIPE', current_period_start: start, current_period_end: end, updated_at: now } });
    await recordBenefitGrant(tx, { sourceKey: `payment/${paymentId}`, paymentId, userId, kind: 'PREMIUM', subscriptionId: target.id, startsAt: start, endsAt: end,
      requiresReview: !!subscription?.current_period_end && !subscription.current_period_start });
    await tx.users.update({ where: { id: userId }, data: { status: 'ACTIVE', membership_tier: 'PREMIUM', updated_at: now } });
    await ensurePurchasedStudio(tx, userId, now);
    // Existing publication/visibility/refund holds are never removed by ledger repair.
  });
}

export async function grantPurchasedFeatured(userId: string, studioId: string, paymentId: string, start: Date, end: Date) {
  await db.$transaction(async tx => {
    await lockPurchaser(tx, userId);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(46198312)`;
    await tx.$queryRaw`SELECT id FROM studio_profiles WHERE id = ${studioId} FOR UPDATE`;
    if (await tx.payment_benefit_grants.findUnique({ where: { source_key: `payment/${paymentId}` } })) return;
    const studio = await tx.studio_profiles.findUnique({ where: { id: studioId } });
    if (!studio || studio.user_id !== userId) throw new Error('Featured purchase target changed');
    const count = await tx.studio_profiles.count({ where: { id: { not: studioId }, is_featured: true, OR: [{ featured_until: null }, { featured_until: { gte: start } }] } });
    if (count >= 6) throw new Error('All featured slots are taken');
    const known = await tx.payment_benefit_grants.findFirst({ where: { studio_id: studioId, kind: 'FEATURED' } });
    if (!known && studio.is_featured && studio.featured_until && studio.featured_until > start) await recordBenefitGrant(tx, {
      sourceKey: `baseline/featured/${studioId}`, paymentId: null, userId, kind: 'FEATURED', studioId, startsAt: start,
      endsAt: studio.featured_until, mappingSource: 'OBSERVED_BASELINE',
    });
    await recordBenefitGrant(tx, { sourceKey: `payment/${paymentId}`, paymentId, userId, kind: 'FEATURED', studioId, startsAt: start, endsAt: end,
      requiresReview: studio.is_featured && !studio.featured_until });
    const retainedEnd = studio.is_featured && !studio.featured_until ? null : studio.featured_until && studio.featured_until > end ? studio.featured_until : end;
    await tx.studio_profiles.update({ where: { id: studioId }, data: { is_featured: true, featured_until: retainedEnd, updated_at: start } });
  });
}

/** The invoice supplies the purchased interval; a newer subscription period is not substituted. */
export async function recordRecurringInvoice(invoiceId: string, subscription: Stripe.Subscription, userId: string, checkout?: Stripe.Checkout.Session) {
  const invoice = await stripe.invoices.retrieve(invoiceId, { expand: ['payments'] });
  const invoiceSubscription = providerId(invoice.parent?.subscription_details?.subscription)
    ?? providerId((invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }).subscription);
  if (invoice.id !== invoiceId || invoiceSubscription !== subscription.id) throw new Error('Invoice subscription identity requires reviewed attribution');
  const intervals = invoice.lines.data.map(line => line.period);
  const interval = intervals[0];
  if (!interval || invoice.lines.has_more || intervals.some(p => p.start !== interval.start || p.end !== interval.end) || invoice.status !== 'paid') throw new Error('Invoice period requires reviewed attribution');
  const paid = invoice.payments?.data.filter(p => p.status === 'paid') ?? [];
  if (invoice.payments?.has_more || paid.length > 1) throw new Error('Multiple invoice payment allocations require reviewed attribution');
  const legacyIntent = (invoice as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent }).payment_intent;
  const intentId = providerId(paid[0]?.payment.payment_intent) ?? providerId(legacyIntent);
  const intent = intentId ? await stripe.paymentIntents.retrieve(intentId) : null;
  if (invoice.amount_paid > 0 && !intent) throw new Error('Invoice payment intent is missing');
  const start = new Date(interval.start * 1000), end = new Date(interval.end * 1000);
  return db.$transaction(async tx => {
    await lockPurchaser(tx, userId);
    await tx.$queryRaw`SELECT id FROM subscriptions WHERE user_id = ${userId} FOR UPDATE`;
    const known = await tx.payment_benefit_grants.findUnique({ where: { source_key: `invoice/${invoice.id}` } });
    if (known) {
      if (known.user_reference !== userId || known.stripe_subscription_id !== subscription.id || known.stripe_invoice_id !== invoice.id) throw new Error('Recorded invoice identity changed');
      return { periodEnd: known.ends_at };
    }
    let target = await tx.subscriptions.findUnique({ where: { stripe_subscription_id: subscription.id } });
    if (target && target.user_id !== userId) throw new Error('Subscription identity changed');
    const priorGrants = target ? await tx.payment_benefit_grants.count({ where: { subscription_id: target.id } }) : 0;
    const needsReview = !!target && !priorGrants && !!target.current_period_end && target.current_period_end > start;
    if (target && target.current_period_end && target.current_period_end <= start) await preserveSubscriptionBaseline(tx, target);
    const now = new Date();
    if (!target) target = await tx.subscriptions.create({ data: { id: randomUUID(), user_id: userId, stripe_subscription_id: subscription.id,
      stripe_customer_id: providerId(subscription.customer), status: 'ACTIVE', payment_method: 'STRIPE', current_period_start: start, current_period_end: end, updated_at: now } });
    else if (!target.current_period_end || end > target.current_period_end) target = await tx.subscriptions.update({ where: { id: target.id },
      data: { current_period_start: start, current_period_end: end, status: 'ACTIVE', updated_at: now } });
    const existingPayment = intentId ? await tx.payments.findUnique({ where: { stripe_payment_intent_id: intentId } }) : null;
    const payment = existingPayment ?? await tx.payments.create({ data: {
      id: `invoice-${invoice.id}`, user_id: userId, stripe_checkout_session_id: checkout?.id ?? null,
      stripe_payment_intent_id: intentId, stripe_charge_id: providerId(intent?.latest_charge), amount: invoice.amount_paid,
      currency: invoice.currency, status: 'SUCCEEDED', metadata: { ...checkout?.metadata, purpose: checkout?.metadata?.purpose ?? 'membership_renewal',
        subscription_id: subscription.id, stripe_invoice_id: invoice.id, grant_model: 'payment_benefit_v1' }, updated_at: now,
    } });
    if (payment.user_id !== userId || payment.amount !== invoice.amount_paid || payment.currency !== invoice.currency) throw new Error('Invoice payment identity needs reconciliation');
    await recordBenefitGrant(tx, { sourceKey: `invoice/${invoice.id}`, paymentId: payment.id, userId, kind: 'PREMIUM', subscriptionId: target.id,
      stripeSubscriptionId: subscription.id, stripeInvoiceId: invoice.id, startsAt: start, endsAt: end, requiresReview: needsReview });
    if (end > now) await tx.users.update({ where: { id: userId }, data: { status: 'ACTIVE', membership_tier: 'PREMIUM', updated_at: now } });
    await ensurePurchasedStudio(tx, userId, now);
    return { periodEnd: end };
  });
}
