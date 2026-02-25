/**
 * Unit tests for Legacy VOICEOVER Restriction Logic
 * @jest-environment node
 *
 * Tests the business rule: legacy users (studio created before 2026-01-01)
 * with free 6-month premium cannot list as VOICEOVER unless they have
 * a qualifying paid extension of 12+ months. Users in the 14-day grace
 * period keep their existing VOICEOVER listing but cannot add new ones.
 */

import { getTierLimits } from '@/lib/membership-tiers';

// ─── Constants (mirrored from membership.ts) ──────────────────────────────

const LEGACY_CUTOFF = new Date('2026-01-01T00:00:00.000Z');
const GRACE_PERIOD_DAYS = 14;
const MIN_QUALIFYING_DAYS = 335;

// ─── Pure logic extracted for testability ─────────────────────────────────

interface TestUserData {
  role: string;
  studioCreatedAt: Date | null;
  payments: { id: string }[];
  subscriptions: {
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
    current_period_start: Date | null;
    current_period_end: Date | null;
    created_at: Date;
  }[];
  metadata: { key: string; value: string | null }[];
}

interface LegacyVoiceoverStatus {
  isLegacyUser: boolean;
  isRestricted: boolean;
  hasVoiceoverUnlock: boolean;
  graceActive: boolean;
  graceEndsAt: Date | null;
  shouldBlockVoiceover: boolean;
  shouldRemoveVoiceover: boolean;
}

const UNRESTRICTED: LegacyVoiceoverStatus = {
  isLegacyUser: false,
  isRestricted: false,
  hasVoiceoverUnlock: false,
  graceActive: false,
  graceEndsAt: null,
  shouldBlockVoiceover: false,
  shouldRemoveVoiceover: false,
};

function computeLegacyVoiceoverStatus(
  user: TestUserData | null,
  now: Date = new Date()
): LegacyVoiceoverStatus {
  if (!user) return UNRESTRICTED;
  if (user.role === 'ADMIN') return UNRESTRICTED;
  if (!user.studioCreatedAt || user.studioCreatedAt >= LEGACY_CUTOFF) return UNRESTRICTED;

  const metaMap = new Map(user.metadata.map((m) => [m.key, m.value]));

  if (metaMap.get('legacy_voiceover_unlocked_at')) {
    return {
      isLegacyUser: true,
      isRestricted: false,
      hasVoiceoverUnlock: true,
      graceActive: false,
      graceEndsAt: null,
      shouldBlockVoiceover: false,
      shouldRemoveVoiceover: false,
    };
  }

  const hasPaidPayment = user.payments.length > 0;
  if (hasPaidPayment) {
    const hasQualifyingSub = user.subscriptions.some((sub) => {
      const isPaid = sub.stripe_subscription_id != null || sub.stripe_customer_id != null;
      if (!isPaid) return false;
      const start = sub.current_period_start || sub.created_at;
      const end = sub.current_period_end;
      if (!end) return false;
      const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      return durationDays >= MIN_QUALIFYING_DAYS;
    });

    if (hasQualifyingSub) {
      return {
        isLegacyUser: true,
        isRestricted: false,
        hasVoiceoverUnlock: true,
        graceActive: false,
        graceEndsAt: null,
        shouldBlockVoiceover: false,
        shouldRemoveVoiceover: false,
      };
    }
  }

  const graceEndsAtRaw = metaMap.get('legacy_voiceover_grace_ends_at');
  let graceEndsAt: Date | null = null;
  if (graceEndsAtRaw) {
    graceEndsAt = new Date(graceEndsAtRaw);
  }

  const graceActive = graceEndsAt != null && graceEndsAt > now;
  const graceExpired = graceEndsAt != null && graceEndsAt <= now;

  return {
    isLegacyUser: true,
    isRestricted: true,
    hasVoiceoverUnlock: false,
    graceActive,
    graceEndsAt,
    shouldBlockVoiceover: true,
    shouldRemoveVoiceover: graceExpired,
  };
}

/**
 * Simulates the enforcement logic from the profile PUT handler, extended
 * with the legacy VOICEOVER restriction.
 */
function enforceStudioTypeRulesWithLegacy(
  submittedTypes: string[],
  tier: 'BASIC' | 'PREMIUM',
  legacyStatus: LegacyVoiceoverStatus
): string[] {
  const tierLimits = getTierLimits(tier);

  let allowedTypes = submittedTypes.filter(
    (type) => !tierLimits.studioTypesExcluded.includes(type)
  );

  if (legacyStatus.shouldBlockVoiceover && allowedTypes.includes('VOICEOVER')) {
    allowedTypes = allowedTypes.filter((t) => t !== 'VOICEOVER');
  }

  if (allowedTypes.includes('VOICEOVER') && allowedTypes.length > 1) {
    allowedTypes = ['VOICEOVER'];
  }

  if (tierLimits.studioTypesMax !== null) {
    allowedTypes = allowedTypes.slice(0, tierLimits.studioTypesMax);
  }

  return allowedTypes;
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('Legacy VOICEOVER Restriction - Status Computation', () => {
  const now = new Date('2026-03-15T12:00:00Z');

  function makeUser(overrides: Partial<TestUserData> = {}): TestUserData {
    return {
      role: 'USER',
      studioCreatedAt: new Date('2025-06-01T00:00:00Z'),
      payments: [],
      subscriptions: [],
      metadata: [],
      ...overrides,
    };
  }

  it('should return unrestricted for null user', () => {
    expect(computeLegacyVoiceoverStatus(null, now)).toEqual(UNRESTRICTED);
  });

  it('should return unrestricted for ADMIN users', () => {
    const user = makeUser({ role: 'ADMIN' });
    expect(computeLegacyVoiceoverStatus(user, now)).toEqual(UNRESTRICTED);
  });

  it('should return unrestricted for non-legacy users (studio after cutoff)', () => {
    const user = makeUser({ studioCreatedAt: new Date('2026-02-01T00:00:00Z') });
    expect(computeLegacyVoiceoverStatus(user, now)).toEqual(UNRESTRICTED);
  });

  it('should return unrestricted for users with no studio', () => {
    const user = makeUser({ studioCreatedAt: null });
    expect(computeLegacyVoiceoverStatus(user, now)).toEqual(UNRESTRICTED);
  });

  it('should return restricted for legacy user with no payments and no metadata', () => {
    const user = makeUser();
    const status = computeLegacyVoiceoverStatus(user, now);
    expect(status.isLegacyUser).toBe(true);
    expect(status.isRestricted).toBe(true);
    expect(status.shouldBlockVoiceover).toBe(true);
    expect(status.shouldRemoveVoiceover).toBe(false);
    expect(status.graceActive).toBe(false);
  });

  it('should return unlocked for user with unlock metadata', () => {
    const user = makeUser({
      metadata: [{ key: 'legacy_voiceover_unlocked_at', value: '2026-03-01T00:00:00Z' }],
    });
    const status = computeLegacyVoiceoverStatus(user, now);
    expect(status.isLegacyUser).toBe(true);
    expect(status.isRestricted).toBe(false);
    expect(status.hasVoiceoverUnlock).toBe(true);
    expect(status.shouldBlockVoiceover).toBe(false);
  });

  it('should return unlocked for user with qualifying 12+ month paid sub', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2027-01-01T00:00:00Z');
    const user = makeUser({
      payments: [{ id: 'pay_1' }],
      subscriptions: [{
        stripe_subscription_id: 'sub_123',
        stripe_customer_id: 'cus_123',
        current_period_start: start,
        current_period_end: end,
        created_at: start,
      }],
    });
    const status = computeLegacyVoiceoverStatus(user, now);
    expect(status.isRestricted).toBe(false);
    expect(status.hasVoiceoverUnlock).toBe(true);
    expect(status.shouldBlockVoiceover).toBe(false);
  });

  it('should still be restricted if paid sub is < 12 months', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-07-01T00:00:00Z');
    const user = makeUser({
      payments: [{ id: 'pay_1' }],
      subscriptions: [{
        stripe_subscription_id: 'sub_123',
        stripe_customer_id: 'cus_123',
        current_period_start: start,
        current_period_end: end,
        created_at: start,
      }],
    });
    const status = computeLegacyVoiceoverStatus(user, now);
    expect(status.isRestricted).toBe(true);
    expect(status.shouldBlockVoiceover).toBe(true);
  });

  it('should not count free (no Stripe IDs) subscriptions as qualifying', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2027-01-01T00:00:00Z');
    const user = makeUser({
      payments: [{ id: 'pay_1' }],
      subscriptions: [{
        stripe_subscription_id: null,
        stripe_customer_id: null,
        current_period_start: start,
        current_period_end: end,
        created_at: start,
      }],
    });
    const status = computeLegacyVoiceoverStatus(user, now);
    expect(status.isRestricted).toBe(true);
  });

  it('should show grace active during the 14-day window', () => {
    const graceEnd = new Date('2026-03-20T00:00:00Z');
    const user = makeUser({
      metadata: [{ key: 'legacy_voiceover_grace_ends_at', value: graceEnd.toISOString() }],
    });
    const status = computeLegacyVoiceoverStatus(user, now);
    expect(status.graceActive).toBe(true);
    expect(status.graceEndsAt).toEqual(graceEnd);
    expect(status.shouldBlockVoiceover).toBe(true);
    expect(status.shouldRemoveVoiceover).toBe(false);
  });

  it('should mark shouldRemoveVoiceover after grace expires', () => {
    const graceEnd = new Date('2026-03-10T00:00:00Z');
    const user = makeUser({
      metadata: [{ key: 'legacy_voiceover_grace_ends_at', value: graceEnd.toISOString() }],
    });
    const status = computeLegacyVoiceoverStatus(user, now);
    expect(status.graceActive).toBe(false);
    expect(status.shouldBlockVoiceover).toBe(true);
    expect(status.shouldRemoveVoiceover).toBe(true);
  });

  it('should prefer unlock metadata over grace period', () => {
    const graceEnd = new Date('2026-03-20T00:00:00Z');
    const user = makeUser({
      metadata: [
        { key: 'legacy_voiceover_grace_ends_at', value: graceEnd.toISOString() },
        { key: 'legacy_voiceover_unlocked_at', value: '2026-03-12T00:00:00Z' },
      ],
    });
    const status = computeLegacyVoiceoverStatus(user, now);
    expect(status.isRestricted).toBe(false);
    expect(status.hasVoiceoverUnlock).toBe(true);
    expect(status.shouldBlockVoiceover).toBe(false);
  });
});

describe('Legacy VOICEOVER Restriction - Server-Side Enforcement', () => {
  const restrictedLegacy: LegacyVoiceoverStatus = {
    isLegacyUser: true,
    isRestricted: true,
    hasVoiceoverUnlock: false,
    graceActive: false,
    graceEndsAt: null,
    shouldBlockVoiceover: true,
    shouldRemoveVoiceover: false,
  };

  const unlockedLegacy: LegacyVoiceoverStatus = {
    isLegacyUser: true,
    isRestricted: false,
    hasVoiceoverUnlock: true,
    graceActive: false,
    graceEndsAt: null,
    shouldBlockVoiceover: false,
    shouldRemoveVoiceover: false,
  };

  it('should block VOICEOVER for restricted legacy PREMIUM user', () => {
    const result = enforceStudioTypeRulesWithLegacy(['VOICEOVER'], 'PREMIUM', restrictedLegacy);
    expect(result).toEqual([]);
  });

  it('should allow VOICEOVER for unlocked legacy PREMIUM user', () => {
    const result = enforceStudioTypeRulesWithLegacy(['VOICEOVER'], 'PREMIUM', unlockedLegacy);
    expect(result).toEqual(['VOICEOVER']);
  });

  it('should allow non-VOICEOVER types for restricted legacy user', () => {
    const result = enforceStudioTypeRulesWithLegacy(
      ['HOME', 'RECORDING'],
      'PREMIUM',
      restrictedLegacy
    );
    expect(result).toEqual(['HOME', 'RECORDING']);
  });

  it('should strip VOICEOVER but keep other types for restricted legacy user', () => {
    const result = enforceStudioTypeRulesWithLegacy(
      ['HOME', 'VOICEOVER'],
      'PREMIUM',
      restrictedLegacy
    );
    expect(result).toEqual(['HOME']);
  });

  it('should not affect non-legacy users (UNRESTRICTED)', () => {
    const result = enforceStudioTypeRulesWithLegacy(['VOICEOVER'], 'PREMIUM', UNRESTRICTED);
    expect(result).toEqual(['VOICEOVER']);
  });

  it('BASIC tier exclusion still applies even with legacy unlocked', () => {
    const result = enforceStudioTypeRulesWithLegacy(['VOICEOVER'], 'BASIC', unlockedLegacy);
    expect(result).toEqual([]);
  });
});

describe('Legacy VOICEOVER Restriction - Grace Period Calculations', () => {
  it('grace period should be 14 days', () => {
    expect(GRACE_PERIOD_DAYS).toBe(14);
  });

  it('qualifying subscription must be at least 335 days', () => {
    expect(MIN_QUALIFYING_DAYS).toBe(335);
  });

  it('legacy cutoff should be 2026-01-01', () => {
    expect(LEGACY_CUTOFF.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('a standard 12-month subscription (365 days) should qualify', () => {
    const duration = 365;
    expect(duration >= MIN_QUALIFYING_DAYS).toBe(true);
  });

  it('an early renewal (395 days) should qualify', () => {
    const duration = 395;
    expect(duration >= MIN_QUALIFYING_DAYS).toBe(true);
  });

  it('a 5-year renewal (1825 days) should qualify', () => {
    const duration = 1825;
    expect(duration >= MIN_QUALIFYING_DAYS).toBe(true);
  });

  it('a 6-month subscription (182 days) should NOT qualify', () => {
    const duration = 182;
    expect(duration >= MIN_QUALIFYING_DAYS).toBe(false);
  });

  it('a 3-month coupon subscription (91 days) should NOT qualify', () => {
    const duration = 91;
    expect(duration >= MIN_QUALIFYING_DAYS).toBe(false);
  });
});
