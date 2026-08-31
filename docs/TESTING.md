# Testing

Status: canonical verification guide
Last reviewed: 31 August 2026

## Current tools

- Jest + Testing Library for unit/integration-style tests
- Playwright for browser/E2E scenarios
- TypeScript compiler for application type checking
- ESLint + Oxlint
- Lighthouse CI configuration
- Health checker in `scripts/health/`

## Important coverage boundaries

Current `tsconfig.json` excludes `tests`, `scripts` and `scripts-private`. Current ESLint configuration also ignores tests and scripts. Therefore:

- `npm run type-check` proves application/config types, not all test/script types.
- `npm run lint` does not prove tests/scripts are lint clean.

Do not describe those commands as repository-wide verification until configuration changes.

## Test classes

Jest suites are not interchangeable. Use the class that matches the dependency:

| Class | Location | Command | Requirements |
|---|---|---|---|
| A. Unit | `tests/unit/` | `npm test` / `npm run test:unit` | None. No live app, no database. |
| B. Database integration | `tests/integration/` and other `tests/**/integration/` trees | `npm run test:integration` for `tests/integration/` | `TEST_DATABASE_URL` must point at an **isolated** database. Unique test records with teardown. |
| C. Live-server HTTP | `tests/live/` | `npm run test:live` or `npm run test:live:start` | Next.js app listening at `http://localhost:4000` (or `NEXT_PUBLIC_BASE_URL`). |

`npm test` runs class A only. It does not start a server and does not mutate a database.

Additional Jest files still exist under `tests/auth`, `tests/stripe`, `tests/signup`, `tests/admin`, `tests/refund`, and the `tests/` root. Those are not part of `npm test`. Treat any path containing `/integration/` as class B (mutating) unless proven otherwise.

Playwright (`playwright.config.ts`) can start `npm run dev` itself and is a separate E2E class. Confirm the intended environment before running it.

### Class B — `TEST_DATABASE_URL`

Mutating database integration tests **must not** use the shared development `DATABASE_URL` as an invisible default.

- Set `TEST_DATABASE_URL` in `.env.local` (or the process environment) to an isolated test database.
- Absence of `TEST_DATABASE_URL` is a **refusal**: the suite fails with a prerequisite message. That is not an application regression.
- Do not provision, clone, or migrate a Neon database just to obtain a green integration run.
- Never point `TEST_DATABASE_URL` at production.

`npm run test:integration` runs only `tests/integration/`. Other `/integration/` suites must be invoked explicitly and have the same database requirement.

### Class C — live HTTP server

`tests/live/` issues HTTP requests to the running Next.js app. Nothing listening on port 4000 is a missing prerequisite, not an application regression.

- `npm run test:live` — reuse an already-running `npm run dev`; exit 2 if nothing is listening.
- `npm run test:live:start` — start a local `next dev` on port 4000, wait until ready, run `tests/live`, then shut down the process this script started.

Do not point these tests at production.

## Verification strategy

Use the narrowest meaningful deterministic check first.

- Pure helper/domain change: targeted Jest unit test(s) plus type/lint for changed application code.
- API/auth/membership/payment change: focused unit/integration tests for success, invalid input, authorization and state/idempotency paths. Use class B only with `TEST_DATABASE_URL`.
- UI change: targeted component test where useful plus browser verification for affected responsive/interactive surfaces.
- Next/config/deployment change: type/lint plus a production build in a valid non-production environment, then focused runtime/deployment checks.
- Prisma/schema/data change: CRITICAL migration plan, schema/migration validation, non-production execution and explicit production acceptance.

`npm run health` is the quick governance/static check. `npm run health:full` adds type-check, lint, and class A unit tests. It does not run class B or C. A production build remains opt-in via `HEALTH_BUILD=1`.

## Test environment safety

Before integration/E2E tests that write to a database or call external services, identify the target environment. Never let a test suite mutate production user/payment/email data.

## Baseline (Phase 2B)

If a pre-existing test/lint/build failure exists, capture it as baseline evidence. Do not fix unrelated debt unless it blocks proof of the requested change or the user expands scope.

Phase 2A (31 August 2026) recorded lint-tooling failure, one stale geocoding unit assertion, live-server HTTP tests misclassified as self-contained integration tests, and an enforcement fixture that predated BASIC/PREMIUM membership. Phase 2B repaired that verification toolchain. See `docs/CODEBASE_AUDIT_2026-08-31.md` for the dated command results.

Remaining backlog after Phase 2C includes Next `middleware.ts` → `proxy.ts`, disabled CI, Prisma query logging, and high-risk payment/auth TODOs. Environment-example drift, Docker Node 25, and the Docker/standalone mismatch were addressed in Phase 2C.

## Do not weaken proof

Do not skip, delete, loosen or rewrite assertions simply to make a change pass. Fix the implementation or document a genuine baseline/contract change. Do not treat a skipped or refused class B/C run as a passed test.
