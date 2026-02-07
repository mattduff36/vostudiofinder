/**
 * Unit tests for Subscription Enforcement Logic
 * @jest-environment node
 */

import {
  isAdminEmail,
  computeStudioStatus,
  computeFeaturedStatus,
  computeEnforcementDecisions,
} from '@/lib/subscriptions/enforcement';

describe('Subscription Enforcement', () => {
  describe('isAdminEmail', () => {
    it('should identify admin@mpdee.co.uk as admin', () => {
      expect(isAdminEmail('admin@mpdee.co.uk')).toBe(true);
    });

    it('should identify guy@voiceoverguy.co.uk as admin', () => {
      expect(isAdminEmail('guy@voiceoverguy.co.uk')).toBe(true);
    });

    it('should not identify regular email as admin', () => {
      expect(isAdminEmail('user@example.com')).toBe(false);
    });
  });

  describe('computeStudioStatus', () => {
    const now = new Date('2024-01-15T12:00:00Z');

    it('should return ACTIVE for admin accounts regardless of subscription', () => {
      const studio = {
        id: 'studio-1',
        status: 'INACTIVE',
        users: {
          email: 'admin@mpdee.co.uk',
          membership_tier: 'BASIC',
          subscriptions: [],
        },
      };

      const result = computeStudioStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-1',
        currentStatus: 'INACTIVE',
        desiredStatus: 'ACTIVE',
        reason: 'admin_override',
      });
    });

    // ── Basic tier tests ──

    it('should return ACTIVE for Basic tier with no subscription', () => {
      const studio = {
        id: 'studio-2',
        status: 'ACTIVE',
        users: {
          email: 'user@example.com',
          membership_tier: 'BASIC',
          subscriptions: [],
        },
      };

      const result = computeStudioStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-2',
        currentStatus: 'ACTIVE',
        desiredStatus: 'ACTIVE',
        reason: 'basic_tier',
      });
    });

    it('should return ACTIVE for Basic tier even with expired subscription', () => {
      const pastDate = new Date('2023-12-31T23:59:59Z');
      const studio = {
        id: 'studio-2b',
        status: 'ACTIVE',
        users: {
          email: 'user@example.com',
          membership_tier: 'BASIC',
          subscriptions: [{ current_period_end: pastDate }],
        },
      };

      const result = computeStudioStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-2b',
        currentStatus: 'ACTIVE',
        desiredStatus: 'ACTIVE',
        reason: 'basic_tier',
      });
    });

    it('should return ACTIVE for Basic tier with subscription but no expiry date', () => {
      const studio = {
        id: 'studio-2c',
        status: 'ACTIVE',
        users: {
          email: 'user@example.com',
          membership_tier: 'BASIC',
          subscriptions: [{ current_period_end: null }],
        },
      };

      const result = computeStudioStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-2c',
        currentStatus: 'ACTIVE',
        desiredStatus: 'ACTIVE',
        reason: 'basic_tier',
      });
    });

    it('should default to BASIC tier when membership_tier is undefined', () => {
      const studio = {
        id: 'studio-2d',
        status: 'ACTIVE',
        users: {
          email: 'user@example.com',
          // membership_tier not set — should default to BASIC
          subscriptions: [],
        },
      };

      const result = computeStudioStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-2d',
        currentStatus: 'ACTIVE',
        desiredStatus: 'ACTIVE',
        reason: 'basic_tier',
      });
    });

    // ── Premium tier tests ──

    it('should return ACTIVE for Premium tier with active subscription', () => {
      const futureDate = new Date('2024-12-31T23:59:59Z');
      const studio = {
        id: 'studio-3',
        status: 'INACTIVE',
        users: {
          email: 'user@example.com',
          membership_tier: 'PREMIUM',
          subscriptions: [{ current_period_end: futureDate }],
        },
      };

      const result = computeStudioStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-3',
        currentStatus: 'INACTIVE',
        desiredStatus: 'ACTIVE',
        reason: 'active',
      });
    });

    it('should return INACTIVE for Premium tier with expired subscription', () => {
      const pastDate = new Date('2023-12-31T23:59:59Z');
      const studio = {
        id: 'studio-4',
        status: 'ACTIVE',
        users: {
          email: 'user@example.com',
          membership_tier: 'PREMIUM',
          subscriptions: [{ current_period_end: pastDate }],
        },
      };

      const result = computeStudioStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-4',
        currentStatus: 'ACTIVE',
        desiredStatus: 'INACTIVE',
        reason: 'expired',
      });
    });

    it('should return INACTIVE for Premium tier with no subscription', () => {
      const studio = {
        id: 'studio-5',
        status: 'ACTIVE',
        users: {
          email: 'user@example.com',
          membership_tier: 'PREMIUM',
          subscriptions: [],
        },
      };

      const result = computeStudioStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-5',
        currentStatus: 'ACTIVE',
        desiredStatus: 'INACTIVE',
        reason: 'expired',
      });
    });

    it('should return INACTIVE for Premium tier with subscription but no expiry date', () => {
      const studio = {
        id: 'studio-5b',
        status: 'ACTIVE',
        users: {
          email: 'user@example.com',
          membership_tier: 'PREMIUM',
          subscriptions: [{ current_period_end: null }],
        },
      };

      const result = computeStudioStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-5b',
        currentStatus: 'ACTIVE',
        desiredStatus: 'INACTIVE',
        reason: 'expired',
      });
    });
  });

  describe('computeFeaturedStatus', () => {
    const now = new Date('2024-01-15T12:00:00Z');

    it('should not unfeature non-featured studios', () => {
      const studio = {
        id: 'studio-1',
        is_featured: false,
        featured_until: null,
      };

      const result = computeFeaturedStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-1',
        shouldUnfeature: false,
        reason: 'still_valid',
      });
    });

    it('should unfeature studios with expired featured_until', () => {
      const pastDate = new Date('2023-12-31T23:59:59Z');
      const studio = {
        id: 'studio-2',
        is_featured: true,
        featured_until: pastDate,
      };

      const result = computeFeaturedStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-2',
        shouldUnfeature: true,
        reason: 'expired_featured',
      });
    });

    it('should not unfeature studios with future featured_until', () => {
      const futureDate = new Date('2024-12-31T23:59:59Z');
      const studio = {
        id: 'studio-3',
        is_featured: true,
        featured_until: futureDate,
      };

      const result = computeFeaturedStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-3',
        shouldUnfeature: false,
        reason: 'still_valid',
      });
    });

    it('should not unfeature studios with no expiry date', () => {
      const studio = {
        id: 'studio-4',
        is_featured: true,
        featured_until: null,
      };

      const result = computeFeaturedStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-4',
        shouldUnfeature: false,
        reason: 'still_valid',
      });
    });
  });

  describe('computeEnforcementDecisions', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    const pastDate = new Date('2023-12-31T23:59:59Z');
    const futureDate = new Date('2024-12-31T23:59:59Z');

    it('should return empty array when no changes needed', () => {
      const studios = [
        {
          id: 'studio-1',
          status: 'ACTIVE',
          is_featured: false,
          featured_until: null,
          users: {
            email: 'user@example.com',
            membership_tier: 'PREMIUM',
            subscriptions: [{ current_period_end: futureDate }],
          },
        },
      ];

      const decisions = computeEnforcementDecisions(studios, now);

      expect(decisions).toEqual([]);
    });

    it('should identify Premium studios needing status update (expired)', () => {
      const studios = [
        {
          id: 'studio-1',
          status: 'ACTIVE',
          is_featured: false,
          featured_until: null,
          users: {
            email: 'user@example.com',
            membership_tier: 'PREMIUM',
            subscriptions: [{ current_period_end: pastDate }],
          },
        },
      ];

      const decisions = computeEnforcementDecisions(studios, now);

      expect(decisions).toEqual([
        {
          studioId: 'studio-1',
          statusUpdate: { status: 'INACTIVE' },
        },
      ]);
    });

    it('should NOT deactivate Basic tier studios even without subscription', () => {
      const studios = [
        {
          id: 'studio-basic',
          status: 'ACTIVE',
          is_featured: false,
          featured_until: null,
          users: {
            email: 'user@example.com',
            membership_tier: 'BASIC',
            subscriptions: [],
          },
        },
      ];

      const decisions = computeEnforcementDecisions(studios, now);

      // No changes — Basic stays ACTIVE
      expect(decisions).toEqual([]);
    });

    it('should identify studios needing unfeature', () => {
      const studios = [
        {
          id: 'studio-1',
          status: 'ACTIVE',
          is_featured: true,
          featured_until: pastDate,
          users: {
            email: 'user@example.com',
            membership_tier: 'PREMIUM',
            subscriptions: [{ current_period_end: futureDate }],
          },
        },
      ];

      const decisions = computeEnforcementDecisions(studios, now);

      expect(decisions).toEqual([
        {
          studioId: 'studio-1',
          unfeaturedUpdate: true,
        },
      ]);
    });

    it('should identify studios needing both updates', () => {
      const studios = [
        {
          id: 'studio-1',
          status: 'ACTIVE',
          is_featured: true,
          featured_until: pastDate,
          users: {
            email: 'user@example.com',
            membership_tier: 'PREMIUM',
            subscriptions: [{ current_period_end: pastDate }],
          },
        },
      ];

      const decisions = computeEnforcementDecisions(studios, now);

      expect(decisions).toEqual([
        {
          studioId: 'studio-1',
          statusUpdate: { status: 'INACTIVE' },
          unfeaturedUpdate: true,
        },
      ]);
    });

    it('should handle admin accounts correctly', () => {
      const studios = [
        {
          id: 'studio-1',
          status: 'INACTIVE',
          is_featured: false,
          featured_until: null,
          users: {
            email: 'admin@mpdee.co.uk',
            membership_tier: 'BASIC',
            subscriptions: [],
          },
        },
      ];

      const decisions = computeEnforcementDecisions(studios, now);

      expect(decisions).toEqual([
        {
          studioId: 'studio-1',
          statusUpdate: { status: 'ACTIVE' },
        },
      ]);
    });

    it('should deactivate Premium studio with no subscription', () => {
      const studios = [
        {
          id: 'studio-premium-nosub',
          status: 'ACTIVE',
          is_featured: false,
          featured_until: null,
          users: {
            email: 'user@example.com',
            membership_tier: 'PREMIUM',
            subscriptions: [],
          },
        },
      ];

      const decisions = computeEnforcementDecisions(studios, now);

      expect(decisions).toEqual([
        {
          studioId: 'studio-premium-nosub',
          statusUpdate: { status: 'INACTIVE' },
        },
      ]);
    });
  });
});
