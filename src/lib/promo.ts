/**
 * Promo Configuration
 * 
 * Controls the FREE signup promotion. This module provides a centralized
 * way to manage the promo state across the entire application.
 * 
 * Configuration Sources (in order of precedence):
 * 1. Database setting (admin_sticky_notes with key 'promo_free_signup_active')
 * 2. Environment variable NEXT_PUBLIC_PROMO_FREE_SIGNUP
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_PROMO_FREE_SIGNUP: "true" | "false" - Enable/disable the promo
 * - NEXT_PUBLIC_PROMO_END_DATE: ISO date string (optional) - When the promo ends
 * 
 * Usage:
 * - Server components: import { getPromoConfig, getPromoStateFromDb } from '@/lib/promo'
 * - Client components: import { getPromoConfig } from '@/lib/promo' (or use props from parent)
 * - Admin toggle: Uses /api/admin/promo-settings endpoint
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

// Database key for promo setting
export const PROMO_SETTING_KEY = 'promo_free_signup_active';

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

/**
 * Get promo state from database (SERVER-SIDE ONLY)
 * This function must be called from a server component or API route
 * 
 * Returns the database-stored promo state, falling back to env if not set
 */
export async function getPromoStateFromDb(): Promise<boolean> {
  // Dynamic import to avoid bundling db in client components
  const { db } = await import('@/lib/db');
  
  try {
    const setting = await db.admin_sticky_notes.findUnique({
      where: { key: PROMO_SETTING_KEY },
    });

    if (setting) {
      // Database setting takes precedence
      const isActive = setting.content === 'true';
      
      // Still check end date if set
      const endDateStr = process.env.NEXT_PUBLIC_PROMO_END_DATE;
      if (endDateStr && isActive) {
        try {
          const endDate = new Date(endDateStr);
          if (new Date() >= endDate) {
            return false; // Promo ended
          }
        } catch {
          // Invalid date, ignore
        }
      }
      
      return isActive;
    }
  } catch (error) {
    console.warn('[Promo] Error fetching from database, falling back to env:', error);
  }

  // Fall back to env variable
  return isFreeSignupPromoActive();
}

/**
 * Get full promo config from database (SERVER-SIDE ONLY)
 * Use this in server components for the most accurate promo state
 */
export async function getPromoConfigFromDb(): Promise<PromoConfig> {
  const isActive = await getPromoStateFromDb();
  const endDateStr = process.env.NEXT_PUBLIC_PROMO_END_DATE;
  
  let endDate: Date | null = null;
  if (endDateStr) {
    try {
      endDate = new Date(endDateStr);
    } catch {
      // Invalid date
    }
  }
  
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
