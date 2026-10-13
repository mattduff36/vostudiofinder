# Testing

Status: canonical verification guide
Last reviewed: 12 October 2026 (reviewed admin implementation)

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

`tests/unit/proxy.test.ts` covers the Next.js Proxy matcher and URL/query sanitisation (static-page stripping, `/studios` whitelist, toxic/encoded values, excluded prefixes, 301 redirects). Those tests are class A and run under `npm run test:unit`.

Remaining backlog after Phase 2E includes disabled CI, Prisma query logging, and high-risk payment/auth TODOs. Environment-example drift, Docker Node 25, the Docker/standalone mismatch, the Next.js 16.3.3 security baseline, and `middleware.ts` → `proxy.ts` were addressed in Phases 2C–2E.

## Do not weaken proof

Do not skip, delete, loosen or rewrite assertions simply to make a change pass. Fix the implementation or document a genuine baseline/contract change. Do not treat a skipped or refused class B/C run as a passed test.

## Reviewed admin regression checks

The October 2026 admin work adds focused tests in `tests/unit/admin`, `tests/unit/email` and `tests/unit/payments`. `npm test` includes them. Keep the original completion compatibility suite in the explicit selection as well:

```sh
npx jest tests/profile-completion.test.ts tests/unit/admin/profile-completion-contract.test.ts --runInBand
npm test
npm run type-check
npm run lint
```

The completion tests preserve all 18 predicates, required/optional counts and legacy weighting. Other targeted checks cover editor write coordination, list response ownership, role-only access, overlays/navigation, campaign recipient identity and recovery, refund outcomes, notes conflicts, error redaction and content controls. These tests mock authentication, database and provider boundaries where relevant; their assertions do not prove real SQL transaction behavior.

### Actual PostgreSQL transaction gate

The following six reviewed suites require a deliberately provisioned, disposable PostgreSQL fixture. They accept only the exact host `127.0.0.1`, port `55432` and database `vsf_admin_fixture_utf8` through explicit `TEST_DATABASE_URL`; they refuse a shared database fallback. The initial schema and the three additive admin migrations must already be applied to that fixture, with its matching Prisma client generated. Use an empty campaign queue for global worker/capacity tests. No fixture provisioning or migration command below targets an application database.

```sh
npx jest --runInBand \
  tests/integration/admin/studio-list.test.ts \
  tests/integration/admin/shared-workflows.test.ts \
  tests/integration/admin/content-reservation-writes.test.ts \
  tests/integration/admin/refund-lifecycle.test.ts \
  tests/integration/admin/purchased-benefit-holds.test.ts \
  tests/integration/email/campaign-lifecycle.test.ts
```

These tests use actual transactions, constraints, row/advisory locks and independent clients. All Stripe, email and Sentry effects use synthetic adapters. Tests remove only their invented fixture IDs in foreign-key-safe order; a cleanup failure must be fixed, not hidden by dropping constraints. The gate covers coherent studio rows/counts and derived ordering, support replay/status conflicts, triage cleanup/reimport, FAQ concurrent reorder, reservation activation/deletion, refund amount reservations and recovery, exact benefit intervals/overlaps, campaign claims, identity changes and a bounded 10,000-recipient start. Logged bytes, query counts and timings describe these fixtures, not production capacity or a service-level objective.

### Admin browser gate

`playwright.admin.config.ts` and `tests/browser/admin-studios-reviewed.spec.ts` exercise the actual admin routes with a signed synthetic session and intercepted API responses. The controlled list contains 480 studios so the 80-to-400 loaded prefix and subsequent paging are exercised. External browser requests are blocked. The test server receives a fake unreachable loopback database, fake provider keys and disabled operational flags.

```sh
npx playwright test --config=playwright.admin.config.ts
```

The default starts an owned Next development server on `127.0.0.1:4208`. For production-runtime verification, build in an explicitly safe fixture environment first and set `VSF_ADMIN_USE_BUILD=1` for that invocation; it then uses `next start` against the existing build. Never run a build and development server against the same `.next` directory concurrently. `VSF_ADMIN_CHROMIUM_PATH` optionally selects an existing local Chromium executable. Normal results go to `test-results/admin-reviewed-v2`; `VSF_ADMIN_BROWSER_OUTPUT_DIR` can select a separate evidence directory.

The browser checks cover collapsed screenshots, simultaneous expansion without reads, explicit section editing, clean close without list refresh, partial privacy saves, ordinary save, dirty-close decisions, native background inertness, focus/scroll restoration, Back/Forward draft recovery and the Suggestions drawer's actual responsive breakpoint. `VSF_ADMIN_BASELINE_DIR` can point at an untouched checkout for controlled collapsed-screen comparisons; revised-only assertions are then deliberately skipped and must not be counted as baseline passes.

Shared owner/self-edit, image-cropper and public-image/What's New checks use an isolated test checkout importing unchanged current components and canonical styles. Such test-only fixture routes/layouts must never be copied into the production app. Record which server/API boundaries are substituted, and distinguish component browser evidence from a full customer/auth/provider integration test. The dated [implementation report](archived/ADMIN_REVIEW_IMPLEMENTATION_2026-10-13.md) carries the 22-route smoke matrix, concrete run results and controlled screenshots. The [portable isolated harness](../tests/fixtures/admin-route-smoke-harness/README.md) preserves the exact route/component specs, configs, synthetic API/server adapters and explicit reproduction boundaries. Keep its `isolated-overrides` under tests and copy them only into a disposable validation checkout; never into application `src`.
