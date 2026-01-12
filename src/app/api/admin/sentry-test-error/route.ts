import { NextRequest, NextResponse } from 'next/server';
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
export async function GET(request: NextRequest) {
  try {
    // Require admin role
    await requireApiRole(Role.ADMIN);

    // Capture a test exception in Sentry
    const testError = new Error('[TEST] Sentry webhook verification test - this is intentional');
    testError.name = 'SentryTestError';
    
    // Add custom context for this test error
    Sentry.setContext('test_info', {
      purpose: 'webhook_verification',
      triggered_by: 'admin',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
    });

    // Capture the exception
    const eventId = Sentry.captureException(testError, {
      level: 'error',
      tags: {
        test: 'true',
        purpose: 'webhook_verification',
      },
      fingerprint: ['sentry-test-error', new Date().toISOString()],
    });

    console.log('✅ [SENTRY_TEST] Test error captured:', {
      eventId,
      message: testError.message,
      timestamp: new Date().toISOString(),
    });

    // Also throw to generate a 500 error (optional - creates both handled and unhandled error)
    // Uncomment this line if you want to test unhandled errors too:
    // throw testError;

    return NextResponse.json(
      {
        success: true,
        message: 'Test error sent to Sentry successfully',
        eventId,
        instructions: [
          '1. Check Sentry dashboard for the test error',
          '2. Check Sentry webhook logs to see if webhook was delivered',
          '3. Check /admin/error-log to see if error appears there',
          '4. If all working, you can delete this endpoint',
        ],
        nextSteps: {
          sentryDashboard: 'Check for error with message: "[TEST] Sentry webhook verification test"',
          webhookLogs: 'Go to Sentry → Settings → Internal Integrations → Your Integration → Webhook Logs',
          errorLog: 'Visit /admin/error-log and look for the test error',
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ [SENTRY_TEST] Failed to trigger test error:', error);
    
    // This error will also be captured by Sentry
    return NextResponse.json(
      { error: 'Failed to trigger test error' },
      { status: 500 }
    );
  }
}
