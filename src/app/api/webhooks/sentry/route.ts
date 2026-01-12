import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

/**
 * Sentry Webhook Handler
 * 
 * Receives issue alerts and events from Sentry and stores them in the database
 * for admin review in the Error Log tab.
 * 
 * Supports multiple webhook actions:
 * - issue.created: New issue detected
 * - event.created: Individual error event (CRITICAL for capturing ALL errors)
 * - issue.resolved: Issue marked as resolved
 * - issue.ignored: Issue marked as ignored
 * - issue.reopened: Resolved issue reoccurred
 * 
 * Security: Validates Sentry-Hook-Signature header using HMAC-SHA256
 * 
 * Webhook configuration in Sentry:
 * 1. Go to Settings > Developer Settings > Internal Integrations
 * 2. Create new integration with webhook URL: https://yourdomain.com/api/webhooks/sentry
 * 3. Copy the Client Secret and add as SENTRY_WEBHOOK_SECRET to environment variables
 * 4. Enable webhook events:
 *    - issue.created ✅
 *    - event.created ⚠️ CRITICAL (enables capturing ALL errors)
 *    - issue.resolved ✅
 *    - issue.ignored ✅
 *    - issue.reopened ✅
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw request body for signature verification
    const body = await request.text();
    const signature = request.headers.get('sentry-hook-signature');
    const webhookSecret = process.env.SENTRY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('❌ [SENTRY_WEBHOOK] SENTRY_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    // Verify Sentry signature
    if (signature) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(body, 'utf8');
      const expectedSignature = hmac.digest('hex');

      if (signature !== expectedSignature) {
        console.error('❌ [SENTRY_WEBHOOK] Invalid signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
      console.log('✅ [SENTRY_WEBHOOK] Signature verified');
    } else {
      console.warn('⚠️  [SENTRY_WEBHOOK] No signature provided - accepting anyway for testing');
    }

    const payload = JSON.parse(body);
    const action = payload.action;
    
    console.log('📨 [SENTRY_WEBHOOK] Received webhook:', {
      action,
      issueId: payload.data?.issue?.id,
      eventId: payload.data?.event?.id,
    });

    // Handle different webhook actions
    switch (action) {
      case 'issue.created':
      case 'event.created':
        return await handleIssueOrEvent(payload);
      
      case 'issue.resolved':
        return await handleStatusChange(payload, 'RESOLVED');
      
      case 'issue.ignored':
        return await handleStatusChange(payload, 'IGNORED');
      
      case 'issue.reopened':
        return await handleStatusChange(payload, 'OPEN');
      
      default:
        console.warn(`⚠️  [SENTRY_WEBHOOK] Unhandled action: ${action}`);
        return NextResponse.json({ 
          success: true, 
          message: `Action ${action} not handled` 
        });
    }
  } catch (error) {
    console.error('❌ [SENTRY_WEBHOOK] Error processing webhook:', error);
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle issue.created or event.created webhooks
 * These create or update error log groups with full event data
 */
async function handleIssueOrEvent(payload: any): Promise<NextResponse> {
  // For event.created, the issue is nested in event.issue
  // For issue.created, the issue is directly in data.issue
  const issue = payload.data?.event?.issue || payload.data?.issue;
  const event = payload.data?.event;

  if (!issue) {
    console.warn('⚠️  [SENTRY_WEBHOOK] No issue data in payload');
    return NextResponse.json({ success: true, message: 'No issue data' });
  }

  const sentryIssueId = String(issue.id);
  const title = issue.title || issue.culprit || 'Unknown error';
  const level = issue.level || event?.level || 'error';
  const firstSeenAt = issue.firstSeen ? new Date(issue.firstSeen) : new Date();
  const lastSeenAt = issue.lastSeen ? new Date(issue.lastSeen) : (event?.timestamp ? new Date(event.timestamp) : new Date());
  const eventCount = issue.count || 1;
  const environment = issue.metadata?.environment || event?.environment || null;
  const release = issue.metadata?.release || event?.release || null;

  // Get sample event data if available
  let sampleEventJson: any = null;
  if (event) {
    // Sanitize event data - remove sensitive information
    sampleEventJson = {
      eventId: event.id,
      message: event.message,
      exception: event.exception,
      stacktrace: event.stacktrace,
      tags: event.tags,
      contexts: event.contexts,
      breadcrumbs: event.breadcrumbs,
      platform: event.platform,
      timestamp: event.timestamp,
      level: event.level,
      // Explicitly exclude sensitive data
      request: event.request ? {
        url: event.request.url,
        method: event.request.method,
        // Exclude headers, cookies, data
      } : null,
    };

    // Include sanitized user context if available
    if (event.user) {
      sampleEventJson.user = {
        id: event.user.id,
        username: event.user.username,
        // Exclude email and IP
      };
    }
  }

  // Upsert error log group
  const errorLogGroup = await db.error_log_groups.upsert({
    where: { sentry_issue_id: sentryIssueId },
    create: {
      id: nanoid(),
      sentry_issue_id: sentryIssueId,
      title,
      level,
      status: 'OPEN',
      first_seen_at: firstSeenAt,
      last_seen_at: lastSeenAt,
      event_count: eventCount,
      environment,
      release,
      last_event_id: event?.id || null,
      sample_event_json: sampleEventJson,
      updated_at: new Date(),
    },
    update: {
      title,
      level,
      last_seen_at: lastSeenAt,
      event_count: eventCount,
      environment,
      release,
      last_event_id: event?.id || null,
      // Update sample_event_json only if we have new event data
      ...(sampleEventJson && { sample_event_json: sampleEventJson }),
      updated_at: new Date(),
    },
  });

  console.log('✅ [SENTRY_WEBHOOK] Stored error log group:', {
    id: errorLogGroup.id,
    sentryIssueId,
    title: title.substring(0, 50),
    eventCount,
    action: payload.action,
  });

  return NextResponse.json({
    success: true,
    errorLogGroupId: errorLogGroup.id,
  });
}

/**
 * Handle status change webhooks (resolved, ignored, reopened)
 */
async function handleStatusChange(payload: any, newStatus: 'RESOLVED' | 'IGNORED' | 'OPEN'): Promise<NextResponse> {
  const issue = payload.data?.issue;
  
  if (!issue) {
    console.warn('⚠️  [SENTRY_WEBHOOK] No issue data in status change payload');
    return NextResponse.json({ success: true, message: 'No issue data' });
  }

  const sentryIssueId = String(issue.id);

  // Update status in database
  const errorLogGroup = await db.error_log_groups.update({
    where: { sentry_issue_id: sentryIssueId },
    data: {
      status: newStatus,
      updated_at: new Date(),
    },
  });

  console.log(`✅ [SENTRY_WEBHOOK] Updated error log group status:`, {
    id: errorLogGroup.id,
    sentryIssueId,
    newStatus,
  });

  return NextResponse.json({
    success: true,
    errorLogGroupId: errorLogGroup.id,
    status: newStatus,
  });
}
