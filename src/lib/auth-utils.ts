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
 */
export async function createUser(data: {
  email: string;
  password: string;
  display_name: string;
  username?: string;
  role?: Role;
}) {
  const hashedPassword = await hashPassword(data.password);
  const username = data.username || await generateUniqueUsername(data.email);

  return db.users.create({
    data: {
      email: data.email,
      password: hashedPassword,
      username,
      display_name: data.display_name,
      role: data.role || Role.USER,
      email_verified: false,
    },
  });
}

/**
 * Generate a unique username (check database for conflicts)
 */
async function generateUniqueUsername(email: string): Promise<string> {
  let username = generateUsername(email);
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existingUser = await db.users.findUnique({
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
    [Role.STUDIO_OWNER]: 2,
    [Role.ADMIN]: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can access resource
 */
export function canAccessResource(
  userRole: Role,
  resourceOwnerId: string,
  userId: string
): boolean {
  // Admin can access everything
  if (userRole === Role.ADMIN) {
    return true;
  }

  // User can access their own resources
  if (resourceOwnerId === userId) {
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

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate email verification token
 */
export function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

/**
 * Generate password reset token
 */
export function generateResetToken(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

