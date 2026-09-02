# Codebase Health Checker

The health checker is intentionally cheap and mostly static. It detects governance/config drift without requiring production credentials or network access.

Package scripts:

```json
"health": "node scripts/health/health.mjs --mode=quick",
"health:full": "node scripts/health/health.mjs --mode=full"
```

## Quick mode

Checks project governance files, environment-contract drift (`env.example` vs `process.env` in `src/`, `scripts/`, and `next.config.ts`; platform-injected keys including `VERCEL` are ignored), Docker Node major (supported: 24 LTS), Docker/Next standalone contract (Vercel-conditional: standalone enabled for local/Docker, disabled when `VERCEL` is set), Next.js security baseline (declared `package.json` and lockfile resolved `next` must be semver `>= 16.3.3`, the August 2026 Active LTS floor; prereleases fail), Auth.js / NextAuth v4 security baseline (declared and lockfile `next-auth` must be semver `>= 4.24.15` when major is 4; a future deliberate major `>= 5` is accepted by this floor and is not a v5 migration), Next 16 Proxy convention (`src/proxy.ts` present and deprecated `src/middleware.ts` absent), disabled CI, production query logging, high-risk TODOs, large-file advisory hotspots, obvious tracked sensitive paths and `git diff --check`.

The standalone contract PASSes when `next.config.ts` assigns `output: 'standalone'` only when `VERCEL` is unset. It FAILs if standalone is unconditional (breaks Vercel on Next.js 16.3) or missing (breaks Docker).

The Next.js floor is a numeric major/minor/patch comparison, not a string compare. Update `NEXT_MIN_SECURE` in `health.mjs` when a later required secure release is adopted. The Proxy convention check PASSes when only `src/proxy.ts` exists and FAILs if `src/middleware.ts` returns, both files exist, or neither convention is present.

WARN is informational and does not fail the command. FAIL indicates a structural/security verification problem and returns non-zero.

## Full mode

When `node_modules` exists, full mode additionally runs:

- `npm run type-check`
- `npm run lint`
- Jest unit tests under `tests/unit` (`npx jest tests/unit --runInBand`)

Full mode does **not** run database integration tests or live-server HTTP tests. Those require `TEST_DATABASE_URL` or a listening app; see `docs/TESTING.md`.

A production build is intentionally opt-in because the current app may require environment/database access during build:

```bash
HEALTH_BUILD=1 npm run health:full
```

Do not interpret skipped environment-dependent checks as passed.
