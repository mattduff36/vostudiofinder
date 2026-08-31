# Operations

Status: canonical operational safety guide
Last reviewed: 31 August 2026

## Environments

Treat local development, preview/staging and production as distinct systems. Identify the exact environment before database, Stripe, email, cron or destructive operations.

## Deployment

Vercel is the current primary deployment configuration in the repository. Docker files also exist and require a separate runtime refresh before they should be assumed healthy.

Never deploy as an incidental completion step. Deployment requires explicit user intent.

## Database

- `DATABASE_URL` selects PostgreSQL.
- `prisma/schema.prisma` is the model contract.
- Migration history is non-trivial and includes old/consolidation/raw SQL material.
- Use read-only/status inspection first.
- Production schema/data changes require a CRITICAL workstream, recovery plan and explicit environment confirmation.
- Do not use `prisma db push` as an undocumented production migration process.

## Stripe

Use test mode for development verification. Live charges/refunds/cancellations/subscription mutations require explicit live-operation intent. Webhook verification/idempotency must be preserved.

## Email

Use rendering/preview/test-recipient paths for development. Do not send campaigns or bulk mail to real users as a routine test. Verify recipient selection and unsubscribe/preferences before live sends.

## Cron

Scheduled routes and schedules are listed in `vercel.json`. Verify route logic separately from Vercel scheduler configuration/logs. Cron endpoints must retain their authentication contract.

## Error monitoring

Sentry-related webhook/sync/admin functionality remains in the repo, but direct runtime instrumentation appears removed. Treat current Sentry ingestion as an operational item to verify before relying on the admin error log as complete application monitoring.

## Health

Run `npm run health` for cheap static governance/drift checks. `npm run health:full` adds available local deterministic checks when dependencies/environment support them.

## Recovery first

For production-risk work, define stop conditions and recovery before mutation. Report implementation verification separately from post-deploy monitoring/user acceptance.
