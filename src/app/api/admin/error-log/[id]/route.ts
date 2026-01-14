import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth-guards';
import { Role } from '@prisma/client';
import { db } from '@/lib/db';

/**
 * Admin API: Error Log Group Details
 * 
 * GET: Fetch full details including sample event JSON for a specific error log group
 * Query params:
 * - live=1: Fetch live data from Sentry API (issue + latest event)
 */

/**
 * Redact sensitive fields from headers, even in "max" detail mode
 * to prevent exposing tokens, session cookies, etc.
 */
function redactSensitiveHeaders(headers: any): any {
  if (!headers || typeof headers !== 'object') return headers;
  
  const redacted = { ...headers };
  const sensitiveKeys = [
    'cookie',
    'authorization',
    'x-csrf-token',
    'x-api-key',
    'api-key',
    'x-auth-token',
    'session',
    'set-cookie'
  ];
  
  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      redacted[key] = '[REDACTED]';
    }
  }
  
  return redacted;
}

/**
 * Apply privacy redaction to Sentry event data
 * Redacts: cookies, authorization headers, request body (if sensitive)
 * Keeps: URL, method, most headers, user data (as admin selected "max" detail)
 */
function redactEventData(event: any): any {
  if (!event) return event;
  
  const redacted = { ...event };
  
  // Redact sensitive request data
  if (redacted.request) {
    redacted.request = {
      ...redacted.request,
      headers: redactSensitiveHeaders(redacted.request.headers),
      cookies: '[REDACTED]', // Always redact cookies
      // Keep body but redact if it contains sensitive patterns
      data: redacted.request.data && typeof redacted.request.data === 'object'
        ? sanitizeRequestBody(redacted.request.data)
        : redacted.request.data,
    };
  }
  
  return redacted;
}

/**
 * Sanitize request body by redacting fields that look like passwords, tokens, etc.
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = Array.isArray(body) ? [...body] : { ...body };
  const sensitivePatterns = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (sensitivePatterns.some(pattern => key.toLowerCase().includes(pattern))) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeRequestBody(value);
    }
  }
  
  return sanitized;
}

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
    const errorLogGroup = await db.error_log_groups.findUnique({
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

    if (!errorLogGroup) {
      return NextResponse.json(
        { error: 'Error log group not found' },
        { status: 404 }
      );
    }

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
          console.log(`[ERROR_LOG_API] Config: org=${sentryOrgSlug}, project=${sentryProjectSlug}, token=${sentryAuthToken.substring(0, 10)}...`);
          
          // Fetch issue details
          const issueResponse = await fetch(
            `https://sentry.io/api/0/issues/${errorLogGroup.sentry_issue_id}/`,
            {
              headers: {
                'Authorization': `Bearer ${sentryAuthToken}`,
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(10000), // 10 second timeout
            }
          );

          if (issueResponse.ok) {
            sentryIssue = await issueResponse.json();
            console.log(`[ERROR_LOG_API] ✅ Successfully fetched Sentry issue`);
          } else {
            const errorBody = await issueResponse.text();
            console.warn(`[ERROR_LOG_API] ❌ Failed to fetch Sentry issue: ${issueResponse.status} - ${errorBody}`);
            sentryError = `Sentry API returned ${issueResponse.status}`;
          }

          // Fetch latest event for this issue
          const eventResponse = await fetch(
            `https://sentry.io/api/0/issues/${errorLogGroup.sentry_issue_id}/events/latest/`,
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
            // Apply privacy redaction before sending to client
            sentryLatestEvent = redactEventData(rawEvent);
            console.log(`[ERROR_LOG_API] ✅ Successfully fetched Sentry latest event`);
          } else {
            const errorBody = await eventResponse.text();
            console.warn(`[ERROR_LOG_API] ❌ Failed to fetch Sentry latest event: ${eventResponse.status} - ${errorBody}`);
            const eventError = `Failed to fetch latest event (HTTP ${eventResponse.status})`;
            sentryError = sentryError ? `${sentryError}; ${eventError}` : eventError;
          }
        } catch (error) {
          console.error('[ERROR_LOG_API] Error fetching from Sentry:', error);
          sentryError = error instanceof Error ? error.message : 'Unknown Sentry API error';
        }
      } else {
        sentryError = 'Sentry API credentials not configured';
      }
    }

    return NextResponse.json({
      errorLogGroup,
      sentryIssue,
      sentryLatestEvent,
      sentryError,
    });
  } catch (error) {
    console.error('[ERROR_LOG_API] Error fetching error log details:', error);
    
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch error log details',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
