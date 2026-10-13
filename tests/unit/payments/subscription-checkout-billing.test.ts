/** @jest-environment node */
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { initializeCheckoutBilling } from '@/lib/payments/subscription-checkout-billing';

jest.mock('@/lib/db', () => ({ db: {
  $transaction: jest.fn(), $queryRaw: jest.fn(), users: { findUnique: jest.fn(), update: jest.fn() },
  subscriptions: { findUnique: jest.fn() }, payment_benefit_grants: { findUnique: jest.fn() },
  refund_operations: { findFirst: jest.fn() }, user_metadata: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
} }));
jest.mock('@/lib/stripe', () => ({ stripe: { subscriptions: { retrieve: jest.fn(), update: jest.fn() }, refunds: { create: jest.fn() } } }));
const database = db as any; const provider = stripe as any;
const now = new Date('2026-10-12T12:00:00Z'); const end = new Date('2027-10-12T12:00:00Z');
const input = { userId: 'owner', checkoutId: 'cs_fixture', checkoutCreatedAt: now, invoiceId: 'in_fixture', subscriptionId: 'sub_fixture', wantsRenewal: false, periodEnd: end };
let metadata: { id: string; value: string } | null;
let current: any; let user: any; let refund: boolean;
const state = () => JSON.parse(metadata!.value);

beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(now); jest.resetAllMocks();
  metadata = null; refund = false;
  user = { id: input.userId, auto_renew: true, updated_at: now, deletion_status: 'ACTIVE', deletion_requested_at: null, deletion_scheduled_for: null };
  current = { id: input.subscriptionId, status: 'active', cancel_at_period_end: false,
    items: { data: [{ current_period_start: now.getTime() / 1000, current_period_end: end.getTime() / 1000 }] } };
  database.$transaction.mockImplementation(async (work: any) => work(database));
  database.$queryRaw.mockResolvedValue([]);
  database.users.findUnique.mockImplementation(async () => structuredClone(user));
  database.users.update.mockImplementation(async ({ data }: any) => { Object.assign(user, data); return structuredClone(user); });
  database.subscriptions.findUnique.mockResolvedValue({ id: 'local_subscription', user_id: input.userId });
  database.payment_benefit_grants.findUnique.mockResolvedValue({ user_reference: input.userId, subscription_id: 'local_subscription', ends_at: end, status: 'ACTIVE', payment: { refunded_amount: 0 } });
  database.refund_operations.findFirst.mockImplementation(async () => refund ? { id: 'later_refund_choice' } : null);
  database.user_metadata.findUnique.mockImplementation(async () => metadata && { ...metadata });
  database.user_metadata.upsert.mockImplementation(async ({ create, update }: any) => { metadata = metadata ? { ...metadata, ...update } : { ...create }; return { ...metadata }; });
  database.user_metadata.update.mockImplementation(async ({ data }: any) => { metadata = { ...metadata!, ...data }; return { ...metadata }; });
  provider.subscriptions.retrieve.mockImplementation(async () => structuredClone(current));
  provider.subscriptions.update.mockImplementation(async () => { current.cancel_at_period_end = true; return structuredClone(current); });
});
afterEach(() => jest.useRealTimers());

it('configures a one-time checkout once and never restores the original choice on a later replay', async () => {
  await initializeCheckoutBilling(input);
  expect(state()).toMatchObject({ status: 'APPLIED', leaseToken: null, cancelAtPeriodEnd: true });
  expect(provider.subscriptions.update).toHaveBeenCalledWith('sub_fixture', { cancel_at_period_end: true }, { idempotencyKey: 'checkout-renewal/cs_fixture' });
  expect(user.auto_renew).toBe(false);
  // A later customer decision has its own authority; checkout retry is a no-op.
  current.cancel_at_period_end = false; user.auto_renew = true; refund = true;
  await initializeCheckoutBilling(input);
  expect(user.auto_renew).toBe(true);
  expect(provider.subscriptions.update).toHaveBeenCalledTimes(1);
  expect(provider.refunds.create).not.toHaveBeenCalled();
});
it('accepts initial automatic renewal without issuing a redundant enabling update', async () => {
  await initializeCheckoutBilling({ ...input, wantsRenewal: true });
  expect(state().status).toBe('APPLIED'); expect(provider.subscriptions.update).not.toHaveBeenCalled();
  current.cancel_at_period_end = true; user.auto_renew = false;
  await initializeCheckoutBilling({ ...input, wantsRenewal: true });
  expect(current.cancel_at_period_end).toBe(true); expect(user.auto_renew).toBe(false);
});
it('recovers lost cancellation acceptance by reading current state without another update', async () => {
  provider.subscriptions.update.mockImplementationOnce(async () => { current.cancel_at_period_end = true; throw new Error('accepted response lost'); });
  await expect(initializeCheckoutBilling(input)).rejects.toThrow('outcome unknown');
  expect(state()).toMatchObject({ status: 'UNKNOWN', submittedAt: now.toISOString(), leaseToken: null });
  await initializeCheckoutBilling(input);
  expect(state().status).toBe('APPLIED'); expect(provider.subscriptions.update).toHaveBeenCalledTimes(1);
});
it('does not trust cached cancellation evidence after renewal was re-enabled', async () => {
  provider.subscriptions.update.mockImplementationOnce(async () => { current.cancel_at_period_end = true; throw new Error('accepted response lost'); });
  await expect(initializeCheckoutBilling(input)).rejects.toThrow();
  current.cancel_at_period_end = false;
  provider.subscriptions.update.mockResolvedValueOnce({ ...current, cancel_at_period_end: true });
  await expect(initializeCheckoutBilling(input)).rejects.toThrow('current state changed');
  expect(state()).toMatchObject({ status: 'REVIEW', error: 'CHECKOUT_BILLING_CURRENT_STATE_CHANGED' });
  expect(current.cancel_at_period_end).toBe(false);
  expect(provider.subscriptions.update.mock.calls[0][2]).toEqual(provider.subscriptions.update.mock.calls[1][2]);
});
it('leaves a later refund billing choice alone when an unfinished checkout is replayed', async () => {
  provider.subscriptions.retrieve.mockRejectedValueOnce(new Error('provider unavailable before any write'));
  await expect(initializeCheckoutBilling(input)).rejects.toThrow();
  refund = true;
  await expect(initializeCheckoutBilling(input)).rejects.toThrow('requires review');
  expect(state().status).toBe('REVIEW'); expect(provider.subscriptions.update).not.toHaveBeenCalled();
});
it('does not enable renewal over an existing customer cancellation', async () => {
  current.cancel_at_period_end = true;
  await expect(initializeCheckoutBilling({ ...input, wantsRenewal: true })).rejects.toThrow('choice changed');
  expect(state().status).toBe('REVIEW'); expect(provider.subscriptions.update).not.toHaveBeenCalled();
});
it('requires review for an old first delivery or a changed purchased period', async () => {
  await expect(initializeCheckoutBilling({ ...input, checkoutCreatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000) })).rejects.toThrow('requires review');
  expect(provider.subscriptions.retrieve).not.toHaveBeenCalled();
  metadata = null; current.items.data[0].current_period_end += 365 * 24 * 60 * 60;
  await expect(initializeCheckoutBilling(input)).rejects.toThrow('period changed');
  expect(provider.subscriptions.update).not.toHaveBeenCalled();
});
it.each(['refund', 'owner'] as const)('preserves a later %s billing decision that arrives before the local evidence commit', async actor => {
  provider.subscriptions.update.mockImplementation(async () => {
    current.cancel_at_period_end = true;
    if (actor === 'refund') refund = true;
    else user.updated_at = new Date(now.getTime() + 1000);
    return structuredClone(current);
  });
  await expect(initializeCheckoutBilling(input)).rejects.toThrow('context changed');
  expect(state()).toMatchObject({ status: 'REVIEW', error: 'CHECKOUT_BILLING_CONTEXT_CHANGED' });
  expect(user.auto_renew).toBe(true); expect(database.users.update).not.toHaveBeenCalled();
});
