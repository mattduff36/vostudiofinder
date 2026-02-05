import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { randomBytes } from 'crypto';
import { authOptions } from './auth';
import { db } from './db';
import { Role, UserStatus } from '@prisma/client';
import { sendVerificationEmail } from '@/lib/email/email-service';
import { getBaseUrl } from '@/lib/seo/site';

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
 * Server-side guard: require active account for member areas.
 * Handles both Basic (free) and Premium (paid) membership tiers.
 */
export async function requireActiveAccount(callbackUrl?: string) {
  const session = await requireAuth(callbackUrl);

  const user = await db.users.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      display_name: true,
      username: true,
      role: true,
      email_verified: true,
      verification_token: true,
      verification_token_expiry: true,
      status: true,
      membership_tier: true,
      payment_attempted_at: true,
    },
  });

  if (!user) {
    redirect('/auth/signin');
  }

  if (user.role === Role.ADMIN) {
    return session;
  }

  if (!user.email_verified) {
    const safeCallback =
      callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
        ? callbackUrl
        : '/dashboard';

    const postVerifyRedirect = `/auth/signin?callbackUrl=${encodeURIComponent(safeCallback)}`;

    // Safety net: if there's no token (or it's expired), generate one and send email
    // so users can't get trapped in a "verify" loop with no way to actually verify.
    const tokenExpired =
      user.verification_token_expiry ? user.verification_token_expiry < new Date() : true;
    const missingOrExpiredToken = !user.verification_token || tokenExpired;

    if (missingOrExpiredToken) {
      const verificationToken = randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db.users.update({
        where: { id: user.id },
        data: {
          verification_token: verificationToken,
          verification_token_expiry: verificationTokenExpiry,
          updated_at: new Date(),
        },
      });

      // Extract host info from Next.js headers for correct base URL
      const headersList = await headers();
      const host = headersList.get('host');
      const protocol = headersList.get('x-forwarded-proto') || 'https';
      
      // Create a mock Request object for getBaseUrl if we have host info
      let baseUrl: string;
      if (host) {
        const mockRequest = new Request(`${protocol}://${host}`, {
          headers: new Headers({
            'host': host,
            'x-forwarded-proto': protocol,
          }),
        });
        baseUrl = getBaseUrl(mockRequest);
      } else {
        // Fallback to environment-based URL
        baseUrl = getBaseUrl();
      }

      const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}&redirect=${encodeURIComponent(postVerifyRedirect)}`;

      // Best-effort; even if email fails, we still redirect to the verify page
      try {
        await sendVerificationEmail(user.email, user.display_name, verificationUrl);
      } catch (e) {
        console.warn('[WARNING] Failed to auto-send verification email:', e);
      }
    }

    redirect(
      `/auth/verify-email?email=${encodeURIComponent(user.email)}&flow=account&redirect=${encodeURIComponent(postVerifyRedirect)}`
    );
  }

  if (user.status === UserStatus.ACTIVE) {
    return session;
  }

  if (user.status === UserStatus.EXPIRED) {
    redirect('/auth/signup?error=reservation_expired');
  }

  // --- Safety-net activation for non-ACTIVE users ---
  // At this point the user is PENDING (email verified, but not yet activated).

  // Basic (free) tier: activate without payment if they completed the Basic signup flow.
  // `payment_attempted_at` is set by /api/auth/complete-basic-signup as evidence
  // the user explicitly chose the Basic tier (distinguishes from a brand-new
  // registrant who also defaults to BASIC but never finished the signup flow).
  if (user.membership_tier === 'BASIC' && user.payment_attempted_at) {
    console.log(`[AUTH-GUARD] Activating BASIC user ${user.id} (payment_attempted_at set, no payment required)`);
    await db.users.update({
      where: { id: user.id },
      data: {
        status: UserStatus.ACTIVE,
        updated_at: new Date(),
      },
    });
    return session;
  }

  // Premium tier: check for a successful payment record
  const payment = await db.payments.findFirst({
    where: { user_id: user.id, status: 'SUCCEEDED' },
    orderBy: { created_at: 'desc' },
  });

  if (!payment) {
    const paymentParams = new URLSearchParams();
    paymentParams.set('userId', user.id);
    paymentParams.set('email', user.email);
    paymentParams.set('name', user.display_name);
    if (user.username && !user.username.startsWith('temp_')) {
      paymentParams.set('username', user.username);
    }
    redirect(`/auth/membership?${paymentParams.toString()}`);
  }

  // Payment found but user not yet ACTIVE – activate as Premium
  await db.users.update({
    where: { id: user.id },
    data: {
      status: UserStatus.ACTIVE,
      membership_tier: 'PREMIUM', // Users who paid are Premium
      updated_at: new Date(),
    },
  });

  const existingSubscription = await db.subscriptions.findFirst({
    where: { user_id: user.id, status: 'ACTIVE' },
  });

  if (!existingSubscription) {
    const now = new Date();
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    await db.subscriptions.create({
      data: {
        id: randomBytes(12).toString('base64url'),
        user_id: user.id,
        status: 'ACTIVE',
        payment_method: 'STRIPE',
        current_period_start: now,
        current_period_end: oneYearFromNow,
        created_at: now,
        updated_at: now,
      },
    });
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

    console.log(`[SUCCESS] Email verification confirmed for user: ${user.email}`);
    return user;
  } catch (error) {
    console.error('[ERROR] Error checking email verification:', error);
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
