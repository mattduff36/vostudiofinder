import { NextRequest, NextResponse } from 'next/server';
import { cleanupErrorLogs } from '@/lib/admin/error-log/triage';

/**
 * Cron Job: Cleanup Old Error Logs
 * 
 * Runs: Daily at 03:00 UTC
 * Purpose: Delete error log groups older than 90 days to maintain database size
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-error-logs",
 *     "schedule": "0 3 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('❌ [ERROR_LOG_CLEANUP] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ [ERROR_LOG_CLEANUP] Unauthorized cron attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🗑️  [ERROR_LOG_CLEANUP] Starting error log cleanup...');

    const counts = await cleanupErrorLogs();

    return NextResponse.json({
      success: true,
      ...counts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [ERROR_LOG_CLEANUP] Cleanup job failed:', error);
    return NextResponse.json(
      {
        error: 'Cleanup job failed',
      },
      { status: 500 }
    );
  }
}
