/** @jest-environment node */
import { providerMoneyState, settlementProjection, validateRefundChoices, canReplayProviderRequest, type RefundEligibility, type RefundRequest } from '@/lib/payments/refunds/contracts';
import { parseRefundAmount, paymentListQuery } from '@/lib/admin/payments/contracts';
import { coveredUntil } from '@/lib/payments/benefit-grants';
import { survivingMembershipEnd } from '@/lib/payments/refunds/membership-projection';
import { refundOutcomeCopy } from '@/lib/payments/refunds/notifications';

jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/stripe', () => ({ stripe: {} }));
const now = new Date('2026-10-12T12:00:00Z');
const eligibility: RefundEligibility = { enabled: true, recoveryEnabled: true, reason: null, paymentId: 'payment', currency: 'gbp', amount: 3000, settledAmount: 1000, heldAmount: 0, availableAmount: 2000, packageLabel: 'Premium', previewToken: 'preview', operations: [],
  benefit: { id: 'exact-grant', kind: 'PREMIUM', startsAt: '2026-01-01', endsAt: '2027-01-01', canEnd: true },
  billing: { subscriptionId: 'sub-exact', state: 'KNOWN', cancelAtPeriodEnd: false, periodEnd: '2027-01-01', nextChargeAt: '2027-01-01', nextChargeAmount: null, currency: 'gbp' } };
const request: RefundRequest = { requestKey: 'request-1234567890', amount: 2000, reason: 'requested_by_customer', comment: '', previewToken: 'preview' };

it('uses exact minor units, rejecting precision loss, exponents, zero and overflow', () => {
  expect(parseRefundAmount('0.29')).toBe(29);
  expect(parseRefundAmount('30.1')).toBe(3010);
  for (const value of ['30.001', '1e2', '-1', '0', 'Infinity', '1,000', '21474836.48']) expect(parseRefundAmount(value)).toBeNull();
});
it('rejects unsupported statuses and malformed, negative and unbounded pagination', () => {
  expect(paymentListQuery.parse({}).limit).toBe(50);
  for (const query of [{ page: '0' }, { page: '-1' }, { limit: '201' }, { page: '1.2' }, { tab: 'subscriptions', status: 'REFUNDED' }, { status: 'ACTIVE' }]) expect(paymentListQuery.safeParse(query).success).toBe(false);
});
it('requires independent explicit benefit and renewal choices for the final cumulative full refund', () => {
  expect(() => validateRefundChoices(request, eligibility)).toThrow('Choose whether');
  expect(() => validateRefundChoices({ ...request, benefitAction: 'END', benefitGrantId: 'wrong' }, eligibility)).toThrow('safely ended');
  expect(() => validateRefundChoices({ ...request, benefitAction: 'KEEP' }, eligibility)).toThrow('renewal');
  expect(validateRefundChoices({ ...request, benefitAction: 'END', benefitGrantId: 'exact-grant', billingAction: 'KEEP' }, eligibility)).toBe(true);
  expect(() => validateRefundChoices({ ...request, benefitAction: 'KEEP', billingAction: 'KEEP' }, { ...eligibility, billing: { ...eligibility.billing!, state: 'REVIEW' } })).toThrow('unknown');
});
it('partial refunds cannot revoke access or silently change renewal', () => {
  expect(validateRefundChoices({ ...request, amount: 500 }, eligibility)).toBe(false);
  expect(() => validateRefundChoices({ ...request, amount: 500, benefitAction: 'END' }, eligibility)).toThrow('Partial refunds');
  expect(() => validateRefundChoices({ ...request, amount: 500, billingAction: 'KEEP' }, eligibility)).toThrow('Partial refunds');
});
it('unknown historic grants can be kept but never inferred from another subscription', () => {
  const unknown = { ...eligibility, benefit: null, billing: null };
  expect(validateRefundChoices({ ...request, benefitAction: 'KEEP' }, unknown)).toBe(true);
  expect(() => validateRefundChoices({ ...request, benefitAction: 'END', benefitGrantId: 'some-latest-sub' }, unknown)).toThrow('safely ended');
});
it('preserves provider action-needed and failure as distinct from succeeded settlement', () => {
  expect(providerMoneyState('requires_action')).toBe('ACTION_REQUIRED');
  expect(settlementProjection(providerMoneyState('requires_action'))).toBe('PENDING');
  expect(providerMoneyState('failed')).toBe('FAILED');
  expect(providerMoneyState('unrecognized-future-state')).toBe('UNKNOWN');
  expect(canReplayProviderRequest(new Date(now.getTime() - 23 * 60 * 60 * 1000), now)).toBe(false);
  expect(canReplayProviderRequest(new Date(now.getTime() + 1000), now)).toBe(false);
});
it('retains overlapping coverage and never bridges a future unpaid gap', () => {
  const interval = (start: string, end: string, status = 'ACTIVE') => ({ starts_at: new Date(start), ends_at: new Date(end), status });
  expect(coveredUntil([interval('2026-01-01', '2026-12-31'), interval('2026-12-01', '2027-02-01')], now)?.toISOString()).toBe('2027-02-01T00:00:00.000Z');
  expect(coveredUntil([interval('2026-01-01', '2026-12-31'), interval('2027-01-01', '2027-02-01')], now)?.toISOString()).toBe('2026-12-31T00:00:00.000Z');
  expect(coveredUntil([interval('2026-01-01', '2027-01-01', 'REVOKED')], now)).toBeNull();
});
it('a refunded latest subscription cannot conceal an older surviving interval', () => {
  const older = { status: 'ACTIVE', current_period_start: new Date('2026-01-01'), current_period_end: new Date('2027-01-01') };
  const latest = { status: 'SUSPENDED', current_period_start: new Date('2026-10-01'), current_period_end: now };
  expect(survivingMembershipEnd([latest, older], now)).toEqual(older.current_period_end);
  expect(survivingMembershipEnd([{ ...older, current_period_start: new Date('2026-12-01') }], now)).toBeNull();
});
it('refund notifications state independent actual outcomes without a universal cancellation claim', () => {
  const copy = refundOutcomeCopy({ benefit_action: 'KEEP', benefit_status: 'APPLIED', billing_action: 'CANCEL_AT_PERIOD_END', billing_status: 'UNKNOWN', billing_effective_at: null });
  expect(copy.benefitOutcome).toContain('kept'); expect(copy.billingOutcome).toContain('not confirmed');
  const partial = refundOutcomeCopy({ benefit_action: null, benefit_status: 'NOT_APPLICABLE', billing_action: null, billing_status: 'NOT_APPLICABLE', billing_effective_at: null });
  expect(partial.benefitOutcome).toContain('does not change'); expect(partial.billingOutcome).toContain('did not change');
});
