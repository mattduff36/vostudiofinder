# Sentry Webhook Debugging Guide

## Current Status

✅ Sentry is sending webhooks (200 OK)
❌ Errors not appearing in `/admin/error-log`

## Debugging Steps

### 1. Check Vercel Function Logs

**This is the most important step - it will show us exactly what's happening.**

1. Go to **Vercel** → **voiceoverstudiofinder** → **Logs**
2. Filter by: **`/api/webhooks/sentry`**
3. Look at the most recent logs from when you triggered the test error
4. Look for these log messages:
   - `✅ [SENTRY_WEBHOOK] Signature verified`
   - `📨 [SENTRY_WEBHOOK] Received webhook: { action: '...', issueId: '...', eventId: '...' }`
   - `✅ [SENTRY_WEBHOOK] Stored error log group: { ... }`

**If you see errors in the logs, that's the issue.**

### 2. Check the Error Log Page Filters

The error log page might have filters that are hiding the test error:

1. Go to `/admin/error-log`
2. Check these settings:
   - **Status filter**: Make sure it's set to "All" or "Open"
   - **Level filter**: Make sure it's set to "All" or "Error"
   - **Date range**: Make sure it includes today
   - **Search box**: Make sure it's empty

### 3. Check the Database Directly

If the logs show success but the UI doesn't show the error, we need to check if it's actually in the database.

**Option A: Use Vercel Postgres Dashboard**
- Vercel → Storage → Your database → Query tab
- Run: `SELECT * FROM error_log_groups ORDER BY created_at DESC LIMIT 10;`

**Option B: Use local database connection**
- Connect to your production database
- Check the `error_log_groups` table

### 4. Possible Issues

**Issue: Event Action Not Matching**
- Check Vercel logs for: `⚠️ [SENTRY_WEBHOOK] Unhandled action: ...`
- This means Sentry is sending a different action than expected

**Issue: No Issue Data in Payload**
- Check Vercel logs for: `⚠️ [SENTRY_WEBHOOK] No issue data in payload`
- This means the webhook payload structure is different than expected

**Issue: Database Error**
- Check Vercel logs for database errors
- Might be a constraint violation or connection issue

## What to Check Now

1. **Most important**: Check Vercel function logs for `/api/webhooks/sentry`
2. Screenshot any errors or warnings you see
3. If logs show success, check the UI filters
4. If UI filters are correct, we need to check the database

## Expected Behavior

When working correctly, you should see:
1. Sentry webhook log: **200 OK**
2. Vercel function log: **✅ Stored error log group**
3. Database: New row in `error_log_groups`
4. UI: Error visible in `/admin/error-log`

We're at step 1 & 2 - need to verify steps 2-4.
