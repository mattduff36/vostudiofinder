/** @jest-environment node */
// Real disposable PostgreSQL; Stripe reads are synthetic and no sends occur.
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { grantPurchasedMembership, renewPurchasedMembership, recordRecurringInvoice } from '@/lib/payments/purchased-benefits';
import { publicMembershipSelect, resolvePublicTiers } from '@/lib/subscriptions/public-entitlements';

jest.mock('@/lib/db', () => {
  const value = process.env.TEST_DATABASE_URL;
  const target = value ? new URL(value) : null;
  if (!target || target.hostname !== '127.0.0.1' || target.port !== '55432' || target.pathname !== '/vsf_admin_fixture_utf8') {
    throw new Error('Purchased benefit fixtures require 127.0.0.1:55432/vsf_admin_fixture_utf8. No DATABASE_URL fallback is allowed.');
  }
  const { PrismaClient } = require('@prisma/client');
  return { db: new PrismaClient({ datasourceUrl: value, log: [] }) };
});
jest.mock('@/lib/stripe', () => ({ stripe: {
  invoices: { retrieve: jest.fn() }, paymentIntents: { retrieve: jest.fn() },
  refunds: { create: jest.fn() }, subscriptions: { update: jest.fn() },
} }));

const provider = stripe as any;
const DAY = 86_400_000;
let users: string[] = [];
const originalFlag = process.env.REFUND_LIFECYCLE_ENABLED;

async function fixture() {
  const userId = `purchased-hold-${randomUUID()}`;
  users.push(userId);
  await db.users.create({ data: { id: userId, username: `ph${randomUUID().replaceAll('-', '').slice(0, 15)}`,
    email: `${userId}@example.invalid`, display_name: 'Invented held studio', role: 'USER', status: 'ACTIVE',
    membership_tier: 'PREMIUM', updated_at: new Date() } });
  const studio = await db.studio_profiles.create({ data: { id: randomUUID(), user_id: userId, name: 'Invented private fixture',
    status: 'INACTIVE', is_profile_visible: false, is_featured: false, is_verified: false,
    show_phone: false, show_directions: false, updated_at: new Date() } });
  const payment = await db.payments.create({ data: { id: randomUUID(), user_id: userId, stripe_payment_intent_id: `pi_fixture_${randomUUID()}`,
    status: 'SUCCEEDED', amount: 3000, currency: 'gbp', metadata: { purpose: 'membership', grant_model: 'payment_benefit_v1' }, updated_at: new Date() } });
  return { userId, studio, payment };
}

async function expectPreserved(studioId: string) {
  expect(await db.studio_profiles.findUnique({ where: { id: studioId } })).toMatchObject({
    status: 'INACTIVE', is_profile_visible: false, is_featured: false, is_verified: false,
    show_phone: false, show_directions: false,
  });
  expect(provider.refunds.create).not.toHaveBeenCalled();
  expect(provider.subscriptions.update).not.toHaveBeenCalled();
}

beforeEach(() => { users = []; jest.resetAllMocks(); process.env.REFUND_LIFECYCLE_ENABLED = 'true'; });
afterEach(async () => {
  await db.$transaction(async tx => {
    await tx.refunds.deleteMany({ where: { OR: [{ user_id: { in: users } }, { payments: { user_id: { in: users } } }] } });
    await tx.refund_operations.deleteMany({ where: { user_reference: { in: users } } });
    await tx.payment_benefit_grants.deleteMany({ where: { user_reference: { in: users } } });
    await tx.subscriptions.deleteMany({ where: { user_id: { in: users } } });
    await tx.payments.deleteMany({ where: { user_id: { in: users } } });
    await tx.users.deleteMany({ where: { id: { in: users } } });
  });
  if (originalFlag === undefined) delete process.env.REFUND_LIFECYCLE_ENABLED;
  else process.env.REFUND_LIFECYCLE_ENABLED = originalFlag;
});
afterAll(async () => db.$disconnect());

it('annual purchase and its replay retain a held studio without granting two subscriptions', async () => {
  const { userId, studio, payment } = await fixture();
  const first = await grantPurchasedMembership(userId, payment.id, 12, 'cus_fixture');
  const replay = await grantPurchasedMembership(userId, payment.id, 12, 'cus_fixture');
  expect(replay.id).toBe(first.id);
  expect(await db.subscriptions.count({ where: { user_id: userId } })).toBe(1);
  expect(await db.payment_benefit_grants.count({ where: { payment_id: payment.id } })).toBe(1);
  await expectPreserved(studio.id);
});

it('renewal records only its awarded increment and retains the prior interval and publication hold', async () => {
  const { userId, studio, payment } = await fixture();
  const now = new Date();
  const originalEnd = new Date(now.getTime() + 90 * DAY);
  const subscription = await db.subscriptions.create({ data: { id: randomUUID(), user_id: userId, status: 'ACTIVE',
    current_period_start: new Date(now.getTime() - 275 * DAY), current_period_end: originalEnd, updated_at: now } });
  await renewPurchasedMembership(userId, payment.id, 'standard');
  await renewPurchasedMembership(userId, payment.id, 'standard');
  const current = await db.subscriptions.findUniqueOrThrow({ where: { id: subscription.id } });
  expect(current.current_period_end!.getTime()).toBe(originalEnd.getTime() + 365 * DAY);
  const grant = await db.payment_benefit_grants.findUniqueOrThrow({ where: { source_key: `payment/${payment.id}` } });
  expect(grant.starts_at).toEqual(originalEnd);
  expect(grant.ends_at).toEqual(current.current_period_end);
  const baseline = await db.payment_benefit_grants.findUniqueOrThrow({ where: { source_key: `baseline/${subscription.id}` } });
  expect(baseline.payment_id).toBeNull();
  expect(baseline.ends_at).toEqual(originalEnd);
  expect(baseline.mapping_source).toBe('OBSERVED_BASELINE');
  await expectPreserved(studio.id);
});

it('recurring invoice grants its exact interval without reactivating an existing hidden studio', async () => {
  const { userId, studio, payment } = await fixture();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const invoiceId = `in_fixture_${randomUUID()}`;
  const subscriptionId = `sub_fixture_${randomUUID()}`;
  const invoice = { id: invoiceId, status: 'paid', amount_paid: payment.amount, currency: payment.currency,
    parent: { subscription_details: { subscription: subscriptionId } },
    lines: { has_more: false, data: [{ period: { start: nowSeconds, end: nowSeconds + 365 * 86_400 } }] },
    payments: { has_more: false, data: [{ status: 'paid', payment: { payment_intent: payment.stripe_payment_intent_id } }] } };
  provider.invoices.retrieve.mockResolvedValue(invoice);
  provider.paymentIntents.retrieve.mockResolvedValue({ id: payment.stripe_payment_intent_id, status: 'succeeded', amount_received: payment.amount,
    amount: payment.amount, currency: payment.currency, latest_charge: 'ch_fixture' });
  const subscription = { id: subscriptionId, customer: 'cus_fixture', status: 'active', cancel_at_period_end: false, items: { data: [] } } as any;
  await recordRecurringInvoice(invoiceId, subscription, userId);
  await recordRecurringInvoice(invoiceId, subscription, userId);
  const grant = await db.payment_benefit_grants.findUniqueOrThrow({ where: { source_key: `invoice/${invoiceId}` } });
  expect(grant.payment_id).toBe(payment.id);
  expect(grant.starts_at.getTime()).toBe(nowSeconds * 1000);
  expect(grant.ends_at.getTime()).toBe((nowSeconds + 365 * 86_400) * 1000);
  expect(await db.subscriptions.count({ where: { user_id: userId } })).toBe(1);
  await expectPreserved(studio.id);
});

it.each(['APPLIED', 'REVIEW'])('public projection honors surviving paid overlap after a %s refund effect without restoring the revoked period', async benefitStatus => {
  const { userId, studio, payment } = await fixture();
  const now = new Date();
  const older = await db.subscriptions.create({ data: { id: randomUUID(), user_id: userId, status: 'ACTIVE',
    current_period_start: new Date(now.getTime() - 100 * DAY), current_period_end: new Date(now.getTime() + 100 * DAY),
    created_at: new Date(now.getTime() - DAY), updated_at: now } });
  const latest = await db.subscriptions.create({ data: { id: randomUUID(), user_id: userId, status: 'SUSPENDED',
    current_period_start: new Date(now.getTime() - DAY), current_period_end: now, created_at: now, updated_at: now } });
  const grant = await db.payment_benefit_grants.create({ data: { id: randomUUID(), source_key: `payment/${payment.id}`,
    payment_id: payment.id, user_reference: userId, kind: 'PREMIUM', subscription_id: latest.id,
    starts_at: new Date(now.getTime() - DAY), ends_at: new Date(now.getTime() + 365 * DAY),
    status: 'REVOKED', revoked_at: now, mapping_source: 'PURCHASE' } });
  const operationId = randomUUID();
  await db.refund_operations.create({ data: { id: operationId, payload_hash: 'synthetic-fixture', user_reference: userId,
    payment_id: payment.id, stripe_payment_intent_id: payment.stripe_payment_intent_id!,
    amount: payment.amount, currency: payment.currency, money_status: benefitStatus === 'APPLIED' ? 'SUCCEEDED' : 'FAILED',
    benefit_action: 'END', benefit_status: benefitStatus, benefit_grant_id: grant.id,
    access_review_required: benefitStatus === 'REVIEW', idempotency_key: `fixture/${operationId}`, billing_idempotency_key: `fixture-billing/${operationId}` } });
  const owner = await db.users.findUniqueOrThrow({ where: { id: userId }, select: publicMembershipSelect });
  expect(owner.subscriptions[0]?.status).toBe('SUSPENDED');
  expect((await resolvePublicTiers([owner], now)).get(userId)).toBe('PREMIUM');
  await expectPreserved(studio.id);
  // A later provider return is review only: once the independent period expires,
  // the already revoked purchase is not automatically restored as current access.
  await db.subscriptions.update({ where: { id: older.id }, data: { current_period_end: now } });
  expect((await resolvePublicTiers([owner], now)).get(userId)).toBe('BASIC');
  expect((await db.payment_benefit_grants.findUniqueOrThrow({ where: { id: grant.id } })).status).toBe('REVOKED');
  await expectPreserved(studio.id);
});
