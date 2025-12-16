/**
 * Authentication Utilities
 * 
 * Helper functions for working with NextAuth session data safely.
 */

/**
 * Get display name from user object with safe fallbacks
 * 
 * Handles various auth providers that may provide different fields:
 * - Custom auth: display_name
 * - OAuth providers: name
 * - Email: email address
 * 
 * @param user - NextAuth user object
 * @returns Display name string, never undefined
 * 
 * @example
 * import { getUserDisplayName } from '@/lib/auth-utils';
 * const name = getUserDisplayName(session.user);
 */
export function getUserDisplayName(user: any): string {
  // Try custom display_name field first
  if (user?.display_name) {
    return user.display_name;
  }
  
  // Fallback to OAuth 'name' field
  if (user?.name) {
    return user.name;
  }
  
  // Extract from email (before @)
  if (user?.email) {
    const emailName = user.email.split('@')[0];
    // Capitalize first letter
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }
  
  // Final fallback
  return 'User';
}

/**
 * Get user initials for avatar fallback
 * 
 * @param user - NextAuth user object
 * @returns Two-letter initials (e.g., "JD")
 * 
 * @example
 * const initials = getUserInitials(session.user);
 * // Returns "JD" for "John Doe"
 */
export function getUserInitials(user: any): string {
  const name = getUserDisplayName(user);
  
  const words = name.split(' ').filter(w => w.length > 0);
  
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  return 'U';
}

/**
 * Check if user has avatar image
 * 
 * @param user - NextAuth user object
 * @returns true if user has a valid avatar URL
 */
export function hasUserAvatar(user: any): boolean {
  return !!(user?.avatar_url || user?.image);
}

/**
 * Get user avatar URL with fallback
 * 
 * @param user - NextAuth user object
 * @returns Avatar URL or undefined
 */
export function getUserAvatarUrl(user: any): string | undefined {
  return user?.avatar_url || user?.image || undefined;
}
