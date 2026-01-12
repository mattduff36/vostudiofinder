# Error Log Management System

## Overview

The Error Log Management System provides a centralized admin interface for monitoring, reviewing, and triaging site-wide errors captured by Sentry. This system allows administrators to:

- View all errors in plain language with grouping by issue type
- See error frequency, first/last occurrence, and environment details
- Expand individual errors to view full stack traces and event details
- Triage errors by marking them as Open, Resolved, or Ignored
- Filter and search through errors efficiently

## Architecture

### Data Flow

```
Application Runtime (Next.js)
    ↓ (captures error)
Sentry Service
    ↓ (issue alert webhook)
Webhook API (/api/webhooks/sentry)
    ↓ (stores/updates)
PostgreSQL Database (error_log_groups table)
    ↑ (syncs periodically)
Cron Job (/api/cron/sentry-sync)
    ↓ (queries)
Admin API (/api/admin/error-log)
    ↓ (displays)
Admin UI (/admin/error-log)
```

### Components

1. **Database Schema** (`prisma/schema.prisma`)
   - `error_log_groups` model: Stores Sentry issue groups
   - `ErrorLogStatus` enum: OPEN, RESOLVED, IGNORED

2. **Webhook Endpoint** (`src/app/api/webhooks/sentry/route.ts`)
   - Receives Sentry issue alerts
   - Validates webhook secret
   - Upserts error log groups in database
   - Sanitizes sensitive data from event payloads

3. **Sync Cron Job** (`src/app/api/cron/sentry-sync/route.ts`)
   - Runs every 5 minutes
   - Syncs issue counts and metadata from Sentry API
   - Keeps error log fresh with latest data

4. **Cleanup Cron Job** (`src/app/api/cron/cleanup-error-logs/route.ts`)
   - Runs daily at 03:00 UTC
   - Deletes error logs older than 90 days
   - Removes resolved/ignored errors older than 30 days

5. **Admin API** (`src/app/api/admin/error-log/`)
   - GET `/api/admin/error-log`: List error groups with filters
   - PATCH `/api/admin/error-log`: Update error status
   - GET `/api/admin/error-log/[id]`: Get full error details

6. **Admin UI** (`src/components/admin/ErrorLog.tsx`)
   - Error list with filtering and search
   - Expandable error details with stack traces
   - Status management (Open/Resolved/Ignored)
   - Consistent styling with other admin pages

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local` file:

```bash
# Sentry Error Log Configuration
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
SENTRY_ORG_SLUG="your-organization-slug"
SENTRY_PROJECT_SLUG="your-project-slug"
SENTRY_WEBHOOK_SECRET="generate-a-secure-random-string"
```

**How to get these values:**

1. **SENTRY_AUTH_TOKEN**: 
   - Go to Sentry → Settings → Account → API → Auth Tokens
   - Create a new token with `project:read` and `event:read` scopes

2. **SENTRY_ORG_SLUG**: 
   - Your organization slug (visible in Sentry URL: `sentry.io/organizations/YOUR-ORG-SLUG/`)

3. **SENTRY_PROJECT_SLUG**: 
   - Your project slug (visible in project settings)

4. **SENTRY_WEBHOOK_SECRET**: 
   - Generate a secure random string (e.g., using `openssl rand -hex 32`)

### 2. Database Migration

Run the Prisma migration to create the `error_log_groups` table:

```bash
npm run db:generate
npm run db:push
```

Or create a new migration:

```bash
npx prisma migrate dev --name add_error_log_groups
```

### 3. Configure Sentry Webhook

1. Go to Sentry → Settings → Developer Settings → Internal Integrations
2. Create a new internal integration or edit existing one
3. Add webhook URL: `https://yourdomain.com/api/webhooks/sentry`
4. Configure webhook to receive "Issue" events
5. Add custom header: `Authorization: Bearer YOUR_SENTRY_WEBHOOK_SECRET`

Alternatively, configure Issue Alerts:
1. Go to Sentry → Alerts → Create Alert Rule
2. Set conditions (e.g., "An issue is first seen" or "An issue changes state")
3. Add action: "Send a webhook request"
4. Webhook URL: `https://yourdomain.com/api/webhooks/sentry`
5. Add custom header: `Authorization: Bearer YOUR_SENTRY_WEBHOOK_SECRET`

### 4. Verify Cron Jobs

The cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sentry-sync",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/cleanup-error-logs",
      "schedule": "0 3 * * *"
    }
  ]
}
```

Ensure `CRON_SECRET` is set in your environment variables for authentication.

### 5. Test the System

1. **Trigger a test error** in your application:
   ```javascript
   throw new Error('Test error for error log system');
   ```

2. **Check Sentry** to verify the error was captured

3. **Wait for webhook** or run sync manually:
   ```bash
   curl -X GET https://yourdomain.com/api/cron/sentry-sync \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

4. **View in Admin UI**: Navigate to `/admin/error-log`

## Features

### Error List View

- **Filtering**: By status (Open/Resolved/Ignored), level (fatal/error/warning/info)
- **Search**: Full-text search in error titles
- **Sorting**: By last seen date, event count, or first seen date
- **Pagination**: 50 errors per page

### Error Details View

- **Summary Information**:
  - Error title and level
  - Status badge
  - Environment and release tags
  - First/last occurrence timestamps
  - Total occurrence count

- **Detailed Information**:
  - Sentry issue ID and event ID
  - Full error message
  - Stack trace (formatted and readable)
  - Request context (URL, method)
  - User context (sanitized)
  - Tags and breadcrumbs
  - Full event JSON (collapsible)

### Status Management

Administrators can triage errors by updating their status:

- **OPEN**: New or unresolved errors (default)
- **RESOLVED**: Fixed errors (kept for 30 days)
- **IGNORED**: Known/acceptable errors (kept for 30 days)

### Data Retention

- **Active errors**: Retained for 90 days from last occurrence
- **Resolved/Ignored errors**: Automatically deleted after 30 days
- **Cleanup**: Runs daily at 03:00 UTC

## Security

### Webhook Security

- Webhook endpoint validates `Authorization: Bearer` header
- Secret must match `SENTRY_WEBHOOK_SECRET` environment variable
- Unauthorized requests return 401

### Admin Access

- All admin endpoints require `Role.ADMIN`
- Uses `requireApiRole()` guard from `@/lib/auth-guards`
- Unauthorized access returns 403

### Data Sanitization

The webhook endpoint sanitizes event data before storage:

- **Excluded**: Cookies, auth headers, full request bodies
- **Included**: Stack traces, error messages, sanitized user context
- **User data**: Only ID and username (no email or IP)

## Monitoring

### Health Checks

Monitor the following to ensure the system is working:

1. **Webhook delivery**: Check Sentry webhook logs
2. **Cron job execution**: Check Vercel cron logs
3. **Database growth**: Monitor `error_log_groups` table size
4. **API performance**: Monitor `/api/admin/error-log` response times

### Troubleshooting

**No errors appearing in admin UI:**
- Check Sentry webhook configuration
- Verify `SENTRY_WEBHOOK_SECRET` matches
- Check webhook delivery logs in Sentry
- Manually trigger sync cron job

**Sync cron failing:**
- Verify `SENTRY_AUTH_TOKEN` has correct permissions
- Check `SENTRY_ORG_SLUG` and `SENTRY_PROJECT_SLUG` are correct
- Review cron job logs in Vercel

**Database growing too large:**
- Verify cleanup cron is running
- Adjust retention periods if needed
- Consider archiving old errors to separate storage

## API Reference

### GET /api/admin/error-log

List error log groups with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)
- `status` (string): Filter by status (OPEN, RESOLVED, IGNORED, or ALL)
- `level` (string): Filter by level (fatal, error, warning, info, or ALL)
- `search` (string): Search in error titles
- `dateFrom` (ISO date): Filter errors from date
- `dateTo` (ISO date): Filter errors to date
- `sortBy` (string): Sort field (last_seen_at, event_count, first_seen_at)
- `sortOrder` (string): Sort direction (asc, desc)

**Response:**
```json
{
  "errorLogGroups": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalCount": 123,
    "totalPages": 3
  }
}
```

### PATCH /api/admin/error-log

Update error log group status.

**Request Body:**
```json
{
  "id": "error-log-group-id",
  "status": "RESOLVED"
}
```

**Response:**
```json
{
  "success": true,
  "errorLogGroup": {...}
}
```

### GET /api/admin/error-log/[id]

Get full error log group details including sample event JSON.

**Response:**
```json
{
  "errorLogGroup": {
    "id": "...",
    "sentry_issue_id": "...",
    "title": "...",
    "sample_event_json": {...},
    ...
  }
}
```

## Future Enhancements

Potential improvements for the error log system:

1. **Email Notifications**: Alert admins when critical errors occur
2. **Error Trends**: Charts showing error frequency over time
3. **Auto-Resolution**: Automatically mark errors as resolved after X days without occurrence
4. **Error Assignment**: Assign errors to specific team members
5. **Comments/Notes**: Add internal notes to error groups
6. **Slack Integration**: Post critical errors to Slack channel
7. **Error Grouping**: Custom grouping rules beyond Sentry's default
8. **Export**: Export error logs to CSV or JSON

## Support

For issues or questions about the error log system:

1. Check Sentry documentation: https://docs.sentry.io/
2. Review Vercel cron documentation: https://vercel.com/docs/cron-jobs
3. Check application logs in Vercel dashboard
4. Contact the development team

---

**Last Updated**: January 2026
**Version**: 1.0.0
