# Complete Sentry Integration Guide - Capturing ALL Errors

## Overview

This guide explains how to ensure **ALL** Sentry errors are pushed to your `/admin/error-log` page and how to make your error log system as advanced and professional as possible using Sentry's full capabilities.

## Current State Analysis

Your current implementation has:
- ✅ Webhook endpoint for issue alerts
- ✅ Sync cron job (every 5 minutes) for unresolved issues
- ✅ Error log UI with filtering and details
- ⚠️ **Gap**: Only captures issues, not individual events
- ⚠️ **Gap**: Only syncs unresolved issues
- ⚠️ **Gap**: Missing some Sentry event types

## Strategy: Multi-Layer Error Capture

To capture **ALL** errors, implement a three-layer approach:

1. **Webhooks** (Real-time) - Capture issues as they happen
2. **API Sync** (Periodic) - Backfill and sync all issues
3. **Event Streaming** (Advanced) - Capture individual events

---

## Part 1: Enhanced Webhook Configuration

### Current Webhook Events

Your webhook currently handles `issue.*` events. To capture ALL errors, configure these events in Sentry:

### Required Webhook Events

In Sentry → Settings → Developer Settings → Internal Integrations → Your Integration:

**Enable these webhook events:**

1. **`issue.created`** ✅ (Already configured)
   - Fires when a new issue is first seen
   - Captures new error types immediately

2. **`issue.resolved`** ⚠️ (Add this)
   - Fires when an issue is resolved
   - Update status in your database

3. **`issue.ignored`** ⚠️ (Add this)
   - Fires when an issue is ignored
   - Sync status changes from Sentry

4. **`issue.reopened`** ⚠️ (Add this)
   - Fires when a resolved issue reoccurs
   - Update status back to OPEN

5. **`issue.assigned`** (Optional - for future)
   - Fires when issue is assigned to someone
   - Could add assignment tracking

6. **`event.created`** ⚠️ (CRITICAL - Add this)
   - Fires for EVERY error event (not just issues)
   - Captures errors even if they don't create new issues
   - This is key for capturing ALL errors

### Webhook Payload Structure

The `event.created` webhook payload structure:

```json
{
  "action": "event.created",
  "data": {
    "event": {
      "id": "event-id",
      "issue": {
        "id": "issue-id",
        "title": "Error message",
        "level": "error",
        "firstSeen": "2024-01-01T00:00:00Z",
        "lastSeen": "2024-01-01T00:00:00Z",
        "count": 1
      },
      "message": "Full error message",
      "exception": {...},
      "stacktrace": {...},
      "tags": {...},
      "contexts": {...},
      "breadcrumbs": [...],
      "user": {...},
      "request": {...},
      "platform": "javascript",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

## Part 2: Enhanced Webhook Handler

Update your webhook handler to support all event types:

### Key Changes Needed:

1. **Handle `event.created`** - Capture individual events
2. **Handle status changes** - Sync resolved/ignored/reopened
3. **Better event data extraction** - Capture more context
4. **Deduplication** - Handle multiple events for same issue

### Implementation Plan:

```typescript
// Enhanced webhook handler structure
export async function POST(request: NextRequest) {
  const payload = JSON.parse(body);
  const action = payload.action;

  switch (action) {
    case 'issue.created':
    case 'event.created':
      // Create or update error log group
      break;
    case 'issue.resolved':
      // Update status to RESOLVED
      break;
    case 'issue.ignored':
      // Update status to IGNORED
      break;
    case 'issue.reopened':
      // Update status to OPEN
      break;
  }
}
```

---

## Part 3: Enhanced Sync Cron Job

### Current Limitation

Your sync cron only fetches `is:unresolved` issues. To capture ALL errors:

### Enhanced Sync Strategy

1. **Sync ALL issues** (resolved + unresolved)
2. **Sync recent events** (last 24 hours)
3. **Backfill historical data** (on first run)
4. **Incremental sync** (only new/changed)

### API Endpoints to Use

```typescript
// 1. Get ALL issues (not just unresolved)
const query = 'is:unresolved OR is:resolved OR is:ignored';
const url = `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=${encodeURIComponent(query)}&statsPeriod=30d`;

// 2. Get recent events for an issue
const eventsUrl = `https://sentry.io/api/0/issues/${issueId}/events/`;

// 3. Get specific event details
const eventUrl = `https://sentry.io/api/0/projects/${org}/${project}/events/${eventId}/`;
```

### Enhanced Sync Logic

```typescript
// Pseudo-code for enhanced sync
async function syncAllErrors() {
  // 1. Sync all issues (resolved + unresolved)
  const allIssues = await fetchAllIssues();
  
  // 2. For each issue, fetch latest event
  for (const issue of allIssues) {
    const latestEvent = await fetchLatestEvent(issue.id);
    
    // 3. Upsert with full event data
    await upsertErrorLogGroup({
      issue,
      event: latestEvent,
      includeFullEventData: true
    });
  }
  
  // 4. Sync recent standalone events (events without issues)
  const recentEvents = await fetchRecentEvents();
  for (const event of recentEvents) {
    await createOrLinkEvent(event);
  }
}
```

---

## Part 4: Sentry Configuration Enhancements

### Enhanced Client Configuration

Update your `sentry.client.config.ts`:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  
  // Capture ALL errors (no filtering)
  beforeSend(event, hint) {
    // Only filter in development if needed
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry event:', event);
    }
    // Return event to send it (don't filter)
    return event;
  },
  
  // Capture more error types
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserApiErrorsIntegration(),
    Sentry.httpClientIntegration(),
    Sentry.linkedErrorsIntegration(),
  ],
  
  // Capture 100% of errors
  tracesSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  
  // Capture all log levels
  ignoreErrors: [], // Don't ignore anything
  
  // Capture more context
  sendDefaultPii: true,
  
  // Environment tagging
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,
});
```

### Enhanced Server Configuration

Update your `sentry.server.config.ts`:

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Capture all server errors
  tracesSampleRate: 1.0,
  
  // Enable all integrations
  integrations: [
    Sentry.httpIntegration({
      trackIncomingRequestsAsSessions: true,
    }),
  ],
  
  // Capture more context
  sendDefaultPii: true,
  
  // Environment tagging
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  
  // Capture unhandled rejections
  captureUnhandledRejections: true,
});
```

---

## Part 5: Advanced Features to Implement

### 1. Event-Level Tracking

Store individual events, not just issues:

```prisma
model error_log_events {
  id                String   @id
  error_log_group_id String
  sentry_event_id   String   @unique
  event_json        Json
  created_at        DateTime @default(now())
  
  error_log_group   error_log_groups @relation(fields: [error_log_group_id], references: [id])
  
  @@index([error_log_group_id])
  @@index([created_at])
}
```

### 2. Error Trends & Analytics

Add analytics to track:
- Error frequency over time
- Error rate by environment
- Most common errors
- Error resolution time

### 3. Real-time Updates

Use Server-Sent Events (SSE) or WebSockets to push new errors to admin UI:

```typescript
// Real-time error stream
export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      // Stream new errors as they arrive
      setInterval(async () => {
        const newErrors = await getNewErrorsSince(lastCheck);
        controller.enqueue(JSON.stringify(newErrors));
      }, 5000);
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }
  });
}
```

### 4. Error Grouping Intelligence

Implement smart error grouping:
- Group similar errors by fingerprint
- Detect error patterns
- Auto-categorize errors

### 5. Sentry Issue Linking

Add direct links to Sentry issues:

```typescript
const sentryIssueUrl = `https://sentry.io/organizations/${org}/issues/${issueId}/`;
```

### 6. Error Context Enrichment

Capture more context:
- User journey (breadcrumbs)
- Performance metrics
- Browser/device info
- Custom tags

---

## Part 6: Implementation Checklist

### Immediate Actions (High Priority)

- [ ] **Update webhook handler** to support `event.created`
- [ ] **Add webhook events** in Sentry dashboard:
  - `event.created` ⚠️ CRITICAL
  - `issue.resolved`
  - `issue.ignored`
  - `issue.reopened`
- [ ] **Update sync cron** to fetch ALL issues (not just unresolved)
- [ ] **Enhance Sentry config** to capture more error types
- [ ] **Test webhook** with test errors

### Short-term Enhancements (Medium Priority)

- [ ] Add event-level tracking (store individual events)
- [ ] Implement status sync (resolved/ignored from Sentry)
- [ ] Add Sentry issue links in UI
- [ ] Enhance error details with more context
- [ ] Add error trends/charts

### Long-term Features (Low Priority)

- [ ] Real-time error streaming
- [ ] Error analytics dashboard
- [ ] Auto-resolution rules
- [ ] Error assignment system
- [ ] Email/Slack notifications

---

## Part 7: Testing Strategy

### Test Webhook Capture

1. **Trigger test errors:**
   ```typescript
   // Client-side error
   throw new Error('Test client error');
   
   // Server-side error
   throw new Error('Test server error');
   
   // Unhandled promise rejection
   Promise.reject(new Error('Test unhandled rejection'));
   ```

2. **Verify in Sentry** - Check errors appear in Sentry dashboard

3. **Check webhook logs** - Verify webhook receives events

4. **Check database** - Verify errors appear in `error_log_groups`

5. **Check admin UI** - Verify errors appear in `/admin/error-log`

### Test Sync Cron

1. **Manually trigger sync:**
   ```bash
   curl -X GET https://yourdomain.com/api/cron/sentry-sync \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

2. **Verify sync results** - Check logs and database

3. **Verify all issues synced** - Check resolved issues are included

---

## Part 8: Monitoring & Maintenance

### Key Metrics to Monitor

1. **Webhook delivery rate** - Should be >99%
2. **Sync success rate** - Should be 100%
3. **Error capture rate** - Compare Sentry vs your database
4. **Database growth** - Monitor `error_log_groups` table size
5. **API performance** - Monitor `/api/admin/error-log` response times

### Alerting

Set up alerts for:
- Webhook failures
- Sync cron failures
- Database errors
- High error rates

---

## Part 9: Sentry Best Practices

### 1. Error Fingerprinting

Use Sentry's fingerprinting to group similar errors:

```typescript
Sentry.captureException(error, {
  fingerprint: ['custom-fingerprint', error.message],
});
```

### 2. Context Enrichment

Add context to errors:

```typescript
Sentry.setContext('user', {
  id: user.id,
  email: user.email,
});

Sentry.setTag('feature', 'checkout');
Sentry.setTag('environment', 'production');
```

### 3. Breadcrumbs

Add breadcrumbs for debugging:

```typescript
Sentry.addBreadcrumb({
  category: 'navigation',
  message: 'User clicked checkout button',
  level: 'info',
});
```

### 4. Performance Monitoring

Track performance alongside errors:

```typescript
const transaction = Sentry.startTransaction({
  op: 'checkout',
  name: 'Process Payment',
});

// ... your code ...

transaction.finish();
```

---

## Part 10: Next Steps

### Immediate Next Steps:

1. **Read this guide thoroughly**
2. **Update webhook configuration** in Sentry dashboard
3. **Enhance webhook handler** to support `event.created`
4. **Update sync cron** to fetch all issues
5. **Test with real errors**
6. **Monitor and iterate**

### Documentation References:

- [Sentry Webhooks](https://docs.sentry.io/product/integrations/integration-platform/webhooks/)
- [Sentry API](https://docs.sentry.io/api/)
- [Sentry Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Event Payload](https://develop.sentry.dev/sdk/event-payloads/)

---

## Summary

To capture **ALL** Sentry errors:

1. ✅ **Configure `event.created` webhook** - Captures every error event
2. ✅ **Update sync cron** - Fetch ALL issues (resolved + unresolved)
3. ✅ **Enhance Sentry config** - Capture more error types
4. ✅ **Add status sync** - Keep status in sync with Sentry
5. ✅ **Implement event-level tracking** - Store individual events

This multi-layer approach ensures no errors are missed and your error log system becomes a comprehensive error monitoring solution.
