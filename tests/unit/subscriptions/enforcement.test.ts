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

    it('should return ACTIVE for legacy profile with no subscription (legacy profiles)', () => {
      const studio = {
        id: 'studio-2',
        status: 'ACTIVE',
        users: {
          email: 'user@example.com',
          subscriptions: [],
        },
      };

      const result = computeStudioStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-2',
        currentStatus: 'ACTIVE',
        desiredStatus: 'ACTIVE',
        reason: 'legacy',
      });
    });

    it('should return ACTIVE for legacy profile with subscription but no expiry date', () => {
      const studio = {
        id: 'studio-2b',
        status: 'ACTIVE',
        users: {
          email: 'user@example.com',
          subscriptions: [{ current_period_end: null }],
        },
      };

      const result = computeStudioStatus(studio, now);

      expect(result).toEqual({
        studioId: 'studio-2b',
        currentStatus: 'ACTIVE',
        desiredStatus: 'ACTIVE',
        reason: 'legacy',
      });
    });

    it('should return ACTIVE for non-admin with active subscription', () => {
      const futureDate = new Date('2024-12-31T23:59:59Z');
      const studio = {
        id: 'studio-3',
        status: 'INACTIVE',
        users: {
          email: 'user@example.com',
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

    it('should return INACTIVE for non-admin with expired subscription', () => {
      const pastDate = new Date('2023-12-31T23:59:59Z');
      const studio = {
        id: 'studio-4',
        status: 'ACTIVE',
        users: {
          email: 'user@example.com',
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
            subscriptions: [{ current_period_end: futureDate }],
          },
        },
      ];

      const decisions = computeEnforcementDecisions(studios, now);

      expect(decisions).toEqual([]);
    });

    it('should identify studios needing status update', () => {
      const studios = [
        {
          id: 'studio-1',
          status: 'ACTIVE',
          is_featured: false,
          featured_until: null,
          users: {
            email: 'user@example.com',
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

    it('should identify studios needing unfeature', () => {
      const studios = [
        {
          id: 'studio-1',
          status: 'ACTIVE',
          is_featured: true,
          featured_until: pastDate,
          users: {
            email: 'user@example.com',
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
  });
});
