# Bot Protection Deployment Guide

This guide explains how to deploy the bot protection features that have been implemented.

## Overview

The following bot protection measures have been added:
1. **Cloudflare Turnstile CAPTCHA** on signup form
2. **Rate limiting** for signup and username endpoints (Postgres-backed)
3. **Honeypot field** to catch automated bots
4. **Timing check** to detect too-fast form submissions

## Pre-Deployment Steps

### 1. Get Cloudflare Turnstile Keys

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** section
3. Click **Add site**
4. Configure:
   - **Site name**: Voiceover Studio Finder
   - **Domain**: voiceoverstudiofinder.com
   - **Widget mode**: Managed (recommended) or Non-Interactive
5. Copy the **Site Key** and **Secret Key**

### 2. Update Environment Variables

Add to your `.env.production` (or `.env` for local testing):

```bash
# Bot Protection (Cloudflare Turnstile)
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your-site-key-here"
TURNSTILE_SECRET_KEY="your-secret-key-here"
```

**Note**: `NEXT_PUBLIC_` prefix means this will be exposed to the client (site key only, not secret).

### 3. Create Database Migration

The rate limiting feature requires a new table. Run:

```bash
# Stop any running dev servers first
npm run db:generate

# Create migration
npx prisma migrate dev --name add_rate_limiting_table

# Or for production
npm run db:migrate:prod
```

This creates the `rate_limit_events` table with:
- `fingerprint`: IP address or hash of email+UA
- `endpoint`: Which endpoint was accessed
- `event_count`: Number of requests in current window
- `window_start`: When the current rate limit window started
- `last_event_at`: Last request timestamp

## Deployment Steps

### Option A: Vercel Deployment

1. **Set environment variables in Vercel dashboard**:
   ```bash
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
   TURNSTILE_SECRET_KEY=your-secret-key
   ```

2. **Deploy**:
   ```bash
   git add .
   git commit -m "Add bot protection: Turnstile + rate limiting"
   git push origin main
   ```

3. **Run migration on production database**:
   ```bash
   # If using Vercel CLI
   vercel env pull .env.production
   npm run db:migrate:prod
   ```

### Option B: Manual Deployment

1. Update `.env.production` on your server
2. Run migration: `npx prisma migrate deploy`
3. Rebuild and restart: `npm run build && npm start`

## Testing

### Local Testing (Development)

1. **Get Turnstile test keys** (from Cloudflare):
   - Test site key: `1x00000000000000000000AA` (always passes)
   - Test secret key: `1x0000000000000000000000000000000AA`

2. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"
   TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
   ```

3. Test signup flow:
   - Visit `http://localhost:4000/auth/signup`
   - Turnstile widget should appear
   - Submit form with valid data
   - Should see Turnstile verification in server logs

### Production Testing

1. **Test normal signup**:
   - Go to signup page
   - Complete Turnstile challenge
   - Submit form
   - Should succeed

2. **Test bot protections**:
   - Try submitting without solving Turnstile → Should fail with "Security verification required"
   - Try rapid signups from same IP → Should get rate limited after 3 attempts
   - Check server logs for `[BOT]` and `[RATE_LIMIT]` entries

### Rate Limit Verification

Check rate limiting is working:

```bash
# In psql or your database tool
SELECT * FROM rate_limit_events ORDER BY last_event_at DESC LIMIT 10;
```

You should see records for:
- `endpoint = 'signup'`
- `endpoint = 'check-username'`
- `endpoint = 'reserve-username'`

## Monitoring

### Logs to Watch

After deployment, monitor logs for:

```
✅ Turnstile verification passed
[BOT] Honeypot field filled
[BOT] Missing Turnstile token
[BOT] Turnstile verification failed
[RATE_LIMIT] Signup blocked for ip:x.x.x.x
```

### Database Cleanup

Rate limit records older than 24 hours can be cleaned up. Add a cron job:

```typescript
// /api/cron/cleanup-rate-limits/route.ts
import { cleanupOldRateLimits } from '@/lib/rate-limiting';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deleted = await cleanupOldRateLimits();
  return NextResponse.json({ deleted });
}
```

Schedule in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-rate-limits",
      "schedule": "0 3 * * *"
    }
  ]
}
```

## Rate Limit Configuration

Current limits (in `src/lib/rate-limiting.ts`):

| Endpoint | Window | Max Requests | Purpose |
|----------|--------|--------------|---------|
| `signup` | 1 hour | 3 | Prevent mass account creation |
| `check-username` | 1 minute | 20 | Allow rapid checking but prevent abuse |
| `reserve-username` | 1 hour | 5 | Prevent username squatting |

To adjust limits, edit `RATE_LIMITS` in `src/lib/rate-limiting.ts`.

## Troubleshooting

### Turnstile Not Appearing

1. Check browser console for errors
2. Verify `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set
3. Check network tab for `challenges.cloudflare.com` requests
4. Ensure domain matches Turnstile site configuration

### Rate Limiting Not Working

1. Verify migration ran: `SELECT * FROM rate_limit_events LIMIT 1;`
2. Check logs for `[RATE_LIMIT]` messages
3. Ensure `generateFingerprint()` is getting valid IP addresses
4. On Vercel, check that `x-forwarded-for` header is available

### False Positives

If legitimate users are getting blocked:

1. **Check Turnstile error codes** in logs (e.g., `timeout-or-duplicate`)
2. **Increase rate limits** in `src/lib/rate-limiting.ts`
3. **Review fingerprint logic** - may need to adjust IP extraction

### Prisma Generate Errors (Windows)

If you get `EPERM: operation not permitted` when running `npx prisma generate`:

1. Stop all running Next.js dev servers
2. Close VS Code/Cursor if it has TypeScript server running
3. Try again: `npx prisma generate`
4. If still failing, restart your computer (Windows file locking issue)

## Rollback Plan

If you need to disable bot protection temporarily:

1. **Remove Turnstile check** (backend):
   ```typescript
   // In src/app/api/auth/register/route.ts
   // Comment out Turnstile verification section
   ```

2. **Disable rate limiting**:
   ```typescript
   // In src/lib/rate-limiting.ts
   export const RATE_LIMITS = {
     SIGNUP: { endpoint: 'signup', windowMs: 60 * 60 * 1000, maxRequests: 9999 },
     // ... increase all to 9999
   };
   ```

3. **Redeploy**

## Next Steps

1. **Monitor signup patterns** using the diagnosis script:
   ```bash
   npx tsx scripts/diagnose-bot-signups.ts
   ```

2. **Review logs regularly** for bot activity

3. **Consider additional measures** if needed:
   - Email domain blocklist (e.g., block `test.com`)
   - Require email verification before username reservation
   - IP reputation checking via external service

4. **Periodic cleanup**:
   - Review and delete old EXPIRED accounts
   - Clean up rate limit records
   - Monitor database size

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Review Cloudflare Turnstile dashboard for challenge statistics
3. Query `rate_limit_events` table for rate limiting insights
4. Review the bot diagnosis report: `BOT_SIGNUP_DIAGNOSIS_REPORT.md`
