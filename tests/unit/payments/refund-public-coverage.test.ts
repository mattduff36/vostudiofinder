/** @jest-environment node */
import { db } from '@/lib/db';
import { applyPublicTierLimits, publicOwner, resolvePublicTiers } from '@/lib/subscriptions/public-entitlements';

jest.mock('@/lib/db', () => ({ db: {
  refund_operations: { findMany: jest.fn() }, subscriptions: { findMany: jest.fn() },
} }));
const operations = db.refund_operations.findMany as jest.Mock;
const subscriptions = db.subscriptions.findMany as jest.Mock;
const now = new Date('2026-10-12T12:00:00Z');
const oldEnd = new Date('2027-04-01T00:00:00Z');
const latestRevoked = { status: 'SUSPENDED', current_period_end: now };
const changed = { id: 'refunded-owner', role: 'USER', membership_tier: 'PREMIUM', subscriptions: [latestRevoked] };
const originalFlag = process.env.REFUND_LIFECYCLE_ENABLED;

beforeEach(() => {
  jest.resetAllMocks(); process.env.REFUND_LIFECYCLE_ENABLED = 'true';
  operations.mockResolvedValue([]); subscriptions.mockResolvedValue([]);
});
afterEach(() => {
  if (originalFlag === undefined) delete process.env.REFUND_LIFECYCLE_ENABLED;
  else process.env.REFUND_LIFECYCLE_ENABLED = originalFlag;
});

it('never queries additive models when lifecycle activation is off', async () => {
  process.env.REFUND_LIFECYCLE_ENABLED = 'false';
  const result = await resolvePublicTiers([changed, { ...changed, id: 'ordinary-current', subscriptions: [{ status: 'ACTIVE', current_period_end: oldEnd }] }], now);
  expect([...result]).toEqual([['refunded-owner', 'BASIC'], ['ordinary-current', 'PREMIUM']]);
  expect(operations).not.toHaveBeenCalled(); expect(subscriptions).not.toHaveBeenCalled();
});

it('preserves older paid overlap for refund-adjusted public owners without changing untouched latest-only semantics', async () => {
  operations.mockResolvedValue([{ user_reference: changed.id }]);
  subscriptions.mockResolvedValue([
    { user_id: changed.id, status: 'SUSPENDED', current_period_start: new Date('2026-10-01'), current_period_end: now },
    { user_id: changed.id, status: 'ACTIVE', current_period_start: new Date('2026-01-01'), current_period_end: oldEnd },
  ]);
  const unaffected = { ...changed, id: 'unaffected-owner', subscriptions: [latestRevoked, { status: 'ACTIVE', current_period_end: oldEnd }] };
  const owners = [changed, unaffected, changed];
  const before = structuredClone(owners);
  const result = await resolvePublicTiers(owners, now);
  expect(result.get(changed.id)).toBe('PREMIUM');
  expect(result.get(unaffected.id)).toBe('BASIC');
  expect(owners).toEqual(before);
  expect(operations).toHaveBeenCalledTimes(1); expect(subscriptions).toHaveBeenCalledTimes(1);
  expect(operations.mock.calls[0][0].where.user_reference.in).toEqual([changed.id, unaffected.id]);
  expect(subscriptions.mock.calls[0][0].where.user_id.in).toEqual([changed.id]);
  const heldStudio = { status: 'INACTIVE', is_profile_visible: false, studio_studio_types: [{ studio_type: 'VOICEOVER' }], is_premium: true };
  const publicStudio = applyPublicTierLimits(heldStudio, result.get(changed.id)!);
  expect(publicStudio).toEqual(heldStudio);
  expect(publicStudio.studio_studio_types).toEqual([{ studio_type: 'VOICEOVER' }]);
});

it('never bridges a future isolated interval when revoked current coverage is absent', async () => {
  operations.mockResolvedValue([{ user_reference: changed.id }]);
  subscriptions.mockResolvedValue([{ user_id: changed.id, status: 'ACTIVE',
    current_period_start: new Date('2026-12-01'), current_period_end: oldEnd }]);
  expect((await resolvePublicTiers([changed], now)).get(changed.id)).toBe('BASIC');
});

it('retains admin and Basic policy without consulting refund history for those owners', async () => {
  const result = await resolvePublicTiers([
    { ...changed, id: 'admin-owner', role: 'ADMIN', membership_tier: 'BASIC' },
    { ...changed, id: 'basic-owner', membership_tier: 'BASIC', subscriptions: [{ status: 'ACTIVE', current_period_end: oldEnd }] },
  ], now);
  expect([...result]).toEqual([['admin-owner', 'PREMIUM'], ['basic-owner', 'BASIC']]);
  expect(operations).not.toHaveBeenCalled(); expect(subscriptions).not.toHaveBeenCalled();
});

it('does not query all subscription intervals for users with no applied refund effect', async () => {
  expect((await resolvePublicTiers([changed], now)).get(changed.id)).toBe('BASIC');
  expect(operations).toHaveBeenCalledTimes(1); expect(subscriptions).not.toHaveBeenCalled();
});

it('keeps private entitlement and refund records out of the public owner serializer', () => {
  expect(publicOwner({ ...changed, username: 'public_fixture', avatar_url: null, display_name: 'Invented name',
    refund_operations: [{ internal: 'not public' }] })).toEqual({ id: changed.id, username: 'public_fixture', avatar_url: null, display_name: 'Invented name' });
});
