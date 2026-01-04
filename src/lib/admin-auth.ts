import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { Role } from '@prisma/client';

/**
 * Check if the current user has admin privileges
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return session?.user?.role === Role.ADMIN;
}

/**
 * Check if the current user has admin privileges
 * (Deprecated: STUDIO_OWNER role removed, kept for backwards compatibility)
 */
export async function isAdminOrStudioOwner(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  return role === Role.ADMIN;
}

/**
 * Get the current user's role
 */
export async function getUserRole(): Promise<Role | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.role || null;
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(requiredRole: Role): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return session?.user?.role === requiredRole;
}

/**
 * Admin route protection helper
 * Throws an error if user is not an admin
 */
export async function requireAdmin(): Promise<void> {
  const isAdminUser = await isAdmin();
  if (!isAdminUser) {
    throw new Error('Admin access required');
  }
}

/**
 * Admin or Studio Owner route protection helper
 * Throws an error if user is not an admin or studio owner
 */
export async function requireAdminOrStudioOwner(): Promise<void> {
  const hasAccess = await isAdminOrStudioOwner();
  if (!hasAccess) {
    throw new Error('Admin or Studio Owner access required');
  }
}
