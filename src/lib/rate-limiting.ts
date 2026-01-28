/**
 * Rate Limiting Utilities
 * 
 * Lightweight Postgres-backed rate limiting for bot protection
 */

import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Extract IP address from request headers
 * Prioritizes Cloudflare, then common proxy headers
 */
export function extractIpAddress(request: NextRequest): string {
  // Priority order: Cloudflare → X-Forwarded-For → X-Real-IP → fallback
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;

  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // X-Forwarded-For can be comma-separated, take first (client IP)
    return xForwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp;

  // Fallback (shouldn't happen on Vercel/Cloudflare)
  return 'unknown';
}

/**
 * Generate fingerprint for rate limiting
 * Uses IP when available, falls back to email+UA hash
 */
export function generateFingerprint(
  request: NextRequest,
  email?: string
): string {
  const ip = extractIpAddress(request);
  
  // If IP is available and not 'unknown', use it
  if (ip !== 'unknown') {
    return `ip:${ip}`;
  }

  // Fallback: hash email + user-agent
  const ua = request.headers.get('user-agent') || 'unknown';
  const emailPart = email || 'anonymous';
  const hash = crypto
    .createHash('sha256')
    .update(`${emailPart}:${ua}`)
    .digest('hex')
    .substring(0, 16);
  
  return `hash:${hash}`;
}

interface RateLimitConfig {
  endpoint: string;
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check rate limit for an endpoint
 * Returns whether request is allowed and remaining quota
 */
export async function checkRateLimit(
  fingerprint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  // Find or create rate limit record
  const existing = await db.rate_limit_events.findUnique({
    where: {
      fingerprint_endpoint: {
        fingerprint,
        endpoint: config.endpoint,
      },
    },
  });

  if (!existing) {
    // First request - create record
    await db.rate_limit_events.create({
      data: {
        fingerprint,
        endpoint: config.endpoint,
        event_count: 1,
        window_start: now,
        last_event_at: now,
      },
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now.getTime() + config.windowMs),
    };
  }

  // Check if window has expired
  if (existing.window_start < windowStart) {
    // Window expired - reset counter
    await db.rate_limit_events.update({
      where: {
        fingerprint_endpoint: {
          fingerprint,
          endpoint: config.endpoint,
        },
      },
      data: {
        event_count: 1,
        window_start: now,
        last_event_at: now,
      },
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now.getTime() + config.windowMs),
    };
  }

  // Window still active - check if limit exceeded
  if (existing.event_count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(existing.window_start.getTime() + config.windowMs),
    };
  }

  // Increment counter
  await db.rate_limit_events.update({
    where: {
      fingerprint_endpoint: {
        fingerprint,
        endpoint: config.endpoint,
      },
    },
    data: {
      event_count: {
        increment: 1,
      },
      last_event_at: now,
    },
  });

  return {
    allowed: true,
    remaining: config.maxRequests - existing.event_count - 1,
    resetAt: new Date(existing.window_start.getTime() + config.windowMs),
  };
}

/**
 * Predefined rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Signup: max 3 attempts per hour per IP
  SIGNUP: {
    endpoint: 'signup',
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  },
  // Username check: max 20 per minute per IP (allows rapid checking)
  CHECK_USERNAME: {
    endpoint: 'check-username',
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  },
  // Username reservation: max 5 per hour per IP
  RESERVE_USERNAME: {
    endpoint: 'reserve-username',
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
  },
} as const;

/**
 * Cleanup old rate limit records (run periodically via cron)
 * Deletes records older than 24 hours
 */
export async function cleanupOldRateLimits(): Promise<number> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const result = await db.rate_limit_events.deleteMany({
    where: {
      last_event_at: {
        lt: yesterday,
      },
    },
  });

  return result.count;
}
