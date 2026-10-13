/** @jest-environment node */
/* Database transactions/constraints are real; all Stripe and email effects are mocked.
 * Refuses every database except the explicitly provisioned disposable fixture.
 */
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { getRefundEligibility } from '@/lib/payments/refunds/eligibility';
import { prepareRefund, submitRefundMoney, reconcileProviderRefund, reconcileRefundBilling, ingestRefundEvent } from '@/lib/payments/refunds/service';
import { getMembershipStatus } from '@/lib/membership';
import { performDowngrade } from '@/lib/subscriptions/downgrade';
import { submitFrozenEmail } from '@/lib/email/campaign-provider';
import { dispatchRefundNotification } from '@/lib/payments/refunds/notifications';
import { recordRecurringInvoice } from '@/lib/payments/purchased-benefits';
import type { RefundRequest } from '@/lib/payments/refunds/contracts';

jest.mock('@/lib/db', () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Disposable TEST_DATABASE_URL is required');
  const target = new URL(url);
  if (target.hostname !== '127.0.0.1' || target.port !== '55432' || target.pathname !== '/vsf_admin_fixture_utf8') throw new Error('Refusing a non-fixture database');
  const { PrismaClient } = require('@prisma/client');
  return { db: new PrismaClient({ datasources: { db: { url } } }) };
});
jest.mock('@/lib/stripe', () => ({ stripe: {
  refunds: { retrieve: jest.fn(), list: jest.fn(), create: jest.fn() },
  paymentIntents: { retrieve: jest.fn() }, subscriptions: { retrieve: jest.fn(), update: jest.fn() }, invoices: { retrieve: jest.fn() },
} }));
jest.mock('@/lib/email/campaign-provider', () => ({ ...jest.requireActual('@/lib/email/campaign-provider'), submitFrozenEmail: jest.fn() }));
jest.mock('@/lib/email/send-templated', () => ({ sendTemplatedEmail: jest.fn(() => { throw new Error('No email is allowed in this suite'); }) }));

const provider = stripe as any;
let users: string[] = [];
let payments: Map<string, any>;
let refunds: Map<string, any>;
let subscriptions: Map<string, any>;
let invoices: Map<string, any>;
let eventIds: string[] = [];
let actor: string;
const copy = <T,>(value: T): T => structuredClone(value);
const future = (days: number) => new Date(Date.now() + days * 86_400_000);

async function customer(role: 'USER' | 'ADMIN' = 'USER') {
  const id = `refund-fixture-${randomUUID()}`;
  users.push(id);
  await db.users.create({ data: { id, username: `rf${randomUUID().replaceAll('-', '').slice(0, 15)}`, email: `${id}@example.invalid`,
    display_name: 'Invented refund fixture', role, status: 'ACTIVE', membership_tier: 'PREMIUM', updated_at: new Date() } });
  return id;
}
async function payment(userId: string, metadata: Record<string, string> = { purpose: 'membership' }, amount = 3000) {
  const id = randomUUID(); const pi = `pi_fixture_${randomUUID()}`;
  const record = await db.payments.create({ data: { id, user_id: userId, stripe_payment_intent_id: pi, amount, currency: 'gbp', status: 'SUCCEEDED', metadata, updated_at: new Date() } });
  payments.set(pi, { id: pi, status: 'succeeded', amount_received: amount, amount, currency: 'gbp' });
  return record;
}
async function premium(userId: string, paymentId: string, startsAt: Date, endsAt: Date, providerSubId?: string, createdAt?: Date) {
  const sub = await db.subscriptions.create({ data: { id: randomUUID(), user_id: userId, status: 'ACTIVE', current_period_start: startsAt, current_period_end: endsAt,
    ...(providerSubId ? { stripe_subscription_id: providerSubId } : {}), ...(createdAt ? { created_at: createdAt } : {}), updated_at: new Date() } });
  const grant = await db.payment_benefit_grants.create({ data: { id: randomUUID(), source_key: `payment/${paymentId}`, payment_id: paymentId, user_reference: userId,
    kind: 'PREMIUM', subscription_id: sub.id, stripe_subscription_id: providerSubId ?? null, starts_at: startsAt, ends_at: endsAt, mapping_source: 'PURCHASE' } });
  if (providerSubId) subscriptions.set(providerSubId, { id: providerSubId, status: 'active', cancel_at_period_end: false,
    items: { data: [{ current_period_start: Math.floor(startsAt.getTime() / 1000), current_period_end: Math.floor(endsAt.getTime() / 1000), price: { currency: 'gbp' } }] } });
  return { sub, grant };
}
async function input(paymentId: string, amount: number, extra: Partial<RefundRequest> = {}): Promise<RefundRequest> {
  const preview = await getRefundEligibility(paymentId);
  expect(preview.enabled).toBe(true);
  return { requestKey: randomUUID(), amount, reason: 'requested_by_customer', comment: '', previewToken: preview.previewToken, ...extra };
}

beforeEach(async () => {
  jest.clearAllMocks(); users = []; eventIds = []; payments = new Map(); refunds = new Map(); subscriptions = new Map(); invoices = new Map();
  process.env.ADMIN_REFUNDS_ENABLED = 'true'; process.env.REFUND_LIFECYCLE_ENABLED = 'true'; process.env.REFUND_NOTIFICATIONS_ENABLED = 'false';
  provider.paymentIntents.retrieve.mockImplementation(async (id: string) => { if (!payments.has(id)) throw new Error('No fixture payment'); return copy(payments.get(id)); });
  provider.refunds.retrieve.mockImplementation(async (id: string) => { if (!refunds.has(id)) throw new Error('No fixture refund'); return copy(refunds.get(id)); });
  provider.refunds.list.mockImplementation((query: any) => ({ async *[Symbol.asyncIterator]() {
    for (const value of refunds.values()) if (!query.payment_intent || value.payment_intent === query.payment_intent) yield copy(value);
  } }));
  provider.refunds.create.mockImplementation(async (params: any) => {
    const id = `re_fixture_${params.metadata.refund_operation_id}`;
    const value = refunds.get(id) ?? { id, payment_intent: params.payment_intent, amount: params.amount, currency: 'gbp', status: 'succeeded', reason: params.reason, metadata: params.metadata };
    refunds.set(id, value); return copy(value);
  });
  provider.subscriptions.retrieve.mockImplementation(async (id: string) => copy(subscriptions.get(id)));
  provider.subscriptions.update.mockImplementation(async (id: string, data: any) => { subscriptions.set(id, { ...subscriptions.get(id), ...data }); return copy(subscriptions.get(id)); });
  provider.invoices.retrieve.mockImplementation(async (id: string) => copy(invoices.get(id)));
  (submitFrozenEmail as jest.Mock).mockResolvedValue({ status: 'accepted', id: 'email_fixture_same_id' });
  actor = await customer('ADMIN');
});
afterEach(async () => {
  jest.restoreAllMocks();
  await db.$transaction(async tx => {
    await tx.stripe_webhook_events.deleteMany({ where: { stripe_event_id: { in: eventIds } } });
    // Existing settlement/subscription relations are RESTRICT. Delete only this
    // test's owned dependent records, before their payment/account parents.
    await tx.refunds.deleteMany({ where: { OR: [{ user_id: { in: users } }, { payments: { user_id: { in: users } } }] } });
    await tx.refund_operations.deleteMany({ where: { user_reference: { in: users } } });
    await tx.payment_benefit_grants.deleteMany({ where: { user_reference: { in: users } } });
    await tx.subscriptions.deleteMany({ where: { user_id: { in: users } } });
    await tx.payments.deleteMany({ where: { user_id: { in: users } } });
    await tx.users.deleteMany({ where: { id: { in: users } } });
  });
});
afterAll(async () => { delete process.env.ADMIN_REFUNDS_ENABLED; delete process.env.REFUND_LIFECYCLE_ENABLED; delete process.env.REFUND_NOTIFICATIONS_ENABLED; await db.$disconnect(); });

it('concurrent distinct requests reserve at most one balance, and identical keys create one operation', async () => {
  const user = await customer(); const paid = await payment(user);
  const first = await input(paid.id, 2000); const second = { ...first, requestKey: randomUUID() };
  const attempted = await Promise.allSettled([prepareRefund(paid.id, actor, first), prepareRefund(paid.id, actor, second)]);
  expect(attempted.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(await db.refund_operations.count({ where: { payment_id: paid.id } })).toBe(1);
  expect(provider.refunds.create).not.toHaveBeenCalled();
  const secondPayment = await payment(user);
  const same = await input(secondPayment.id, 1000);
  const [a, b] = await Promise.all([prepareRefund(secondPayment.id, actor, same), prepareRefund(secondPayment.id, actor, same)]);
  expect(a.id).toBe(b.id);
  expect(await db.refund_operations.count({ where: { payment_id: secondPayment.id } })).toBe(1);
});
it('a Featured refund touches only its exact placement and preserves independent membership and overlapping placement', async () => {
  const user = await customer(); const paid = await payment(user, { purpose: 'featured_upgrade' });
  const membership = await payment(user); const active = await premium(user, membership.id, future(-20), future(300));
  const studio = await db.studio_profiles.create({ data: { id: randomUUID(), user_id: user, name: 'Invented studio', status: 'ACTIVE', is_profile_visible: false, is_featured: true, featured_until: future(200), updated_at: new Date() } });
  const independentEnd = studio.featured_until!;
  const endedGrant = await db.payment_benefit_grants.create({ data: { id: randomUUID(), source_key: `payment/${paid.id}`, payment_id: paid.id, user_reference: user, kind: 'FEATURED', studio_id: studio.id, starts_at: future(-20), ends_at: future(100), mapping_source: 'PURCHASE' } });
  await db.payment_benefit_grants.create({ data: { id: randomUUID(), source_key: `observed/${studio.id}`, user_reference: user, kind: 'FEATURED', studio_id: studio.id, starts_at: future(-10), ends_at: independentEnd, mapping_source: 'OBSERVED_BASELINE' } });
  const operation = await prepareRefund(paid.id, actor, await input(paid.id, paid.amount, { benefitAction: 'END', benefitGrantId: endedGrant.id }));
  expect((await submitRefundMoney(operation.id)).benefit_status).toBe('APPLIED');
  expect(await db.studio_profiles.findUnique({ where: { id: studio.id } })).toMatchObject({ is_featured: true, featured_until: independentEnd, is_profile_visible: false });
  expect(await db.subscriptions.findUnique({ where: { id: active.sub.id } })).toMatchObject({ status: 'ACTIVE', current_period_end: active.sub.current_period_end });
  expect(await db.users.findUnique({ where: { id: user } })).toMatchObject({ membership_tier: 'PREMIUM' });
});
it('ending the latest purchase retains older overlapping access through actual membership and downgrade gates', async () => {
  const user = await customer(); const olderPayment = await payment(user); const latestPayment = await payment(user);
  const older = await premium(user, olderPayment.id, future(-30), future(180), undefined, future(-10));
  const latest = await premium(user, latestPayment.id, future(-1), future(365), undefined, new Date());
  const studio = await db.studio_profiles.create({ data: { id: randomUUID(), user_id: user, name: 'Hidden fixture', status: 'INACTIVE', is_profile_visible: false, updated_at: new Date() } });
  const operation = await prepareRefund(latestPayment.id, actor, await input(latestPayment.id, latestPayment.amount, { benefitAction: 'END', benefitGrantId: latest.grant.id }));
  await submitRefundMoney(operation.id);
  expect(await getMembershipStatus(user)).toMatchObject({ isActive: true, tier: 'PREMIUM', expiresAt: older.sub.current_period_end });
  expect(await performDowngrade(user, { sendEmail: false })).toEqual({ downgraded: false });
  expect(await db.studio_profiles.findUnique({ where: { id: studio.id } })).toMatchObject({ status: 'INACTIVE', is_profile_visible: false });
  expect(await db.payment_benefit_grants.findUnique({ where: { id: latest.grant.id } })).toMatchObject({ status: 'REVOKED' });
});
it('pending/action-needed partial refunds hold funds, ignore stale event payloads, and reconcile a genuine later failure', async () => {
  const user = await customer(); const paid = await payment(user); const benefit = await premium(user, paid.id, future(-10), future(100));
  const create = provider.refunds.create.getMockImplementation();
  provider.refunds.create.mockImplementation(async (params: any) => { const result = await create(params); result.status = 'pending'; refunds.set(result.id, result); return copy(result); });
  const operation = await prepareRefund(paid.id, actor, await input(paid.id, 1000));
  const pending = await submitRefundMoney(operation.id); expect(pending.money_status).toBe('PENDING');
  expect((await getRefundEligibility(paid.id)).availableAmount).toBe(2000);
  expect((await getRefundEligibility(paid.id)).enabled).toBe(false);
  const providerRecord = refunds.get(pending.stripe_refund_id!)!;
  const eventId = `evt_fixture_${randomUUID()}`; eventIds.push(eventId);
  await ingestRefundEvent({ id: eventId, type: 'refund.updated', data: { object: { ...providerRecord, status: 'succeeded' } } } as any);
  expect((await db.payments.findUniqueOrThrow({ where: { id: paid.id } })).refunded_amount).toBe(0);
  providerRecord.status = 'requires_action'; await reconcileProviderRefund(providerRecord.id);
  expect((await db.refund_operations.findUniqueOrThrow({ where: { id: operation.id } })).money_status).toBe('ACTION_REQUIRED');
  providerRecord.status = 'succeeded'; await reconcileProviderRefund(providerRecord.id);
  expect((await db.payments.findUniqueOrThrow({ where: { id: paid.id } })).refunded_amount).toBe(1000);
  providerRecord.status = 'failed'; await reconcileProviderRefund(providerRecord.id);
  expect(await db.payments.findUnique({ where: { id: paid.id } })).toMatchObject({ refunded_amount: 0, status: 'SUCCEEDED' });
  expect(await db.refund_operations.findUnique({ where: { id: operation.id } })).toMatchObject({ money_status: 'FAILED', provider_status: 'failed', access_review_required: true });
  expect(await db.payment_benefit_grants.findUnique({ where: { id: benefit.grant.id } })).toMatchObject({ status: 'ACTIVE' });
  expect((await getRefundEligibility(paid.id)).enabled).toBe(false);
});
it('recovers provider success after a lost response using the same operation without sending money twice', async () => {
  const user = await customer(); const paid = await payment(user);
  const create = provider.refunds.create.getMockImplementation();
  provider.refunds.create.mockImplementationOnce(async (params: any) => { await create(params); throw new Error('Lost provider response'); });
  const operation = await prepareRefund(paid.id, actor, await input(paid.id, 1000));
  expect((await submitRefundMoney(operation.id)).money_status).toBe('UNKNOWN');
  expect((await submitRefundMoney(operation.id)).money_status).toBe('SUCCEEDED');
  expect(provider.refunds.create).toHaveBeenCalledTimes(1);
  expect(await db.refunds.count({ where: { payment_id: paid.id } })).toBe(1);
  expect((await db.payments.findUniqueOrThrow({ where: { id: paid.id } })).refunded_amount).toBe(1000);
});
it('a database failure after provider success retains durable recovery and the original key', async () => {
  const user = await customer(); const paid = await payment(user);
  const operation = await prepareRefund(paid.id, actor, await input(paid.id, 1000));
  const realUpdate = db.refund_operations.updateMany.bind(db.refund_operations);
  const spy = jest.spyOn(db.refund_operations, 'updateMany').mockImplementation(async (args: any) => {
    if (args.data.stripe_refund_id) { spy.mockRestore(); throw new Error('Invented persistence outage'); }
    return realUpdate(args);
  });
  await expect(submitRefundMoney(operation.id)).rejects.toThrow('persistence outage');
  spy.mockRestore();
  expect((await submitRefundMoney(operation.id)).money_status).toBe('SUCCEEDED');
  expect(provider.refunds.create).toHaveBeenCalledTimes(1);
});
it('expired uncertain requests retain their reservation and require review without a new provider key', async () => {
  const user = await customer(); const paid = await payment(user);
  const operation = await prepareRefund(paid.id, actor, await input(paid.id, 1000));
  await db.refund_operations.update({ where: { id: operation.id }, data: { money_status: 'UNKNOWN', submitted_at: future(-2) } });
  expect((await submitRefundMoney(operation.id)).money_status).toBe('REVIEW');
  expect(provider.refunds.create).not.toHaveBeenCalled();
  expect((await getRefundEligibility(paid.id)).heldAmount).toBe(1000);
});
it('successful money and failed renewal have independent recovery and never refund again', async () => {
  const user = await customer(); const subId = `sub_fixture_${randomUUID()}`; const paid = await payment(user, { purpose: 'membership', subscription_id: subId });
  await premium(user, paid.id, future(-10), future(200), subId);
  const update = provider.subscriptions.update.getMockImplementation();
  provider.subscriptions.update.mockImplementationOnce(async (id: string, data: any) => { await update(id, data); throw new Error('Lost cancellation response'); });
  const operation = await prepareRefund(paid.id, actor, await input(paid.id, paid.amount, { benefitAction: 'KEEP', billingAction: 'CANCEL_AT_PERIOD_END' }));
  expect(await submitRefundMoney(operation.id)).toMatchObject({ money_status: 'SUCCEEDED', benefit_status: 'APPLIED', billing_status: 'UNKNOWN' });
  expect((await reconcileRefundBilling(operation.id)).billing_status).toBe('APPLIED');
  expect(provider.refunds.create).toHaveBeenCalledTimes(1); expect(provider.subscriptions.update).toHaveBeenCalledTimes(1);
});
it('out-of-band full refunds have no invented actor, no access choice, and survive duplicate delivery', async () => {
  const user = await customer(); const paid = await payment(user); const benefit = await premium(user, paid.id, future(-1), future(300));
  const id = `re_fixture_external_${randomUUID()}`;
  const record = { id, payment_intent: paid.stripe_payment_intent_id, amount: paid.amount, currency: 'gbp', status: 'succeeded', metadata: {}, reason: null }; refunds.set(id, record);
  const eventId = `evt_fixture_${randomUUID()}`; eventIds.push(eventId); const event = { id: eventId, type: 'refund.updated', data: { object: record } } as any;
  await ingestRefundEvent(event); await ingestRefundEvent(event);
  expect(await db.refunds.count({ where: { payment_id: paid.id } })).toBe(1);
  expect(await db.refunds.findUnique({ where: { stripe_refund_id: id } })).toMatchObject({ processed_by: null, source: 'PROVIDER' });
  expect(await db.refund_operations.findUnique({ where: { stripe_refund_id: id } })).toMatchObject({ benefit_action: null, benefit_status: 'REVIEW', access_review_required: true });
  expect(await db.payment_benefit_grants.findUnique({ where: { id: benefit.grant.id } })).toMatchObject({ status: 'ACTIVE' });
  expect(provider.subscriptions.update).not.toHaveBeenCalled(); expect(provider.refunds.create).not.toHaveBeenCalled();
});
it('paid invoices map to their own period/payment and older or duplicate events do not shorten current coverage', async () => {
  const user = await customer(); const subId = `sub_fixture_${randomUUID()}`;
  const providerSub = { id: subId, customer: 'cus_fixture', status: 'active', cancel_at_period_end: false, items: { data: [] } } as any;
  const dates = [future(-30), future(100), future(-365), future(-30)];
  const ids: string[] = [];
  for (const [index, [start, end]] of [[dates[0], dates[1]], [dates[2], dates[3]]].entries()) {
    const id = `in_fixture_${randomUUID()}`; const pi = `pi_fixture_${randomUUID()}`; ids.push(id);
    payments.set(pi, { id: pi, status: 'succeeded', amount_received: 3000, amount: 3000, currency: 'gbp' });
    invoices.set(id, { id, status: 'paid', amount_paid: 3000, currency: 'gbp', created: Math.floor(start!.getTime() / 1000),
      parent: { subscription_details: { subscription: subId } },
      lines: { has_more: false, data: [{ period: { start: Math.floor(start!.getTime() / 1000), end: Math.floor(end!.getTime() / 1000) } }] },
      payments: { has_more: false, data: [{ status: 'paid', payment: { payment_intent: pi } }] }, metadata: { fixture: String(index) } });
  }
  await recordRecurringInvoice(ids[0]!, providerSub, user); await recordRecurringInvoice(ids[1]!, providerSub, user); await recordRecurringInvoice(ids[0]!, providerSub, user);
  const target = await db.subscriptions.findUniqueOrThrow({ where: { stripe_subscription_id: subId } });
  expect(target.current_period_end!.getTime()).toBe(Math.floor(dates[1]!.getTime() / 1000) * 1000);
  const grants = await db.payment_benefit_grants.findMany({ where: { subscription_id: target.id }, include: { payment: true } });
  expect(grants).toHaveLength(2);
  expect(grants.every(grant => grant.payment?.stripe_payment_intent_id && grant.stripe_invoice_id)).toBe(true);
});


it('notification recovery freezes recipient/copy/key and never resubmits money', async () => {
  process.env.REFUND_NOTIFICATIONS_ENABLED = 'true';
  const user = await customer(); const paid = await payment(user);
  const operation = await prepareRefund(paid.id, actor, await input(paid.id, 500));
  await submitRefundMoney(operation.id);
  const sender = submitFrozenEmail as jest.Mock;
  sender.mockResolvedValueOnce({ status: 'uncertain', code: 'timeout', canReplay: true });
  expect((await dispatchRefundNotification(operation.id)).notification_status).toBe('UNKNOWN');
  await db.users.update({ where: { id: user }, data: { display_name: 'Later edited display name' } });
  expect((await dispatchRefundNotification(operation.id)).notification_status).toBe('ACCEPTED');
  expect(sender.mock.calls[0]).toEqual(sender.mock.calls[1]);
  expect(sender.mock.calls[0][1]).toBe(`refund-notification/${operation.id}`);
  expect(sender.mock.calls[0][0].text).toContain('does not change your purchased benefits');
  expect(provider.refunds.create).toHaveBeenCalledTimes(1);
  await db.refund_operations.update({ where: { id: operation.id }, data: { notification_status: 'UNKNOWN', notification_submitted_at: future(-2) } });
  expect((await dispatchRefundNotification(operation.id)).notification_status).toBe('REVIEW');
  expect(sender).toHaveBeenCalledTimes(2);
});
it('notification cannot be newly accepted for a deleted or changed recipient during uncertain recovery', async () => {
  process.env.REFUND_NOTIFICATIONS_ENABLED = 'true';
  const user = await customer(); const paid = await payment(user);
  const operation = await prepareRefund(paid.id, actor, await input(paid.id, 500));
  await submitRefundMoney(operation.id);
  const sender = submitFrozenEmail as jest.Mock;
  sender.mockResolvedValueOnce({ status: 'uncertain', code: 'timeout', canReplay: true });
  await dispatchRefundNotification(operation.id);
  await db.users.update({ where: { id: user }, data: { email: `changed-${randomUUID()}@example.invalid` } });
  expect((await dispatchRefundNotification(operation.id)).notification_status).toBe('REVIEW');
  expect(sender).toHaveBeenCalledTimes(1); expect(provider.refunds.create).toHaveBeenCalledTimes(1);
});
