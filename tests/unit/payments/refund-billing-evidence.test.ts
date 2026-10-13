/** @jest-environment node */
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { reconcileRefundBilling } from '@/lib/payments/refunds/service';

jest.mock('@/lib/db', () => ({ db: {
  refund_operations: { findUnique: jest.fn(), updateMany: jest.fn() },
  subscriptions: { findUnique: jest.fn() },
} }));
jest.mock('@/lib/stripe', () => ({ stripe: {
  subscriptions: { retrieve: jest.fn(), update: jest.fn() },
  refunds: { create: jest.fn() },
} }));

const database = db as any;
const provider = stripe as any;
const now = new Date('2026-10-12T12:00:00Z');
const end = new Date('2027-01-01T00:00:00Z');
let operation: Record<string, any>;
let currentSubscription: Record<string, any>;

beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(now); jest.resetAllMocks();
  operation = {
    id: 'refund-fixture', user_reference: 'user-fixture', money_status: 'SUCCEEDED',
    billing_status: 'UNKNOWN', billing_action: 'CANCEL_AT_PERIOD_END', access_review_required: false,
    stripe_subscription_id: 'sub-fixture', billing_effective_at: end,
    billing_submitted_at: new Date(now.getTime() - 60_000), billing_idempotency_key: 'same-frozen-key',
    lease_token: null, lease_expires_at: null, reconciliation_attempts: 0,
  };
  currentSubscription = { id: 'sub-fixture', status: 'active', cancel_at_period_end: false,
    items: { data: [{ current_period_start: Math.floor(now.getTime() / 1000), current_period_end: Math.floor(end.getTime() / 1000) }] } };
  database.refund_operations.findUnique.mockImplementation(async () => ({ ...operation }));
  database.refund_operations.updateMany.mockImplementation(async ({ where, data }: any) => {
    if (where.lease_token && operation.lease_token !== where.lease_token) return { count: 0 };
    Object.assign(operation, data);
    return { count: 1 };
  });
  database.subscriptions.findUnique.mockResolvedValue({ user_id: 'user-fixture', users: {
    deletion_status: 'ACTIVE', deletion_requested_at: null, deletion_scheduled_for: null,
  } });
  provider.subscriptions.retrieve.mockImplementation(async () => structuredClone(currentSubscription));
});
afterEach(() => jest.useRealTimers());

it('does not claim cancellation when an idempotent replay returns an old acceptance after renewal was re-enabled', async () => {
  // Stripe API v1 returns the original saved response for this key. It does not
  // repeat that accepted mutation after a later subscription change.
  provider.subscriptions.update.mockResolvedValue({ ...currentSubscription, cancel_at_period_end: true });
  const result = await reconcileRefundBilling(operation.id);
  expect(result.billing_status).toBe('REVIEW');
  expect(currentSubscription.cancel_at_period_end).toBe(false);
  expect(provider.subscriptions.retrieve.mock.calls.length).toBeGreaterThanOrEqual(2);
  expect(provider.subscriptions.update).toHaveBeenCalledWith('sub-fixture', { cancel_at_period_end: true }, { idempotencyKey: 'same-frozen-key' });
  expect(provider.refunds.create).not.toHaveBeenCalled();
});

it('records cancellation only when the current provider object confirms the selected exact subscription and period', async () => {
  provider.subscriptions.update.mockImplementation(async () => {
    currentSubscription = { ...currentSubscription, cancel_at_period_end: true };
    return structuredClone(currentSubscription);
  });
  const result = await reconcileRefundBilling(operation.id);
  expect(result.billing_status).toBe('APPLIED');
  expect(result.billing_evidence).toMatchObject({ subscriptionId: 'sub-fixture', cancelAtPeriodEnd: true });
  expect(provider.refunds.create).not.toHaveBeenCalled();
});
