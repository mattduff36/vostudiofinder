/**
 * Promo Configuration
 * 
 * Controls the FREE signup promotion. This module provides a centralized
 * way to manage the promo state across the entire application.
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_PROMO_FREE_SIGNUP: "true" | "false" - Enable/disable the promo
 * - NEXT_PUBLIC_PROMO_END_DATE: ISO date string (optional) - When the promo ends
 * 
 * Usage:
 * - Server components: import { getPromoConfig } from '@/lib/promo'
 * - Client components: import { usePromo } from '@/lib/promo'
 */

// Promo configuration interface
export interface PromoConfig {
  isActive: boolean;
  endDate: Date | null;
  message: string;
  normalPrice: string;
  promoPrice: string;
  ctaText: string;
  badgeText: string;
}

// Default promo messages
const PROMO_MESSAGE = 'FREE membership for a limited time';
const NORMAL_PRICE = '£25/year';
const PROMO_PRICE = 'FREE';
const CTA_TEXT = 'Join free today';
const BADGE_TEXT = 'Limited time';

/**
 * Get promo configuration (works on server and client)
 * Uses NEXT_PUBLIC_ prefix so values are available on both sides
 */
export function getPromoConfig(): PromoConfig {
  const isPromoEnabled = process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP === 'true';
  const endDateStr = process.env.NEXT_PUBLIC_PROMO_END_DATE;
  
  let endDate: Date | null = null;
  let isWithinDateRange = true;
  
  if (endDateStr) {
    try {
      endDate = new Date(endDateStr);
      // Check if current date is before end date
      isWithinDateRange = new Date() < endDate;
    } catch {
      console.warn('[Promo] Invalid NEXT_PUBLIC_PROMO_END_DATE format');
    }
  }
  
  const isActive = isPromoEnabled && isWithinDateRange;
  
  return {
    isActive,
    endDate,
    message: PROMO_MESSAGE,
    normalPrice: NORMAL_PRICE,
    promoPrice: PROMO_PRICE,
    ctaText: CTA_TEXT,
    badgeText: BADGE_TEXT,
  };
}

/**
 * Check if the free signup promo is currently active
 */
export function isFreeSignupPromoActive(): boolean {
  return getPromoConfig().isActive;
}

/**
 * Get the promo end date if set
 */
export function getPromoEndDate(): Date | null {
  return getPromoConfig().endDate;
}

/**
 * Format the promo end date for display
 */
export function formatPromoEndDate(): string | null {
  const endDate = getPromoEndDate();
  if (!endDate) return null;
  
  return endDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Get the appropriate price display based on promo status
 */
export function getPriceDisplay(): { price: string; wasPrice: string | null; isFree: boolean } {
  const config = getPromoConfig();
  
  if (config.isActive) {
    return {
      price: config.promoPrice,
      wasPrice: config.normalPrice,
      isFree: true,
    };
  }
  
  return {
    price: config.normalPrice,
    wasPrice: null,
    isFree: false,
  };
}

/**
 * Get the signup CTA text based on promo status
 */
export function getSignupCtaText(): string {
  const config = getPromoConfig();
  return config.isActive ? config.ctaText : `List Your Studio - ${config.normalPrice}`;
}

/**
 * Get the button text for membership payment
 */
export function getMembershipButtonText(): string {
  const config = getPromoConfig();
  return config.isActive ? 'Create free account' : 'Continue to payment';
}
