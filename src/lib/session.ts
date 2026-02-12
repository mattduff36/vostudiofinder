import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { db } from './db';

/**
 * Enhanced session management utilities
 */

export async function getEnhancedSession() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  // Fetch additional user data that might not be in the JWT
  const userData = await db.users.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      avatar_url: true,
      role: true,
      email_verified: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!userData) {
    return null;
  }

  return {
    ...session,
    user: {
      ...session.user,
      ...userData,
    },
  };
}

/**
 * Session validation with database sync
 */
export async function validateSession(sessionUserId: string) {
  try {
    const user = await db.users.findUnique({
      where: { id: sessionUserId },
      select: {
        id: true,
        email: true,
        role: true,
        email_verified: true,
      },
    });

    return {
      isValid: !!user,
      user,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return {
      isValid: false,
      user: null,
    };
  }
}

/**
 * Session activity logging
 */
export async function logSessionActivity(
  user_id: string,
  activity: string,
  metadata?: Record<string, any>
) {
  try {
    // In a production app, you might want to store session logs
    // For now, we'll just log to console
    console.log('Session Activity:', {
      user_id,
      activity,
      metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log session activity:', error);
  }
}

/**
 * Security headers configuration
 */
export const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://js.stripe.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    connect-src 'self' https://api.stripe.com https://maps.googleapis.com;
    frame-src https://js.stripe.com https://hooks.stripe.com;
  `.replace(/\s+/g, ' ').trim(),
};

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(headers: Headers) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
}


