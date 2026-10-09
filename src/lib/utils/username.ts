/**
 * Username generation utilities
 */

/**
 * Reserved usernames that cannot be used (matches Next.js routes and system pages)
 * These are top-level routes that would conflict with the [username] dynamic route
 */
export const RESERVED_USERNAMES = [
  // Core pages
  'about',
  'admin',
  'api',
  'auth',
  'blog',
  'dashboard',
  'help',
  'privacy',
  'register',
  'studios',
  'terms',
  'unauthorized',
  'upgrade',
  
  // Auth flows
  'signin',
  'signup',
  'login',
  'logout',
  'verify',
  'reset',
  'forgot',
  'callback',
  'membership',
  
  // Membership pages
  'featured',
  'premium',
  'featured-studio',
  'join-waitlist',
  'waitlist',
  
  // Email management
  'email',
  'unsubscribe',
  
  // Account management
  'settings',
  'profile',
  'account',
  'user',
  
  // System pages
  'error',
  'not-found',
  'notfound',
  'loading',
  
  // Static assets
  'favicon',
  'robots',
  'sitemap',
  'public',
  'static',
  '_next',
  'assets',
  
  // Common system words to prevent confusion
  'admin-panel',
  'administrator',
  'root',
  'system',
  'moderator',
  'support',
  'contact',
  'vostudiofinder',
  'vsf',
  
  // Protected words that might cause issues
  'null',
  'undefined',
  'true',
  'false',
  'delete',
  'edit',
  'create',
  'update',
  'new',
] as const;

/**
 * Check if a username is reserved (case-insensitive)
 */
export function isReservedUsername(username: string): boolean {
  const lowerUsername = username.toLowerCase();
  return RESERVED_USERNAMES.includes(lowerUsername as any);
}

/** System placeholders created before a person chooses a public username. */
export function isSystemUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  const lower = username.toLowerCase();
  return lower.startsWith('temp_') || lower.startsWith('expired_');
}

export type UsernameIssue = 'empty' | 'format' | 'reserved' | 'system';

export type UsernameValidation =
  | { ok: true; username: string }
  | { ok: false; issue: UsernameIssue; message: string };

/**
 * A real public username: 3-20 ASCII letters, digits, or underscores,
 * not a reserved route, and not a system temp_/expired_ placeholder.
 * Display names are a separate field and may contain hyphens.
 */
export function validateUsername(username: unknown): UsernameValidation {
  if (typeof username !== 'string' || username.trim() === '') {
    return { ok: false, issue: 'empty', message: 'Username is required' };
  }

  const value = username.trim();

  if (isSystemUsername(value)) {
    return {
      ok: false,
      issue: 'system',
      message: 'This username is reserved and cannot be used',
    };
  }

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
    return {
      ok: false,
      issue: 'format',
      message: 'Username must be 3-20 characters (letters, numbers, underscores only)',
    };
  }

  if (isReservedUsername(value)) {
    return {
      ok: false,
      issue: 'reserved',
      message: 'This username is reserved and cannot be used',
    };
  }

  return { ok: true, username: value };
}

/** True only for a persisted username that may be used as a public profile slug. */
export function isCanonicalUsername(username: string | null | undefined): username is string {
  return typeof username === 'string' && username === username.trim() && validateUsername(username).ok;
}

/**
 * Convert display name to CamelCase (e.g., "Smith Studios" -> "SmithStudios")
 */
export function toCamelCase(display_name: string): string {
  // First remove all special characters except spaces, underscores, and hyphens
  const cleaned = display_name.replace(/[^a-zA-Z0-9\s_-]/g, '');
  return cleaned
    .split(/[\s_-]+/)
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert display name to Snake_Case (e.g., "Smith Studios" -> "Smith_Studios")
 */
export function toSnakeCase(display_name: string): string {
  // First remove all special characters except spaces and hyphens
  const cleaned = display_name.replace(/[^a-zA-Z0-9\s-]/g, '');
  return cleaned
    .split(/[\s-]+/)
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('_');
}

/**
 * Clean and sanitize username
 */
export function sanitizeUsername(username: string): string {
  return username
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Check if display name has spaces
 */
export function hasSpaces(display_name: string): boolean {
  return /\s/.test(display_name);
}

/**
 * Generate username suggestions from display name
 * Returns an array of suggestions in priority order
 */
export function generateUsernameSuggestions(display_name: string): string[] {
  const suggestions: string[] = [];
  const sanitized = sanitizeUsername(display_name);
  const hasSeparator = /[\s_-]/.test(display_name);

  const pushCandidate = (value: string) => {
    const clipped = value.slice(0, 20);
    if (clipped && !suggestions.includes(clipped)) {
      suggestions.push(clipped);
    }
  };

  if (!hasSeparator) {
    if (sanitized) pushCandidate(sanitized);
  } else {
    // Hyphens stay in the display name. They are only word separators here.
    const camelCase = toCamelCase(display_name);
    const snakeCase = toSnakeCase(display_name);
    if (camelCase) pushCandidate(camelCase);
    if (snakeCase && snakeCase !== camelCase) pushCandidate(snakeCase);
    if (sanitized) pushCandidate(sanitized);
  }

  return suggestions.filter((suggestion) => isCanonicalUsername(suggestion));
}

/**
 * Add numbered suffix to username
 */
export function addNumberSuffix(username: string, number: number): string {
  return `${username}${number}`;
}

/**
 * Validate username format and check for reserved names
 * @param username - The username to validate
 * @param checkReserved - Whether to check against reserved usernames (default: true)
 */
export function isValidUsername(username: string, checkReserved: boolean = true): boolean {
  if (isSystemUsername(username)) {
    return false;
  }

  // Must be 3-20 characters, alphanumeric and underscores only
  const regex = /^[a-zA-Z0-9_]{3,20}$/;
  
  if (!regex.test(username)) {
    return false;
  }
  
  // Check against reserved usernames if enabled
  if (checkReserved && isReservedUsername(username)) {
    return false;
  }
  
  return true;
}

