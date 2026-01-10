/**
 * Single source of truth for site-wide SEO constants
 * Used across metadata, structured data, and UI branding
 */

/**
 * Get the canonical base URL for the site
 * Uses environment variable with fallback to production domain
 * 
 * @param request - Optional NextRequest to extract URL from headers (for API routes)
 * @returns The base URL for the current deployment
 */
export function getBaseUrl(request?: Request): string {
  // 1. If request is provided, extract URL from headers (most accurate for preview deployments)
  if (request) {
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    if (host) {
      return `${protocol}://${host}`;
    }
  }

  // 2. Check for Vercel URL (automatically provided by Vercel for all deployments)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 3. Check for explicit NEXT_PUBLIC_BASE_URL (user-configured override)
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  // 4. Fallback to production domain
  return 'https://voiceoverstudiofinder.com';
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

