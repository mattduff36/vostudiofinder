# Architecture

Status: canonical
Audit baseline: 31 August 2026

## Runtime

- Next.js App Router application
- React + TypeScript
- PostgreSQL through Prisma
- NextAuth v4-era authentication integration
- Vercel deployment and cron configuration
- Cloudinary images
- Stripe payments/membership
- Resend email
- Google Maps/location services
- Redis-compatible caching where configured
- Sentry-related sync/webhook/admin error-log subsystem remains in code, while direct runtime instrumentation appears removed

Exact package versions are authoritative in `package.json` and `package-lock.json`.

## Major layers

### `src/app`

Pages, layouts and App Router route handlers. API endpoints are grouped by admin, auth, user, membership, Stripe, cron, email, search, studio and webhook concerns.

### `src/components`

Feature/UI components grouped around admin, auth, dashboard, maps, membership, navigation, search, studio/profile and common UI.

### `src/lib`

Server/domain helpers for auth, membership, subscriptions, Stripe, email, location, search, profile, SEO, caching, admin and shared utilities.

### `prisma`

`schema.prisma` is the current model contract. Migration history contains both timestamped Prisma migrations and older/consolidation/raw SQL material. Never infer safe production migration order without inspecting actual migration status.

## Key shared sources of truth

- `src/lib/theme.ts` — brand/theme/z-index tokens
- `src/config/navigation.ts` — navigation registry
- `src/lib/membership-tiers.ts` — tier limits and price display constants
- `src/lib/membership.ts` — membership state/access helpers
- `src/lib/auth.ts` — auth providers/callbacks/events
- `src/lib/db.ts` — Prisma client lifecycle
- `prisma/schema.prisma` — database model contract
- `vercel.json` — deployment route headers/redirects and cron schedules

## Data flow principles

- Prefer server-side data access for protected/persistent data.
- API routes validate untrusted input and enforce auth/role/membership at the server boundary.
- Client components should receive only data required for UI behaviour.
- External providers are explicit failure/trust boundaries.
- Payment and membership state changes should be transaction/idempotency aware.

## Known architecture drift

See `CODEBASE_AUDIT_2026-08-31.md` for the audit backlog. Important items include Node 25 Docker EOL, Next.js middleware deprecation, Docker standalone mismatch, Prisma major-version lag, Sentry intent drift and disabled CI.
