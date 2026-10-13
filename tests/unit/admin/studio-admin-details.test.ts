/** @jest-environment node */
import { billingSummary, parseAdminNote } from '@/lib/admin/studios/admin-details';
const base = { auto_renew: false, subscriptions: [], payments: [] };
it('does not infer paid or recurring billing from a local subscription', () => {
  expect(billingSummary({ ...base, auto_renew: true, subscriptions: [{ status: 'ACTIVE', stripe_subscription_id: null, paypal_subscription_id: null }] })).toEqual({ billing: 'Local/manual record · active', renewal: 'No linked recurring billing', latestPayment: null });
});
it('labels provider renewal as a recorded setting, not a live provider check', () => {
  expect(billingSummary({ ...base, auto_renew: true, subscriptions: [{ status: 'PAST_DUE', stripe_subscription_id: 'sub_fixture', paypal_subscription_id: null }], payments: [{ status: 'FAILED' }] })).toEqual({ billing: 'Stripe subscription · past due', renewal: 'On (recorded setting)', latestPayment: 'failed' });
});
it('retains conflicting subscriptions as reviewable', () => {
  const sub = { status: 'ACTIVE', stripe_subscription_id: 'sub_fixture', paypal_subscription_id: null };
  expect(billingSummary({ ...base, subscriptions: [sub, sub] }).billing).toContain('review');
  expect(billingSummary({ ...base, auto_renew: true, subscriptions: [{ ...sub, status: 'CANCELLED' }] }).renewal).toContain('review');
});
it('does not attribute a historic payment to an unlinked membership', () => {
  expect(billingSummary({ ...base, payments: [{ status: 'SUCCEEDED' }] }).billing).toBe('Payment recorded · no subscription link');
  expect(billingSummary(base).billing).toBe('No subscription recorded');
});
it('preserves empty and malformed note versions', () => {
  const updated_at = new Date('2026-01-01');
  expect(parseAdminNote(undefined)).toEqual({ text: '', updatedAt: null, version: null });
  expect(parseAdminNote({ content: '{bad', updated_at }).version).toBe(updated_at.toISOString());
  expect(parseAdminNote({ content: JSON.stringify({ text: '' }), updated_at }).text).toBe('');
});
