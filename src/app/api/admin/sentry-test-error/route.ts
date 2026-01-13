import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/auth-guards';
import { Role } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';

/**
 * Admin-only endpoint to trigger a test Sentry error
 * 
 * GET /api/admin/sentry-test-error
 * 
 * Purpose: Trigger a test error in production to verify:
 * - Sentry is capturing errors
 * - Webhooks are firing correctly
 * - Error log system is receiving and storing errors
 * 
 * Usage: Simply visit this URL while logged in as admin
 * 
 * ⚠️ This endpoint can be deleted after testing
 */
export async function GET(_request: NextRequest) {
  // Require admin role
  await requireApiRole(Role.ADMIN);

  // Add custom context for this test error
  Sentry.setContext('test_info', {
    purpose: 'webhook_verification',
    triggered_by: 'admin',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
  });

  console.log('🧪 [SENTRY_TEST] Throwing test error to Sentry...');

  // Just throw an error - Sentry will catch it automatically
  // This is the most reliable way to test Sentry integration
  throw new Error('[TEST] Sentry webhook verification test - this is intentional');
}
