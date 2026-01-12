# Sentry Integration - Next Steps

## ✅ What Has Been Done

### Code Changes

1. **Enhanced Webhook Handler** (`src/app/api/webhooks/sentry/route.ts`)
   - ✅ Now supports `event.created` webhook (CRITICAL for capturing ALL errors)
   - ✅ Handles status changes: `issue.resolved`, `issue.ignored`, `issue.reopened`
   - ✅ Better event data extraction and sanitization
   - ✅ Proper handling of nested event/issue structures

2. **Enhanced Sync Cron Job** (`src/app/api/cron/sentry-sync/route.ts`)
   - ✅ Now syncs ALL issues (resolved + unresolved + ignored)
   - ✅ Extended sync period from 7 days to 30 days
   - ✅ Syncs status from Sentry (resolved/ignored states)
   - ✅ Better status mapping from Sentry to database

3. **Documentation**
   - ✅ Created comprehensive integration guide (`docs/sentry-complete-integration-guide.md`)
   - ✅ Created this next steps document

---

## 🚨 CRITICAL: Configure Sentry Webhook

### Step 1: Enable `event.created` Webhook (MOST IMPORTANT)

This is the **key** to capturing ALL errors. Without this, you'll only get issue-level events, not individual error events.

1. Go to **Sentry Dashboard** → **Settings** → **Developer Settings** → **Internal Integrations**
2. Find your existing integration (or create a new one)
3. Go to **Webhooks** section
4. **Enable these events:**
   - ✅ `issue.created` (already enabled)
   - ⚠️ **`event.created`** ← **ENABLE THIS NOW** (CRITICAL)
   - ✅ `issue.resolved` (enable this)
   - ✅ `issue.ignored` (enable this)
   - ✅ `issue.reopened` (enable this)

5. **Webhook URL:** `https://yourdomain.com/api/webhooks/sentry`
6. **Custom Header:** `Authorization: Bearer YOUR_SENTRY_WEBHOOK_SECRET`

### Step 2: Verify Webhook Secret

Make sure `SENTRY_WEBHOOK_SECRET` in your environment variables matches the secret configured in Sentry.

---

## 📋 Configuration Checklist

### Environment Variables

Verify these are set in your production environment:

- [ ] `SENTRY_AUTH_TOKEN` - Sentry API auth token with `project:read` and `event:read` scopes
- [ ] `SENTRY_ORG_SLUG` - Your Sentry organization slug
- [ ] `SENTRY_PROJECT_SLUG` - Your Sentry project slug
- [ ] `SENTRY_WEBHOOK_SECRET` - Webhook secret (must match Sentry config)
- [ ] `CRON_SECRET` - Cron authentication secret

### Sentry Dashboard Configuration

- [ ] Webhook URL configured: `https://yourdomain.com/api/webhooks/sentry`
- [ ] Webhook events enabled:
  - [ ] `issue.created`
  - [ ] **`event.created`** ⚠️ CRITICAL
  - [ ] `issue.resolved`
  - [ ] `issue.ignored`
  - [ ] `issue.reopened`
- [ ] Custom header configured: `Authorization: Bearer YOUR_SENTRY_WEBHOOK_SECRET`

---

## 🧪 Testing

### Test 1: Trigger Test Error

Create a test error in your application:

```typescript
// In any API route or component
throw new Error('Test error for Sentry integration');
```

### Test 2: Verify Webhook Receives Event

1. Check Sentry dashboard - error should appear
2. Check Sentry webhook logs - should show `event.created` webhook delivery
3. Check your application logs - should see webhook processing logs
4. Check database - error should appear in `error_log_groups` table
5. Check admin UI - error should appear in `/admin/error-log`

### Test 3: Test Status Sync

1. In Sentry dashboard, mark an issue as "Resolved"
2. Wait for webhook or run sync cron manually
3. Check admin UI - status should update to "RESOLVED"

### Test 4: Test Sync Cron

Manually trigger sync:

```bash
curl -X GET https://yourdomain.com/api/cron/sentry-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Check response - should show synced count including resolved issues.

---

## 📊 Monitoring

### Key Metrics to Monitor

1. **Webhook Delivery Rate**
   - Check Sentry → Settings → Developer Settings → Webhooks → Delivery Logs
   - Should be >99% success rate

2. **Error Capture Rate**
   - Compare errors in Sentry vs your `/admin/error-log` page
   - Should match (or be very close)

3. **Sync Cron Success**
   - Check Vercel cron logs
   - Should run every 5 minutes without errors

4. **Database Growth**
   - Monitor `error_log_groups` table size
   - Should grow gradually, cleanup cron should prevent excessive growth

### What to Look For

✅ **Good Signs:**
- Errors appear in admin UI within seconds of occurring
- Webhook logs show successful deliveries
- Sync cron runs successfully
- Status changes sync from Sentry

❌ **Warning Signs:**
- Errors in Sentry but not in admin UI
- Webhook delivery failures
- Sync cron errors
- Status not syncing from Sentry

---

## 🔍 Troubleshooting

### Problem: Errors not appearing in admin UI

**Check:**
1. Is `event.created` webhook enabled? (CRITICAL)
2. Is webhook URL correct?
3. Is `SENTRY_WEBHOOK_SECRET` matching?
4. Check webhook delivery logs in Sentry
5. Check application logs for webhook processing errors

### Problem: Only unresolved errors appearing

**Solution:**
- Verify sync cron is running (check Vercel cron logs)
- Verify sync cron query includes resolved/ignored issues (should be fixed now)
- Manually trigger sync to test

### Problem: Status not syncing from Sentry

**Check:**
1. Are status change webhooks enabled? (`issue.resolved`, `issue.ignored`, `issue.reopened`)
2. Check webhook delivery logs
3. Check application logs for status update processing

### Problem: Webhook authentication failing

**Check:**
1. Verify `SENTRY_WEBHOOK_SECRET` matches Sentry configuration
2. Check webhook signature verification logs
3. Ensure custom header is configured correctly in Sentry

---

## 🎯 Next Steps (Priority Order)

### Immediate (Do Now)

1. ⚠️ **Enable `event.created` webhook in Sentry** (CRITICAL)
2. Enable status change webhooks (`issue.resolved`, `issue.ignored`, `issue.reopened`)
3. Test with a real error
4. Verify errors appear in admin UI

### Short-term (This Week)

1. Monitor webhook delivery rates
2. Monitor sync cron success
3. Verify status syncing works
4. Check error capture completeness

### Long-term (Future Enhancements)

1. Add event-level tracking (store individual events, not just issues)
2. Add error trends/analytics
3. Add real-time error streaming
4. Add error notifications (email/Slack)
5. Add Sentry issue links in UI

---

## 📚 Additional Resources

- **Full Integration Guide:** `docs/sentry-complete-integration-guide.md`
- **Sentry Webhook Docs:** https://docs.sentry.io/product/integrations/integration-platform/webhooks/
- **Sentry API Docs:** https://docs.sentry.io/api/
- **Error Log System Docs:** `docs/error-log-system.md`

---

## ✅ Summary

**To capture ALL Sentry errors:**

1. ✅ Code is updated (webhook handler + sync cron)
2. ⚠️ **YOU MUST:** Enable `event.created` webhook in Sentry dashboard
3. ⚠️ **YOU MUST:** Enable status change webhooks
4. ✅ Test and verify everything works
5. ✅ Monitor and iterate

**The most critical step is enabling `event.created` webhook - without this, you'll miss individual error events!**
