# Sentry Webhook Verification Guide

## Current Implementation Status

Based on the latest Sentry documentation and your code, here's what you have and what needs verification:

## ✅ What's Already Implemented

1. **Webhook Handler** (`src/app/api/webhooks/sentry/route.ts`)
   - ✅ Signature verification using `sentry-hook-signature` header
   - ✅ Support for `event.created` webhook
   - ✅ Support for `issue.created` webhook
   - ✅ Support for status change webhooks (`issue.resolved`, `issue.ignored`, `issue.reopened`)
   - ✅ Event data sanitization
   - ✅ Database upsert logic

2. **Sync Cron Job** (`src/app/api/cron/sentry-sync/route.ts`)
   - ✅ Fetches ALL issues (resolved + unresolved + ignored)
   - ✅ 30-day sync period
   - ✅ Status syncing from Sentry

## 🔍 Verification Steps

### Step 1: Verify Sentry Integration Setup

1. **Check if Internal Integration exists:**
   - Go to Sentry → Settings → Developer Settings → Internal Integrations
   - Look for your webhook integration
   - If it doesn't exist, create one:
     - Name: "Error Log Integration"
     - Webhook URL: `https://yourdomain.com/api/webhooks/sentry`
     - Permissions: `event:read`, `project:read`

2. **Verify Webhook Events:**
   - In your Internal Integration, check the "Webhooks" or "Events" section
   - Confirm these events are enabled:
     - `event.created` ⚠️ CRITICAL
     - `issue.created`
     - `issue.resolved`
     - `issue.ignored`
     - `issue.reopened`

### Step 2: Verify Environment Variables

Check that these are set in your production environment:

```bash
SENTRY_WEBHOOK_SECRET=<your-secret-from-sentry-integration>
SENTRY_AUTH_TOKEN=<your-auth-token>
SENTRY_ORG_SLUG=<your-org-slug>
SENTRY_PROJECT_SLUG=<your-project-slug>
CRON_SECRET=<your-cron-secret>
```

### Step 3: Test Webhook Delivery

1. **Trigger a test error:**
   ```typescript
   // In any API route or component
   throw new Error('Test webhook error');
   ```

2. **Check Sentry Dashboard:**
   - Error should appear in Sentry
   - Go to Settings → Developer Settings → Your Integration → Webhook Logs
   - Look for delivery attempts

3. **Check your application logs:**
   - Look for `[SENTRY_WEBHOOK]` log entries
   - Should see "Received webhook" and "Stored error log group" messages

4. **Check database:**
   - Query `error_log_groups` table
   - Should see the test error

5. **Check admin UI:**
   - Visit `/admin/error-log`
   - Test error should appear

### Step 4: Verify Webhook Payload Structure

Your webhook handler expects this structure:

**For `event.created`:**
```json
{
  "action": "event.created",
  "data": {
    "event": {
      "id": "event-id",
      "issue": {
        "id": "issue-id",
        "title": "Error message",
        ...
      },
      "message": "...",
      "exception": {...},
      ...
    }
  }
}
```

**For `issue.created`:**
```json
{
  "action": "issue.created",
  "data": {
    "issue": {
      "id": "issue-id",
      "title": "Error message",
      ...
    }
  }
}
```

**For status changes:**
```json
{
  "action": "issue.resolved",
  "data": {
    "issue": {
      "id": "issue-id",
      "status": "resolved",
      ...
    }
  }
}
```

## ⚠️ Important Notes

### About `event.created` Webhook

- **This is the CRITICAL event** for capturing ALL errors
- Fires for EVERY error event, not just when issues are created
- May fire multiple times for the same issue (one per event)
- Your code handles this by upserting based on `sentry_issue_id`

### About Webhook Signature

- Sentry uses `sentry-hook-signature` header for verification
- Signature is HMAC-SHA256 of the request body
- Your code already implements this correctly

### About Rate Limits

- Sentry has rate limits on webhook deliveries
- If webhook fails, sync cron will backfill (runs every 5 minutes)
- Monitor webhook delivery logs in Sentry

## 🔧 Troubleshooting

### Webhook Not Receiving Events

1. **Check Sentry Integration:**
   - Verify webhook URL is correct
   - Verify events are enabled
   - Check webhook delivery logs in Sentry

2. **Check Your Endpoint:**
   - Verify endpoint is accessible: `https://yourdomain.com/api/webhooks/sentry`
   - Check application logs for errors
   - Verify `SENTRY_WEBHOOK_SECRET` matches Sentry config

3. **Check Signature Verification:**
   - Look for "Invalid signature" errors in logs
   - Verify secret matches between Sentry and your env vars

### Events Not Appearing in Admin UI

1. **Check Database:**
   - Query `error_log_groups` table directly
   - Verify errors are being stored

2. **Check Sync Cron:**
   - Manually trigger sync cron
   - Check sync logs for errors

3. **Check Admin API:**
   - Test `/api/admin/error-log` endpoint directly
   - Verify authentication is working

## 📚 References

- [Sentry Integration Platform](https://docs.sentry.io/product/integrations/integration-platform/)
- [Sentry Webhooks](https://docs.sentry.io/product/integrations/integration-platform/webhooks/)
- [Sentry API Documentation](https://docs.sentry.io/api/)

## ✅ Next Steps

1. Verify Internal Integration exists and is configured correctly
2. Enable `event.created` webhook event
3. Test with a real error
4. Monitor webhook delivery logs
5. Verify errors appear in admin UI
