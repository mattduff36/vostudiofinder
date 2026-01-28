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
  
  if (!hasSpaces(display_name)) {
    // No spaces - use display name directly as first suggestion
    suggestions.push(sanitized);
  } else {
    // Has spaces - generate CamelCase and Snake_Case
    const camelCase = toCamelCase(display_name);
    const snakeCase = toSnakeCase(display_name);
    
    if (camelCase) suggestions.push(camelCase);
    if (snakeCase && snakeCase !== camelCase) suggestions.push(snakeCase);
  }
  
  return suggestions.filter(s => s.length >= 3 && s.length <= 20);
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

