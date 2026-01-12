import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    // Calculate 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Delete old OPEN error log groups (keep RESOLVED/IGNORED for separate retention policy below)
    const deletedGroups = await db.error_log_groups.deleteMany({
      where: {
        status: 'OPEN',
        last_seen_at: {
          lt: ninetyDaysAgo,
        },
      },
    });

    console.log(`✅ [ERROR_LOG_CLEANUP] Deleted ${deletedGroups.count} old OPEN error log groups (90+ days)`);

    // Also clean up resolved/ignored issues older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedResolved = await db.error_log_groups.deleteMany({
      where: {
        status: {
          in: ['RESOLVED', 'IGNORED'],
        },
        updated_at: {
          lt: thirtyDaysAgo,
        },
      },
    });

    console.log(`✅ [ERROR_LOG_CLEANUP] Deleted ${deletedResolved.count} resolved/ignored error logs (30+ days)`);

    return NextResponse.json({
      success: true,
      deletedOld: deletedGroups.count,
      deletedResolved: deletedResolved.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [ERROR_LOG_CLEANUP] Cleanup job failed:', error);
    return NextResponse.json(
      {
        error: 'Cleanup job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
