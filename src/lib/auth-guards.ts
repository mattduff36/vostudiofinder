import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';
import { db } from './db';
import { Role } from '@prisma/client';

/**
 * Server-side authentication guard
 */
export async function requireAuth(callbackUrl?: string) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    const redirectUrl = callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : '';
    redirect(`/auth/signin${redirectUrl}`);
  }
  
  return session;
}

/**
 * Server-side role-based authorization guard
 */
export async function requireRole(
  requiredRole: Role,
  callbackUrl?: string
) {
  const session = await requireAuth(callbackUrl);
  
  if (!hasRequiredRole(session.user.role, requiredRole)) {
    // Redirect to dashboard instead of unauthorized page
    redirect('/dashboard');
  }
  
  return session;
}

/**
 * Check if user has required role (including hierarchy)
 */
function hasRequiredRole(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    [Role.USER]: 1,
    [Role.ADMIN]: 2,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Server-side resource ownership guard
 */
export async function requireResourceOwnership(
  resourceOwnerId: string,
  callbackUrl?: string
) {
  const session = await requireAuth(callbackUrl);
  
  // Admin can access all resources
  if (session.user.role === Role.ADMIN) {
    return session;
  }
  
  // User must own the resource
  if (session.user.id !== resourceOwnerId) {
    redirect('/unauthorized');
  }
  
  return session;
}

/**
 * API route authentication guard
 */
export async function requireApiAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  return session;
}

/**
 * API route role-based authorization guard
 */
export async function requireApiRole(requiredRole: Role) {
  const session = await requireApiAuth();
  
  if (!hasRequiredRole(session.user.role, requiredRole)) {
    throw new Error('Insufficient permissions');
  }
  
  return session;
}

/**
 * API route resource ownership guard
 */
export async function requireApiResourceOwnership(resourceOwnerId: string) {
  const session = await requireApiAuth();
  
  // Admin can access all resources
  if (session.user.role === Role.ADMIN) {
    return session;
  }
  
  // User must own the resource
  if (session.user.id !== resourceOwnerId) {
    throw new Error('Insufficient permissions');
  }
  
  return session;
}

/**
 * Server-side email verification guard
 * Ensures user has verified their email before accessing protected routes
 */
export async function requireEmailVerification(userId?: string, email?: string) {
  // If userId provided, look up user by ID
  // If email provided, look up user by email
  // This allows flexibility for different contexts
  
  if (!userId && !email) {
    console.error('[ERROR] requireEmailVerification called without userId or email');
    redirect('/auth/signup');
  }

  try {
    const user = await db.users.findUnique({
      where: userId ? { id: userId } : { email: email!.toLowerCase() },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        email_verified: true,
      },
    });

    if (!user) {
      console.error('[ERROR] User not found for verification check');
      redirect('/auth/signup');
    }

    if (!user.email_verified) {
      console.warn(`[WARNING] User ${user.email} attempted to access protected route without verification`);
      redirect(`/auth/verify-email?email=${encodeURIComponent(user.email)}&flow=signup`);
    }

    console.log(`✅ Email verification confirmed for user: ${user.email}`);
    return user;
  } catch (error) {
    console.error('❌ Error checking email verification:', error);
    redirect('/auth/signup');
  }
}

/**
 * Client-side hook for checking authentication status
 */
export function useAuthGuard() {
  // This would be implemented as a React hook
  // For now, just export the function signature
  return {
    isAuthenticated: false,
    isLoading: true,
    user: null,
  };
}
