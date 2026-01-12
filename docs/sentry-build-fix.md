# Sentry Build Fix - 403 Permission Error

## Problem

Vercel build is failing with:
```
sentry reported an error: You do not have permission to perform this action. (http status: 403)
```

This happens because the `SENTRY_AUTH_TOKEN` environment variable doesn't have the `project:releases` permission required to upload sourcemaps during the Next.js build.

## Root Cause

Your Sentry auth token currently has:
- ✅ `project:read` (for API sync cron)
- ✅ `event:read` (for API sync cron)
- ❌ `project:releases` (missing - needed for sourcemap upload)
- ❌ `project:write` (missing - needed for sourcemap upload)

## Solution Options

### Option 1: Remove SENTRY_AUTH_TOKEN from Vercel (QUICK FIX - Recommended Now)

**This is the fastest way to unblock your deployment.**

1. Go to Vercel → voiceoverstudiofinder → Settings → Environment Variables
2. **Temporarily remove** `SENTRY_AUTH_TOKEN` from all environments (Production, Preview, Development)
3. Redeploy

**What still works:**
- ✅ Error tracking via client SDK
- ✅ Webhook integration (errors pushed to /admin/error-log)
- ❌ API sync cron (won't work without token)
- ❌ Sourcemaps (no prettified stack traces)

**Why this works:** Without the token, Sentry build plugin silently skips sourcemap upload instead of failing.

### Option 2: Update Token with More Permissions (Better Long-term)

1. Go to Sentry → Settings → Auth Tokens
2. **Create a NEW token** (don't edit the existing one)
3. Select these scopes:
   - ✅ `project:read`
   - ✅ `event:read`
   - ✅ `project:releases` ← **NEW**
   - ✅ `project:write` ← **NEW**
   - ✅ `org:read` ← **NEW** (sometimes needed)
4. Copy the new token
5. Update `SENTRY_AUTH_TOKEN` in Vercel with the new token value
6. Redeploy

**Benefits:**
- ✅ Better stack traces with sourcemaps
- ✅ API sync cron works
- ✅ Full Sentry integration

## What I've Fixed

1. ✅ Fixed TypeScript error in `src/app/api/admin/sentry-test-error/route.ts`
   - Changed `request: NextRequest` to `_request: NextRequest`

## Recommended Action NOW

**Do Option 1** (remove token from Vercel) to unblock deployment immediately. We can add it back later with correct permissions.

## After Deployment

Once deployed successfully:
1. Test the webhook by visiting: `https://voiceoverstudiofinder.com/api/admin/sentry-test-error`
2. Check if error appears in `/admin/error-log`
3. Later, create a new token with full permissions and re-add it to Vercel
