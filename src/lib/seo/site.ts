/**
 * Single source of truth for site-wide SEO constants
 * Used across metadata, structured data, and UI branding
 */

/**
 * Get the canonical base URL for the site
 * Uses environment variable with fallback to production domain
 */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://voiceoverstudiofinder.com';
}

/**
 * Primary site name (with spaces) - preferred for SEO and branding
 */
export const SITE_NAME = 'Voiceover Studio Finder';

/**
 * Alternate site name (no spaces) - for backwards compatibility
 */
export const SITE_NAME_ALT = 'VoiceoverStudioFinder';

/**
 * Site tagline/description
 */
export const SITE_TAGLINE = 'Professional voiceover, podcast & recording studios worldwide';

/**
 * Full site description
 */
export const SITE_DESCRIPTION = 'Connect with professional voiceover recording studios worldwide. Find the perfect studio for your next project with advanced search and location features.';

/**
 * Site keywords
 */
export const SITE_KEYWORDS = 'voiceover, recording studio, audio production, voice talent, studio rental, ISDN, Source Connect';

/**
 * Support email
 */
export const SUPPORT_EMAIL = 'support@voiceoverstudiofinder.com';

/**
 * Twitter/X handle
 */
export const TWITTER_HANDLE = '@VOStudioFinder';

