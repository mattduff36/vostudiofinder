# Architecture

Status: canonical
Audit baseline: 31 August 2026

## Runtime

- Next.js App Router application (security baseline 16.3.3)
- React + TypeScript
- PostgreSQL through Prisma
- NextAuth v4-era authentication integration
- Vercel deployment and cron configuration
- Cloudinary images
- Stripe payments/membership
- Resend email
- Google Maps/location services
- Redis-compatible caching where configured
- Docker packaging uses Node 24 Alpine and Next.js `output: 'standalone'` (Vercel remains the primary host)
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
- `src/proxy.ts` — Next.js 16 request-boundary file. URL/query sanitisation and canonical 301 redirects only; not authentication or membership gating

## Request boundary (`src/proxy.ts`)

Next.js 16 uses the `proxy.ts` file convention (migrated from deprecated `middleware.ts` in Phase 2E). The function sanitises inbound URLs:

- Known static pages (`/`, `/about`, `/privacy`, `/terms`, `/help`, `/blog`) drop any query string via a 301 redirect.
- `/studios` keeps an explicit search-parameter whitelist, rejects toxic keys/values and non-finite numeric values, and 301-redirects when the query is not already canonical.
- Other matched non-excluded paths drop any query string via a 301 redirect.
- Prefixes `/api`, `/admin`, `/dashboard`, `/auth`, `/_next`, `/private`, and `/email/unsubscribe` are passed through without query stripping.
- The matcher continues to exclude Next static assets, the image optimizer, `favicon.ico`, `robots.txt`, `sitemap.xml`, and paths with a file extension.

Proxy runs on Next.js's supported Node.js runtime. It does not import Prisma, NextAuth, Stripe, or Resend, and it does not fetch data. Focused unit tests live in `tests/unit/proxy.test.ts`.

## Data flow principles

- Prefer server-side data access for protected/persistent data.
- API routes validate untrusted input and enforce auth/role/membership at the server boundary.
- Client components should receive only data required for UI behaviour.
- External providers are explicit failure/trust boundaries.
- Payment and membership state changes should be transaction/idempotency aware.

## Known architecture drift

See `CODEBASE_AUDIT_2026-08-31.md` for the audit backlog. Docker uses Node 24 LTS with Next.js `output: 'standalone'`. Next.js is on the August 2026 Active LTS security release 16.3.3. The deprecated `middleware.ts` convention was migrated to `src/proxy.ts` in Phase 2E. Remaining items include Prisma major-version lag, Sentry intent drift and disabled CI.
