# Environment Configuration

Status: canonical environment contract guide
Last reviewed: 2 September 2026 (Vercel/Docker output split)

## Principle

Environment files contain deployment-specific values. Never commit real secrets. `env.example` is the repository template; exact values live in `.env.local` or the hosting secret store.

Copy `env.example` to `.env.local` and replace placeholders. Do not copy production values into the example file.

## Node.js

Supported major for development and deployment is **Node 24 LTS**. `package.json` `engines.node` is `>=22 <25` so Node 22 (Maintenance LTS) still installs without npm rejection. Docker and `.nvmrc` / `.node-version` pin the 24 major. Do not use Node 25 (EOL).

## Client-visible variables

Variables beginning with `NEXT_PUBLIC_` are exposed to browser code. Current public keys:

- `NEXT_PUBLIC_BASE_URL` — canonical site origin (also used in emails/cron when set)
- `NEXT_PUBLIC_SITE_URL` — optional alias if `NEXT_PUBLIC_BASE_URL` is unset
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `NEXT_PUBLIC_GIT_COMMIT_DATE` / `NEXT_PUBLIC_BUILD_VERSION` — injected at build from git/CI; do not set by hand

`next.config.ts` also maps `GOOGLE_MAPS_API_KEY` onto `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, and maps `CUSTOM_KEY` into the client bundle if present. Never place server secrets in a `NEXT_PUBLIC_*` variable or in `CUSTOM_KEY`.

## Runtime categories

Required for a functioning app (local or production):

- PostgreSQL: `DATABASE_URL`
- NextAuth: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Stripe: secret/publishable keys, webhook secret, server-owned price IDs
- Resend: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (reply-to and booking-from are optional)
- Cloudinary
- Cron: `CRON_SECRET`
- Turnstile (signup bot protection)
- Google Maps (search/geocoding UI)

Optional at runtime:

- Redis (`REDIS_URL` and related) — cache is skipped when unset
- Sentry webhook/org/project/token — admin error-log sync and inbound webhook only; `@sentry/nextjs` is not a runtime dependency
- OAuth provider pairs — only for the matching sign-in method
- `RESEND_REPLY_TO_EMAIL`, `RESEND_BOOKING_FROM_EMAIL`, `CUSTOM_KEY`

Tooling only (not required to boot the app):

- `NEON_API_KEY` / `NEON_PROJECT_ID` — `scripts/cleanup-neon-branches.ts`
- `GSC_OAUTH_CLIENT_PATH` — Search Console indexing script
- `HEALTH_BUILD` — opt-in production build inside `npm run health:full`

Test-only:

- `TEST_DATABASE_URL` — required for mutating Jest integration tests. Must be an isolated database. Never production. Never the shared development database.

Platform-injected (omit from `.env.local`): `NODE_ENV`, `VERCEL`, `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_GIT_COMMIT_DATE`, `GITHUB_RUN_NUMBER`, `NEXT_RUNTIME`.

`VERCEL` is set by the Vercel build environment. `next.config.ts` uses it only to disable Next.js `output: 'standalone'` on Vercel while keeping standalone for local/Docker packaging. Do not set `VERCEL` in `.env.local` unless you are deliberately simulating a Vercel-mode build.

## Removed from the example (Phase 2C)

These names are not referenced by current `src/`, `scripts/`, or `next.config.ts`:

- Turso (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) — Prisma uses PostgreSQL
- PayPal client credentials — leftover from a retired payment path (the Prisma `PAYPAL` enum value is unrelated)
- Legacy admin (`AUTH_USERNAME`, `AUTH_PASSWORD`, `JWT_SECRET`) — NextAuth replaced this
- Legacy MySQL dump import (`LEGACY_DB_*`)
- `BATEY_TEST_PASSWORD` — the script it documented is gone

## Environment separation

- Local development: non-production databases and Stripe test mode.
- Preview/staging: isolated non-production data/payment/email resources when available.
- Production: values live in the deployment platform secret store, not committed files.

Before database, Stripe, real-email or destructive operations, identify the environment explicitly.

## Docker

Do not bake `.env.local` or production credentials into the image. `.dockerignore` excludes env files, private docs/scripts, backups and Git metadata. Runtime secrets belong in the orchestrator/`docker run -e`/Compose `env_file` at **run** time, not build time.
