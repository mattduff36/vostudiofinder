/**
 * Tests for promo configuration
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Store original env values
const originalEnv = process.env;

describe('Promo Configuration', () => {
  beforeEach(() => {
    // Reset modules to clear cached values
    jest.resetModules();
    // Copy original env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('getPromoConfig', () => {
    it('should return inactive when NEXT_PUBLIC_PROMO_FREE_SIGNUP is not set', async () => {
      delete process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP;
      
      // Dynamic import to get fresh module
      const { getPromoConfig } = await import('@/lib/promo');
      const config = getPromoConfig();
      
      expect(config.isActive).toBe(false);
      expect(config.normalPrice).toBe('£25/year');
      expect(config.promoPrice).toBe('FREE');
    });

    it('should return inactive when NEXT_PUBLIC_PROMO_FREE_SIGNUP is false', async () => {
      process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP = 'false';
      
      const { getPromoConfig } = await import('@/lib/promo');
      const config = getPromoConfig();
      
      expect(config.isActive).toBe(false);
    });

    it('should return active when NEXT_PUBLIC_PROMO_FREE_SIGNUP is true', async () => {
      process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP = 'true';
      
      const { getPromoConfig } = await import('@/lib/promo');
      const config = getPromoConfig();
      
      expect(config.isActive).toBe(true);
      expect(config.message).toBe('FREE membership for a limited time');
      expect(config.ctaText).toBe('Join free today');
      expect(config.badgeText).toBe('Limited time');
    });

    it('should include end date when NEXT_PUBLIC_PROMO_END_DATE is set', async () => {
      process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP = 'true';
      process.env.NEXT_PUBLIC_PROMO_END_DATE = '2030-12-31';
      
      const { getPromoConfig } = await import('@/lib/promo');
      const config = getPromoConfig();
      
      expect(config.isActive).toBe(true);
      expect(config.endDate).toBeInstanceOf(Date);
      expect(config.endDate?.getFullYear()).toBe(2030);
    });

    it('should return inactive when promo end date has passed', async () => {
      process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP = 'true';
      process.env.NEXT_PUBLIC_PROMO_END_DATE = '2020-01-01'; // Past date
      
      const { getPromoConfig } = await import('@/lib/promo');
      const config = getPromoConfig();
      
      expect(config.isActive).toBe(false);
    });
  });

  describe('isFreeSignupPromoActive', () => {
    it('should return false when promo is not active', async () => {
      delete process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP;
      
      const { isFreeSignupPromoActive } = await import('@/lib/promo');
      
      expect(isFreeSignupPromoActive()).toBe(false);
    });

    it('should return true when promo is active', async () => {
      process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP = 'true';
      
      const { isFreeSignupPromoActive } = await import('@/lib/promo');
      
      expect(isFreeSignupPromoActive()).toBe(true);
    });
  });

  describe('getPriceDisplay', () => {
    it('should return normal price when promo is not active', async () => {
      delete process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP;
      
      const { getPriceDisplay } = await import('@/lib/promo');
      const display = getPriceDisplay();
      
      expect(display.price).toBe('£25/year');
      expect(display.wasPrice).toBeNull();
      expect(display.isFree).toBe(false);
    });

    it('should return FREE with was price when promo is active', async () => {
      process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP = 'true';
      
      const { getPriceDisplay } = await import('@/lib/promo');
      const display = getPriceDisplay();
      
      expect(display.price).toBe('FREE');
      expect(display.wasPrice).toBe('£25/year');
      expect(display.isFree).toBe(true);
    });
  });

  describe('getSignupCtaText', () => {
    it('should return normal CTA when promo is not active', async () => {
      delete process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP;
      
      const { getSignupCtaText } = await import('@/lib/promo');
      
      expect(getSignupCtaText()).toBe('List Your Studio - £25/year');
    });

    it('should return promo CTA when promo is active', async () => {
      process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP = 'true';
      
      const { getSignupCtaText } = await import('@/lib/promo');
      
      expect(getSignupCtaText()).toBe('Join free today');
    });
  });

  describe('getMembershipButtonText', () => {
    it('should return payment button text when promo is not active', async () => {
      delete process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP;
      
      const { getMembershipButtonText } = await import('@/lib/promo');
      
      expect(getMembershipButtonText()).toBe('Continue to payment');
    });

    it('should return free account button text when promo is active', async () => {
      process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP = 'true';
      
      const { getMembershipButtonText } = await import('@/lib/promo');
      
      expect(getMembershipButtonText()).toBe('Create free account');
    });
  });
});
