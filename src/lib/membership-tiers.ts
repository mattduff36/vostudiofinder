/**
 * Membership Tier Configuration
 *
 * Authoritative source of truth for Basic vs Premium feature limits.
 * Import this wherever you need to check or enforce tier restrictions.
 */

export type MembershipTier = 'BASIC' | 'PREMIUM';

/** Per-tier limits and entitlements */
export interface TierLimits {
  aboutMaxChars: number;
  imagesMax: number;
  studioTypesMax: number | null; // null = unlimited
  studioTypesExcluded: string[]; // enum values not allowed
  connectionsMax: number;
  customConnectionsMax: number;
  socialLinksMax: number | null; // null = unlimited
  phoneVisibility: boolean;
  directionsVisibility: boolean;
  advancedSettings: boolean; // custom meta title etc.
  aiAutoGenerate: boolean;
  verificationEligible: boolean;
  featuredEligible: boolean;
  avatarAllowed: boolean;
}

export const TIER_LIMITS: Record<MembershipTier, TierLimits> = {
  BASIC: {
    aboutMaxChars: 1000,
    imagesMax: 2,
    studioTypesMax: 1,
    studioTypesExcluded: ['VOICEOVER'],
    connectionsMax: 3,
    customConnectionsMax: 0,
    socialLinksMax: 2,
    phoneVisibility: false,
    directionsVisibility: false,
    advancedSettings: false,
    aiAutoGenerate: false,
    verificationEligible: false,
    featuredEligible: false,
    avatarAllowed: true,
  },
  PREMIUM: {
    aboutMaxChars: 2000,
    imagesMax: 5,
    studioTypesMax: null, // unlimited
    studioTypesExcluded: [],
    connectionsMax: 12, // all standard connection slots
    customConnectionsMax: 2,
    socialLinksMax: null, // unlimited
    phoneVisibility: true,
    directionsVisibility: true,
    advancedSettings: true,
    aiAutoGenerate: true,
    verificationEligible: true,
    featuredEligible: true,
    avatarAllowed: true,
  },
};

/** Price in pence for the Premium annual membership */
export const PREMIUM_PRICE_PENCE = 2500; // £25.00

/** Formatted display price */
export const PREMIUM_PRICE_DISPLAY = '£25';

/** Formatted price per year */
export const PREMIUM_PRICE_PER_YEAR = '£25/year';

/**
 * Get limits for a given tier.
 * Falls back to BASIC if tier is unknown.
 */
export function getTierLimits(tier: MembershipTier | string | null | undefined): TierLimits {
  if (tier === 'PREMIUM') return TIER_LIMITS.PREMIUM;
  return TIER_LIMITS.BASIC;
}

/**
 * Check if a tier is Premium.
 */
export function isPremiumTier(tier: MembershipTier | string | null | undefined): boolean {
  return tier === 'PREMIUM';
}

/**
 * Check if a specific feature is available for a tier.
 */
export function isTierFeatureAllowed(
  tier: MembershipTier | string | null | undefined,
  feature: keyof TierLimits
): boolean {
  const limits = getTierLimits(tier);
  const value = limits[feature];
  // For boolean features, return directly
  if (typeof value === 'boolean') return value;
  // For numeric limits, return true if > 0 or null (unlimited)
  if (value === null) return true;
  if (typeof value === 'number') return value > 0;
  // For array features (excluded types), return true if empty
  if (Array.isArray(value)) return value.length === 0;
  return false;
}
