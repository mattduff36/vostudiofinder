import { withLocalTriage } from '@/lib/admin/error-log/triage';
import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth-guards';
import { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { redactSentryEvent } from '@/lib/admin/error-log/redaction';

/**
 * Admin API: Error Log Group Details
 * 
 * GET: Fetch full details including sample event JSON for a specific error log group
 * Query params:
 * - live=1: Fetch live data from Sentry API (issue + latest event)
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin role
    await requireApiRole(Role.ADMIN);

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fetchLive = searchParams.get('live') === '1';

    // Fetch error log group with full details from DB
    const sourceGroup = await db.error_log_groups.findUnique({
      where: { id },
      select: {
        id: true,
        sentry_issue_id: true,
        title: true,
        level: true,
        status: true,
        first_seen_at: true,
        last_seen_at: true,
        event_count: true,
        environment: true,
        release: true,
        last_event_id: true,
        sample_event_json: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!sourceGroup) {
      return NextResponse.json(
        { error: 'Error log group not found' },
        { status: 404 }
      );
    }

    const errorLogGroup = await withLocalTriage(sourceGroup);

    // If live fetch is requested, get fresh data from Sentry
    let sentryIssue = null;
    let sentryLatestEvent = null;
    let sentryError = null;

    if (fetchLive) {
      const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
      const sentryOrgSlug = process.env.SENTRY_ORG_SLUG;
      const sentryProjectSlug = process.env.SENTRY_PROJECT_SLUG;

      if (sentryAuthToken && sentryOrgSlug && sentryProjectSlug) {
        try {
          console.log(`[ERROR_LOG_API] Fetching Sentry data for issue ${errorLogGroup.sentry_issue_id}`);
          
          // Fetch issue details
          // Try organization-scoped endpoint first (required for some token types)
          const issueResponse = await fetch(
            `https://sentry.io/api/0/organizations/${sentryOrgSlug}/issues/${errorLogGroup.sentry_issue_id}/`,
            {
              headers: {
                'Authorization': `Bearer ${sentryAuthToken}`,
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(10000), // 10 second timeout
            }
          );

          if (issueResponse.ok) {
            sentryIssue = redactSentryEvent(await issueResponse.json());
            console.log(`[ERROR_LOG_API] ✅ Successfully fetched Sentry issue`);
          } else {
            console.warn(`[ERROR_LOG_API] ❌ Failed to fetch Sentry issue: ${issueResponse.status}`);
            sentryError = `Sentry API returned ${issueResponse.status}`;
          }

          // Fetch latest event for this issue
          // Use organization-scoped endpoint for consistency
          const eventResponse = await fetch(
            `https://sentry.io/api/0/organizations/${sentryOrgSlug}/issues/${errorLogGroup.sentry_issue_id}/events/latest/`,
            {
              headers: {
                'Authorization': `Bearer ${sentryAuthToken}`,
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(10000), // 10 second timeout
            }
          );

          if (eventResponse.ok) {
            const rawEvent = await eventResponse.json();
            sentryLatestEvent = redactSentryEvent(rawEvent);
            console.log(`[ERROR_LOG_API] ✅ Successfully fetched Sentry latest event`);
          } else {
            console.warn(`[ERROR_LOG_API] ❌ Failed to fetch Sentry latest event: ${eventResponse.status}`);
            const eventError = `Failed to fetch latest event (HTTP ${eventResponse.status})`;
            sentryError = sentryError ? `${sentryError}; ${eventError}` : eventError;
          }
        } catch (error) {
          console.error('[ERROR_LOG_API] Error fetching from Sentry');
          sentryError = error instanceof Error && error.name === 'TimeoutError' ? 'Sentry request timed out' : 'Sentry data could not be fetched';
        }
      } else {
        sentryError = 'Sentry API credentials not configured';
      }
    }

    return NextResponse.json({
      errorLogGroup: {
        ...errorLogGroup,
        sample_event_json: redactSentryEvent(errorLogGroup.sample_event_json),
      },
      sentryIssue,
      sentryLatestEvent,
      sentryError,
    });
  } catch (error) {
    console.error('[ERROR_LOG_API] Error fetching error log details');

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch error log details',
      },
      { status: 500 }
    );
  }
}
