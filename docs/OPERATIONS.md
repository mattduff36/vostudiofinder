# Operations

Status: canonical operational safety guide
Last reviewed: 2 September 2026 (Vercel/Docker output split)

## Environments

Treat local development, preview/staging and production as distinct systems. Identify the exact environment before database, Stripe, email, cron or destructive operations.

## Deployment

Vercel is the current primary production host (`vercel.json`). Docker is a secondary packaging path for self-hosting.

- Docker base image: `node:24-alpine` (builder and runner).
- Next.js security baseline is **16.3.3** (August 2026 Active LTS). Confirm the image/lockfile version after any framework change.
- Next.js output is platform-conditional in `next.config.ts`: standalone is assigned only when `VERCEL` is unset (`if (!process.env.VERCEL) nextConfig.output = 'standalone'`). Vercel uses its native Next.js adapter and must not request standalone (Next.js 16.3 adapter builds omit `.next/next-server.js.nft.json`, which standalone finalisation then fails to open). Local and Docker builds still produce `.next/standalone` plus `.next/static`; the Dockerfile copies both (and `public/`) into the runtime image. Do not remove the conditional until upstream adapter/standalone behaviour is verified fixed.
- Request-boundary URL sanitisation lives in `src/proxy.ts` (Next.js 16 Proxy, Node.js runtime). A local Docker smoke-start can prove Proxy 301s (for example `/about?foo=bar` → `/about`) without following the redirect into database-backed rendering. Do not call `/api/health`, Stripe, Resend, Neon, or GSC as part of that check.
- A successful `npm run build` on a developer machine is not proof that the Docker image builds. Build a local test tag to verify packaging.
- Deps stage runs `npm ci --ignore-scripts` because `postinstall` would otherwise generate Prisma before the schema is copied. The builder runs `prisma generate`.
- Next.js page-data collection requires a non-empty `RESEND_API_KEY`. The Dockerfile passes `re_build_placeholder` on the build command only; it is not stored as a runtime image ENV.
- Do not bake `.env.local` or production credentials into the image. Supply runtime secrets at container start.

Never deploy as an incidental completion step. Deployment requires explicit user intent.

### Safe Docker image verification

```bash
docker build -t vostudiofinder:local-test .
docker run --rm vostudiofinder:local-test node -v
```

A smoke-start may use **fake** environment values only. Do not pass production `DATABASE_URL`, Stripe, Resend, or Neon credentials. `/api/health` queries PostgreSQL; reaching `node server.js` listening on port 4000 is enough to prove the standalone entrypoint without contacting production systems.

Do not claim a Docker **deployment** was tested if only the image was built or smoke-started locally.

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

Run `npm run health` for cheap static governance/drift checks. `npm run health:full` adds available local deterministic checks when dependencies/environment support them. Dated command results live in `docs/CODEBASE_AUDIT_2026-08-31.md`. A production build remains opt-in for `health:full` via `HEALTH_BUILD=1`.

## Recovery first

For production-risk work, define stop conditions and recovery before mutation. Report implementation verification separately from post-deploy monitoring/user acceptance.
