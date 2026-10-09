/** @jest-environment node */
import { computeStudioStatus, computeEnforcementDecisions, computeFeaturedStatus, applyEnforcementDecisions } from '@/lib/subscriptions/enforcement';
import { performDowngrade } from '@/lib/subscriptions/downgrade';
import { db } from '@/lib/db';
jest.mock('@/lib/db', () => ({ db: { studio_profiles: { updateMany: jest.fn() } } }));
jest.mock('@/lib/subscriptions/downgrade', () => ({ performDowngrade: jest.fn() }));
const now = new Date('2026-10-09T12:00:00Z');
const past = new Date('2026-10-01');
const future = new Date('2027-01-01');
const studio = (status = 'ACTIVE', tier = 'PREMIUM', expiry: Date | null = past) => ({
  id: 'studio', status, is_featured: false, featured_until: null,
  users: { id: 'owner', email: 'member@example.test', role: 'USER', status: 'ACTIVE', deletion_status: 'ACTIVE',
    membership_tier: tier, subscriptions: [{ current_period_end: expiry }] },
});
beforeEach(() => jest.clearAllMocks());
it.each(['ACTIVE', 'INACTIVE', 'DRAFT', 'PENDING'])('expiry preserves publication state %s', status => {
  expect(computeStudioStatus(studio(status), now)).toMatchObject({ desiredStatus: status, reason: 'expired' });
});
it('Basic does not reactivate an inactive studio', () => {
  expect(computeEnforcementDecisions([studio('INACTIVE', 'BASIC')], now)).toEqual([]);
});
it('expired Premium requests a downgrade, not a hide or a publish', () => {
  expect(computeEnforcementDecisions([studio()], now)).toEqual([{ studioId: 'studio', userId: 'owner', triggerDowngrade: true }]);
});
it('missing expiry is a review case, not an assumed expiry', () => {
  expect(computeStudioStatus(studio('ACTIVE', 'PREMIUM', null), now).reason).toBe('review');
  expect(computeEnforcementDecisions([studio('ACTIVE', 'PREMIUM', null)], now)).toEqual([]);
});
it('future Premium is unchanged', () => expect(computeEnforcementDecisions([studio('ACTIVE', 'PREMIUM', future)], now)).toEqual([]));
it('admin and pending deletion are excluded', () => {
  const admin = studio(); admin.users.role = 'ADMIN';
  const deleting = studio(); deleting.users.deletion_status = 'PENDING_DELETION';
  expect(computeEnforcementDecisions([admin, deleting], now)).toEqual([]);
});
it('featured expiry uses the boundary consistently', () => {
  expect(computeFeaturedStatus({ id: 's', is_featured: true, featured_until: now }, now).shouldUnfeature).toBe(true);
  expect(computeFeaturedStatus({ id: 's', is_featured: true, featured_until: future }, now).shouldUnfeature).toBe(false);
});
it('a failed downgrade surfaces failure and cannot publish', async () => {
  (performDowngrade as jest.Mock).mockResolvedValue({ downgraded: false, error: 'failed' });
  await expect(applyEnforcementDecisions([{ studioId: 's', userId: 'u', triggerDowngrade: true }])).rejects.toThrow('failed');
  expect(db.studio_profiles.updateMany).not.toHaveBeenCalled();
});
it('success does not separately overwrite publication status', async () => {
  (performDowngrade as jest.Mock).mockResolvedValue({ downgraded: true });
  expect(await applyEnforcementDecisions([{ studioId: 's', userId: 'u', triggerDowngrade: true }])).toEqual({ statusUpdates: 0, unfeaturedUpdates: 0, downgrades: 1 });
  expect(db.studio_profiles.updateMany).not.toHaveBeenCalled();
});
