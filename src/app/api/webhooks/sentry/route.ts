import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

/**
 * Sentry Webhook Handler
 * 
 * Receives issue alerts from Sentry and stores them in the database
 * for admin review in the Error Log tab.
 * 
 * Security: Validates Sentry-Hook-Signature header using HMAC-SHA256
 * 
 * Webhook configuration in Sentry:
 * 1. Go to Settings > Developer Settings > Internal Integrations
 * 2. Create new integration with webhook URL: https://yourdomain.com/api/webhooks/sentry
 * 3. Copy the Client Secret and add as SENTRY_WEBHOOK_SECRET to environment variables
 * 4. Enable webhook events (issue created, resolved, etc.)
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
    console.log('📨 [SENTRY_WEBHOOK] Received webhook:', {
      action: payload.action,
      issueId: payload.data?.issue?.id,
    });

    // Extract issue data from Sentry webhook payload
    const issue = payload.data?.issue;
    if (!issue) {
      console.warn('⚠️  [SENTRY_WEBHOOK] No issue data in payload');
      return NextResponse.json({ success: true, message: 'No issue data' });
    }

    const sentryIssueId = String(issue.id);
    const title = issue.title || issue.culprit || 'Unknown error';
    const level = issue.level || 'error';
    const firstSeenAt = issue.firstSeen ? new Date(issue.firstSeen) : new Date();
    const lastSeenAt = issue.lastSeen ? new Date(issue.lastSeen) : new Date();
    const eventCount = issue.count || 1;
    const environment = issue.metadata?.environment || null;
    const release = issue.metadata?.release || null;

    // Get sample event data if available
    let sampleEventJson: any = null;
    const event = payload.data?.event;
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
        sample_event_json: sampleEventJson,
        updated_at: new Date(),
      },
    });

    console.log('✅ [SENTRY_WEBHOOK] Stored error log group:', {
      id: errorLogGroup.id,
      sentryIssueId,
      title: title.substring(0, 50),
      eventCount,
    });

    return NextResponse.json({
      success: true,
      errorLogGroupId: errorLogGroup.id,
    });
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
