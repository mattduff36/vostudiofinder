/**
 * Authentication Utilities
 * 
 * Helper functions for working with NextAuth session data safely,
 * user creation, password hashing, and authorization.
 */

import bcrypt from 'bcryptjs';
import { db } from './db';
import { Role } from '@prisma/client';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a unique username from email
 */
export function generateUsername(email: string): string {
  const baseUsername = email.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '') || '';
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseUsername}${randomSuffix}`.toLowerCase();
}

/**
 * Create a new user with hashed password
 * @param data - User data
 * @param tx - Optional transaction client for atomic operations
 */
export async function createUser(
  data: {
    email: string;
    password: string;
    display_name: string;
    username?: string;
    role?: Role;
  },
  tx?: any
) {
  const hashedPassword = await hashPassword(data.password);
  const username = data.username || await generateUniqueUsername(data.email, tx);

  const { randomBytes } = await import('crypto');
  const client = tx || db;
  
  return client.users.create({
    data: {
      id: randomBytes(12).toString('base64url'),
      email: data.email,
      password: hashedPassword,
      username,
      display_name: data.display_name,
      role: data.role || Role.USER,
      email_verified: false,
      updated_at: new Date(),
    },
  });
}

/**
 * Generate a unique username (check database for conflicts)
 * @param email - Email to generate username from
 * @param tx - Optional transaction client
 */
async function generateUniqueUsername(email: string, tx?: any): Promise<string> {
  let username = generateUsername(email);
  let attempts = 0;
  const maxAttempts = 10;
  const client = tx || db;

  while (attempts < maxAttempts) {
    const existingUser = await client.users.findUnique({
      where: { username },
    });

    if (!existingUser) {
      return username;
    }

    // Add random suffix if username exists
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    username = `${generateUsername(email)}${randomSuffix}`;
    attempts++;
  }

  // If we still can't find a unique username, use timestamp
  return `${generateUsername(email)}${Date.now()}`;
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    [Role.USER]: 1,
    [Role.ADMIN]: 2,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can access resource
 */
export function canAccessResource(
  userRole: Role,
  resourceOwnerId: string,
  _user_id: string
): boolean {
  // Admin can access everything
  if (userRole === Role.ADMIN) {
    return true;
  }

  // User can access their own resources
  if (resourceOwnerId === _user_id) {
    return true;
  }

  return false;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a secure random reset token
 * @returns A URL-safe token string
 */
export async function generateResetToken(): Promise<string> {
  const { randomBytes } = await import('crypto');
  return randomBytes(32).toString('base64url');
}

/**
 * Verify if reset token is still valid
 * @param expiry - The token expiry timestamp
 * @returns true if token is still valid
 */
export function isResetTokenValid(expiry: Date | null): boolean {
  if (!expiry) return false;
  return expiry.getTime() > Date.now();
}

// ============================================================================
// Session Display Utilities (Mobile-Safe)
// ============================================================================

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
  
  if (words.length >= 2 && words[0] && words[0].length > 0 && words[1] && words[1].length > 0) {
    return (words[0][0]! + words[1][0]!).toUpperCase();
  }
  
  if (words.length === 1 && words[0] && words[0].length >= 2) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  if (words.length === 1 && words[0] && words[0].length === 1) {
    return (words[0][0]! + words[0][0]!).toUpperCase();
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
