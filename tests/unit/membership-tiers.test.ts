/**
 * Unit tests for Membership Tiers Configuration & Logic
 * @jest-environment node
 */

import {
  TIER_LIMITS,
  getTierLimits,
  isPremiumTier,
  isTierFeatureAllowed,
  PREMIUM_PRICE_PENCE,
  PREMIUM_PRICE_DISPLAY,
  PREMIUM_PRICE_PER_YEAR,
  type MembershipTier,
} from '@/lib/membership-tiers';

describe('Membership Tiers Configuration', () => {
  describe('TIER_LIMITS', () => {
    it('should define BASIC tier limits', () => {
      const basic = TIER_LIMITS.BASIC;
      expect(basic.aboutMaxChars).toBe(1000);
      expect(basic.imagesMax).toBe(2);
      expect(basic.studioTypesMax).toBe(1);
      expect(basic.studioTypesExcluded).toContain('VOICEOVER');
      expect(basic.connectionsMax).toBe(3);
      expect(basic.customConnectionsMax).toBe(0);
      expect(basic.socialLinksMax).toBe(2);
      expect(basic.phoneVisibility).toBe(false);
      expect(basic.directionsVisibility).toBe(false);
      expect(basic.advancedSettings).toBe(false);
      expect(basic.aiAutoGenerate).toBe(false);
      expect(basic.verificationEligible).toBe(false);
      expect(basic.featuredEligible).toBe(false);
      expect(basic.avatarAllowed).toBe(true);
    });

    it('should define PREMIUM tier limits', () => {
      const premium = TIER_LIMITS.PREMIUM;
      expect(premium.aboutMaxChars).toBe(2000);
      expect(premium.imagesMax).toBe(5);
      expect(premium.studioTypesMax).toBeNull(); // unlimited
      expect(premium.studioTypesExcluded).toEqual([]);
      expect(premium.connectionsMax).toBe(12);
      expect(premium.customConnectionsMax).toBe(2);
      expect(premium.socialLinksMax).toBeNull(); // unlimited
      expect(premium.phoneVisibility).toBe(true);
      expect(premium.directionsVisibility).toBe(true);
      expect(premium.advancedSettings).toBe(true);
      expect(premium.aiAutoGenerate).toBe(true);
      expect(premium.verificationEligible).toBe(true);
      expect(premium.featuredEligible).toBe(true);
      expect(premium.avatarAllowed).toBe(true);
    });
  });

  describe('getTierLimits', () => {
    it('should return BASIC limits for "BASIC" tier', () => {
      expect(getTierLimits('BASIC')).toBe(TIER_LIMITS.BASIC);
    });

    it('should return PREMIUM limits for "PREMIUM" tier', () => {
      expect(getTierLimits('PREMIUM')).toBe(TIER_LIMITS.PREMIUM);
    });

    it('should default to BASIC for null', () => {
      expect(getTierLimits(null)).toBe(TIER_LIMITS.BASIC);
    });

    it('should default to BASIC for undefined', () => {
      expect(getTierLimits(undefined)).toBe(TIER_LIMITS.BASIC);
    });

    it('should default to BASIC for unknown string', () => {
      expect(getTierLimits('UNKNOWN')).toBe(TIER_LIMITS.BASIC);
    });
  });

  describe('isPremiumTier', () => {
    it('should return true for "PREMIUM"', () => {
      expect(isPremiumTier('PREMIUM')).toBe(true);
    });

    it('should return false for "BASIC"', () => {
      expect(isPremiumTier('BASIC')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isPremiumTier(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isPremiumTier(undefined)).toBe(false);
    });
  });

  describe('isTierFeatureAllowed', () => {
    it('should return false for BASIC phone visibility', () => {
      expect(isTierFeatureAllowed('BASIC', 'phoneVisibility')).toBe(false);
    });

    it('should return true for PREMIUM phone visibility', () => {
      expect(isTierFeatureAllowed('PREMIUM', 'phoneVisibility')).toBe(true);
    });

    it('should return false for BASIC verification eligibility', () => {
      expect(isTierFeatureAllowed('BASIC', 'verificationEligible')).toBe(false);
    });

    it('should return true for PREMIUM verification eligibility', () => {
      expect(isTierFeatureAllowed('PREMIUM', 'verificationEligible')).toBe(true);
    });

    it('should return false for BASIC featured eligibility', () => {
      expect(isTierFeatureAllowed('BASIC', 'featuredEligible')).toBe(false);
    });

    it('should return true for PREMIUM featured eligibility', () => {
      expect(isTierFeatureAllowed('PREMIUM', 'featuredEligible')).toBe(true);
    });

    it('should return false for BASIC advanced settings', () => {
      expect(isTierFeatureAllowed('BASIC', 'advancedSettings')).toBe(false);
    });

    it('should return true for PREMIUM advanced settings', () => {
      expect(isTierFeatureAllowed('PREMIUM', 'advancedSettings')).toBe(true);
    });

    it('should return true for BASIC avatar (both tiers allow it)', () => {
      expect(isTierFeatureAllowed('BASIC', 'avatarAllowed')).toBe(true);
    });

    // Numeric limits
    it('should return true for BASIC images (limit > 0)', () => {
      expect(isTierFeatureAllowed('BASIC', 'imagesMax')).toBe(true);
    });

    it('should return false for BASIC custom connections (limit = 0)', () => {
      expect(isTierFeatureAllowed('BASIC', 'customConnectionsMax')).toBe(false);
    });

    // Null means unlimited
    it('should return true for PREMIUM social links (unlimited)', () => {
      expect(isTierFeatureAllowed('PREMIUM', 'socialLinksMax')).toBe(true);
    });

    // Array exclusions
    it('should return false for BASIC studio types excluded (has exclusions)', () => {
      expect(isTierFeatureAllowed('BASIC', 'studioTypesExcluded')).toBe(false);
    });

    it('should return true for PREMIUM studio types excluded (empty)', () => {
      expect(isTierFeatureAllowed('PREMIUM', 'studioTypesExcluded')).toBe(true);
    });
  });

  describe('Price constants', () => {
    it('should have correct price in pence', () => {
      expect(PREMIUM_PRICE_PENCE).toBe(2500);
    });

    it('should have correct display price', () => {
      expect(PREMIUM_PRICE_DISPLAY).toBe('£25');
    });

    it('should have correct price per year', () => {
      expect(PREMIUM_PRICE_PER_YEAR).toBe('£25/year');
    });
  });
});

describe('Tier Enforcement Rules', () => {
  describe('BASIC tier restrictions', () => {
    const basic = TIER_LIMITS.BASIC;

    it('should restrict about to 1000 chars', () => {
      expect(basic.aboutMaxChars).toBe(1000);
    });

    it('should allow max 2 images', () => {
      expect(basic.imagesMax).toBe(2);
    });

    it('should allow max 1 studio type', () => {
      expect(basic.studioTypesMax).toBe(1);
    });

    it('should exclude VOICEOVER studio type', () => {
      expect(basic.studioTypesExcluded).toEqual(['VOICEOVER']);
    });

    it('should allow max 3 connections', () => {
      expect(basic.connectionsMax).toBe(3);
    });

    it('should not allow custom connections', () => {
      expect(basic.customConnectionsMax).toBe(0);
    });

    it('should allow max 2 social links', () => {
      expect(basic.socialLinksMax).toBe(2);
    });

    it('should not allow phone visibility', () => {
      expect(basic.phoneVisibility).toBe(false);
    });

    it('should not allow directions visibility', () => {
      expect(basic.directionsVisibility).toBe(false);
    });
  });

  describe('PREMIUM tier has no restrictions', () => {
    const premium = TIER_LIMITS.PREMIUM;

    it('should allow up to 2000 chars for about', () => {
      expect(premium.aboutMaxChars).toBe(2000);
    });

    it('should allow up to 5 images', () => {
      expect(premium.imagesMax).toBe(5);
    });

    it('should allow unlimited studio types', () => {
      expect(premium.studioTypesMax).toBeNull();
    });

    it('should not exclude any studio types', () => {
      expect(premium.studioTypesExcluded).toHaveLength(0);
    });

    it('should allow all 12 connections', () => {
      expect(premium.connectionsMax).toBe(12);
    });

    it('should allow 2 custom connections', () => {
      expect(premium.customConnectionsMax).toBe(2);
    });

    it('should allow unlimited social links', () => {
      expect(premium.socialLinksMax).toBeNull();
    });
  });
});
