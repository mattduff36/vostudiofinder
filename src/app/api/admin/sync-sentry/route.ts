import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth-guards';
import { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

/**
 * Admin Endpoint: Manual Sentry Sync
 * 
 * Allows admins to manually trigger a sync with Sentry
 * Can optionally fetch full history via pagination
 * 
 * Query Parameters:
 * - full=true: Fetch all historical issues (paginated)
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin role
    await requireApiRole(Role.ADMIN);

    const { searchParams } = new URL(request.url);
    const fullSync = searchParams.get('full') === 'true';

    // Check Sentry configuration
    const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
    const sentryOrgSlug = process.env.SENTRY_ORG_SLUG;
    const sentryProjectSlug = process.env.SENTRY_PROJECT_SLUG;

    if (!sentryAuthToken || !sentryOrgSlug || !sentryProjectSlug) {
      return NextResponse.json(
        { error: 'Sentry API not configured' },
        { status: 500 }
      );
    }

    console.log(`🔄 [ADMIN_SYNC] Starting ${fullSync ? 'FULL' : 'standard'} Sentry sync...`);

    let allIssues: any[] = [];
    let cursor: string | null = null;
    let pageCount = 0;
    const maxPages = fullSync ? 100 : 1; // Limit full sync to 100 pages (10,000 issues)

    // Fetch issues with pagination
    do {
      const sentryApiUrl: string = cursor
        ? `https://sentry.io/api/0/projects/${sentryOrgSlug}/${sentryProjectSlug}/issues/?statsPeriod=14d&cursor=${cursor}`
        : `https://sentry.io/api/0/projects/${sentryOrgSlug}/${sentryProjectSlug}/issues/?statsPeriod=14d`;

      const response = await fetch(sentryApiUrl, {
        headers: {
          'Authorization': `Bearer ${sentryAuthToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [ADMIN_SYNC] Sentry API error:', response.status, errorText);
        return NextResponse.json(
          { error: 'Sentry API error', status: response.status, message: errorText },
          { status: 500 }
        );
      }

      const issues = await response.json();
      allIssues = allIssues.concat(issues);
      pageCount++;

      // Extract next cursor from Link header
      const linkHeader = response.headers.get('Link');
      cursor = null;
      if (linkHeader && fullSync) {
        const nextLinkMatch = linkHeader.match(/<[^>]*[?&]cursor=([^>&]+)[^>]*>;\s*rel="next"/);
        if (nextLinkMatch && nextLinkMatch[1]) {
          cursor = nextLinkMatch[1];
        }
      }

      console.log(`📊 [ADMIN_SYNC] Fetched page ${pageCount}, ${issues.length} issues (total: ${allIssues.length})`);
    } while (cursor && pageCount < maxPages);

    console.log(`📊 [ADMIN_SYNC] Fetched ${allIssues.length} total issues across ${pageCount} page(s)`);

    // Process all issues
    let syncedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const issue of allIssues) {
      try {
        const sentryIssueId = String(issue.id);
        const title = issue.title || issue.culprit || 'Unknown error';
        const level = issue.level || 'error';
        const firstSeenAt = issue.firstSeen ? new Date(issue.firstSeen) : new Date();
        const lastSeenAt = issue.lastSeen ? new Date(issue.lastSeen) : new Date();
        const eventCount = parseInt(String(issue.count || 1), 10);
        const environment = issue.metadata?.environment || null;
        const release = issue.metadata?.release || null;

        // Determine status from Sentry issue state
        let status: 'OPEN' | 'RESOLVED' | 'IGNORED' = 'OPEN';
        if (issue.status === 'resolved') {
          status = 'RESOLVED';
        } else if (issue.status === 'ignored' || issue.status === 'muted') {
          status = 'IGNORED';
        }

        // Upsert the issue
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
            status,
            last_seen_at: lastSeenAt,
            event_count: eventCount,
            environment,
            release,
            updated_at: new Date(),
          },
        });

        syncedCount++;
      } catch (error) {
        console.error(`❌ [ADMIN_SYNC] Error syncing issue ${issue.id}:`, error);
        errors.push(`Issue ${issue.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    console.log(`✅ [ADMIN_SYNC] Sync complete:`, {
      synced: syncedCount,
      errors: errorCount,
      pages: pageCount,
    });

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      errors: errorCount,
      pages: pageCount,
      errorMessages: errors.length > 0 ? errors.slice(0, 10) : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [ADMIN_SYNC] Manual sync failed:', error);
    return NextResponse.json(
      {
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
