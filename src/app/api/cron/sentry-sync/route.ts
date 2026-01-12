import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

/**
 * Cron Job: Sync Sentry Issues
 * 
 * Runs: Every 5 minutes (or as configured in vercel.json)
 * Purpose: Sync error counts and metadata from Sentry API to keep Error Log fresh
 * 
 * Environment Variables Required:
 * - SENTRY_AUTH_TOKEN: Sentry API auth token
 * - SENTRY_ORG_SLUG: Your Sentry organization slug
 * - SENTRY_PROJECT_SLUG: Your Sentry project slug (or project ID)
 * - CRON_SECRET: Cron authentication secret
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('❌ [SENTRY_SYNC] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ [SENTRY_SYNC] Unauthorized cron attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check Sentry configuration
    const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
    const sentryOrgSlug = process.env.SENTRY_ORG_SLUG;
    const sentryProjectSlug = process.env.SENTRY_PROJECT_SLUG;

    if (!sentryAuthToken || !sentryOrgSlug || !sentryProjectSlug) {
      console.warn('⚠️  [SENTRY_SYNC] Sentry API not fully configured, skipping sync');
      return NextResponse.json({
        success: true,
        message: 'Sentry API not configured',
        synced: 0,
      });
    }

    console.log('🔄 [SENTRY_SYNC] Starting Sentry issue sync...');

    // Fetch ALL issues from Sentry API (resolved + unresolved + ignored)
    // This ensures we capture ALL errors, not just unresolved ones
    // Query for issues from the last 30 days to capture more history
    const query = 'is:unresolved OR is:resolved OR is:ignored';
    const sentryApiUrl = `https://sentry.io/api/0/projects/${sentryOrgSlug}/${sentryProjectSlug}/issues/?query=${encodeURIComponent(query)}&statsPeriod=30d`;

    const response = await fetch(sentryApiUrl, {
      headers: {
        'Authorization': `Bearer ${sentryAuthToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SENTRY_SYNC] Sentry API error:', response.status, errorText);
      return NextResponse.json(
        {
          error: 'Sentry API error',
          status: response.status,
          message: errorText,
        },
        { status: 500 }
      );
    }

    const issues = await response.json();
    console.log(`📊 [SENTRY_SYNC] Found ${issues.length} issues from Sentry`);

    let syncedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const issue of issues) {
      try {
        const sentryIssueId = String(issue.id);
        const title = issue.title || issue.culprit || 'Unknown error';
        const level = issue.level || 'error';
        const firstSeenAt = issue.firstSeen ? new Date(issue.firstSeen) : new Date();
        const lastSeenAt = issue.lastSeen ? new Date(issue.lastSeen) : new Date();
        const eventCount = issue.count || 1;
        const environment = issue.metadata?.environment || null;
        const release = issue.metadata?.release || null;

        // Determine status from Sentry issue state
        // Sentry uses: 'unresolved', 'resolved', 'ignored', 'muted'
        let status: 'OPEN' | 'RESOLVED' | 'IGNORED' = 'OPEN';
        if (issue.status === 'resolved') {
          status = 'RESOLVED';
        } else if (issue.status === 'ignored' || issue.status === 'muted') {
          status = 'IGNORED';
        } else {
          status = 'OPEN';
        }

        // Optionally fetch latest event for this issue (for top N issues only)
        // For now, we'll skip individual event fetching to reduce API calls
        // The webhook will provide sample events when they occur

        // Upsert the issue - sync status from Sentry
        await db.error_log_groups.upsert({
          where: { sentry_issue_id: sentryIssueId },
          create: {
            id: nanoid(),
            sentry_issue_id: sentryIssueId,
            title,
            level,
            status,
            first_seen_at: firstSeenAt,
            last_seen_at: lastSeenAt,
            event_count: eventCount,
            environment,
            release,
            updated_at: new Date(),
          },
          update: {
            title,
            level,
            status, // Sync status from Sentry
            last_seen_at: lastSeenAt,
            event_count: eventCount,
            environment,
            release,
            updated_at: new Date(),
            // Don't overwrite sample_event_json - preserve webhook data
          },
        });

        syncedCount++;
      } catch (error) {
        console.error(`❌ [SENTRY_SYNC] Error syncing issue ${issue.id}:`, error);
        errors.push(`Issue ${issue.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    console.log(`✅ [SENTRY_SYNC] Sync complete:`, {
      synced: syncedCount,
      errors: errorCount,
    });

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      errors: errorCount,
      errorMessages: errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [SENTRY_SYNC] Sync job failed:', error);
    return NextResponse.json(
      {
        error: 'Sync job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
