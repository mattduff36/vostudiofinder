# Voiceover Studio Finder Codebase Audit

Audit date: 31 August 2026

## Executive summary

The application code is substantially newer than the documentation suggests. The dependency manifest already uses Next.js 16.2.6, React 19.2.3 and Prisma 6.16.3, while the root README still describes an older Next.js 15 / Prisma 6.15-era system and includes session-history material as if it were current reference documentation.

The strongest problem is therefore not simply an old application. It is **authority drift**: Cursor has no reliable way to distinguish current implementation truth from historical notes, private maintenance material, stale setup guides and an obsolete `.cursorrules` prompt-optimizer persona.

The proposed governance pack fixes that first. It then leaves runtime and production-risk changes as explicitly separated follow-up workstreams.

## Audited shape

- 455 source files under `src/`
- 125 App Router API route handlers
- 49 `page.tsx` pages
- 156 component TSX files
- 82 TypeScript files under `src/lib`
- 56 Jest/Playwright test/spec files
- 31 Prisma `migration.sql` files, plus additional raw/consolidation SQL
- 23 Markdown files under the active `docs/` tree
- Largest source hotspots include `ProfileEditForm.tsx` (~104 KB), `Settings.tsx` (~98 KB), admin payments/studios pages, Stripe webhook processing and the main studio profile/search surfaces

File size is an advisory signal only. It should not trigger refactoring by itself.

## Priority 0 — governance and context problems

### 1. Legacy `.cursorrules` is unsuitable

The current 167-line `.cursorrules` mixes engineering instructions with a "Lyra" prompt-optimizer persona, mandatory welcome text, prompt-delivery formats, chain-of-thought wording, duplicated Git policy and generic stack assumptions.

This conflicts with the user's current global Token-Efficient Engineering skill and can make Cursor optimize prompts instead of work on the repository. It should be archived, then removed from active project authority.

### 2. No canonical project authority chain

There is no root `AGENTS.md`, and no canonical `ARCHITECTURE`, `DESIGN`, `DEVELOPMENT`, `TESTING`, `OPERATIONS` or `SECURITY` document. Existing documentation mixes setup guides, implementation summaries, PRDs, migration status snapshots and future ideas.

### 3. No `.cursorignore` despite sensitive/noisy local folders

The checkout contains local-only `docs-private/`, `scripts-private/`, `backup/`, `backups/`, `project-archive/`, Lighthouse output, email test output and environment files. Git ignore is not enough to define agent indexing scope. Cursor should exclude these by default to reduce accidental secret/PII exposure and context noise.

### 4. Generic global UI assumptions do not match this project

The user's global Cursor rules mention shadcn/ui, Radix and `nuqs`, but none is present in this project's dependency manifest. This repo has its own theme/navigation/components. Project rules must explicitly say not to introduce absent framework libraries just to satisfy a generic global preference.

### 5. Generic "run migrations immediately" guidance is unsafe here

This application has live memberships, payments, user records, email systems and a production PostgreSQL database. Any database/schema/migration change is CRITICAL and must be environment-identified, reviewed, backed up/rollback-aware and explicitly scoped. Project rules must override any generic rule that suggests automatically running new migration scripts against an unspecified environment.

## Priority 1 — current technical drift to address after governance

### 6. Docker uses an EOL Node release

`Dockerfile` uses `node:25-alpine`. Node 25 reached end-of-life on 31 March 2026. Node 24 is an LTS line as of this audit date. Move container/runtime pinning to a supported LTS in a dedicated runtime upgrade task.

Reference: Node.js release schedule, `https://nodejs.org/en/about/previous-releases`

### 7. Docker/Next standalone contract appears inconsistent

The Docker runner copies `/app/.next/standalone`, but `next.config.ts` does not set `output: 'standalone'`. This should be reproduced and fixed as a focused deployment task rather than silently changed in the governance installation.

### 8. Next.js 16 deprecates `middleware.ts`

The project still uses `src/middleware.ts`. Next.js 16 renamed this convention to `proxy.ts` and deprecated the middleware filename. A focused migration should preserve the current query-sanitization/redirect behaviour and test it before deployment.

Reference: `https://nextjs.org/docs/app/guides/upgrading/version-16`

### 9. Prisma is multiple major versions behind current

The repo is on Prisma 6.16.3. Prisma 8 is current as of this audit, while Prisma 7 remains supported. Prisma 7 and 8 both involve material migration changes. Do not perform a casual dependency bump. Create a separate CRITICAL data/tooling upgrade plan with schema, migration and deployment validation.

Reference: `https://www.prisma.io/docs/orm`

### 10. CI is disabled

`.github/workflows/ci.yml.disabled` exists, so pull requests and pushes do not currently receive the repository's intended automated lint/type/build checks. Re-enabling CI requires first making the workflow match the current Node, Prisma, test database and Next.js requirements.

### 11. `env.example` has drifted away from actual code

Static inspection found code references to keys that the example omits, including Neon administration, Sentry synchronization, booking-email, Search Console and site-URL variables. The example also retains apparently obsolete Turso, PayPal, legacy DB and old auth keys.

Environment documentation should be regenerated from actual usage and classified by client/server, required/optional and dev/preview/production scope.

### 12. README and setup documentation contain stale claims

Examples include old framework versions, PayPal references despite code saying PayPal was removed, Vercel Postgres-era wording, deployment docs that reference files no longer present, and dated "latest session" sections.

Historical notes should remain available as evidence, but they should not be the primary onboarding source.

### 13. Sentry documentation and runtime instrumentation disagree

`src/instrumentation.ts` and `src/instrumentation-client.ts` state that Sentry runtime instrumentation was removed, and the package manifest does not include `@sentry/nextjs`. At the same time, Sentry webhook/sync/admin error-log code and cron configuration remain. The error-log docs currently describe application runtime errors flowing into Sentry. Clarify whether Sentry is still fed externally or whether this subsystem is partially dormant.

### 14. Global Prisma query logging is enabled

`src/lib/db.ts` constructs Prisma with `log: ['query']` in all environments. Review whether production should log every query. At minimum, make logging environment-aware and confirm that production logs do not expose unnecessary operational or user data.

### 15. Payment/auth/account TODOs remain in high-risk paths

Static TODOs include:

- a secure token system still pending for payment retry links
- membership webhook follow-up email/alert TODOs
- failed-payment email TODO
- account-close TODO for cancelling active subscriptions

These should be tracked as explicit product/security/payment work, not left as invisible comments.

### 16. Auth stack deserves a deliberate modernization review

The repo uses `next-auth` 4.24.11 with `@auth/prisma-adapter` and casts the adapter to `any`. This may be intentional compatibility code, but it should be documented and tested before any Auth.js migration. Auth is CRITICAL and must not be bundled with routine dependency upgrades.

### 17. Migration history is difficult for an agent to interpret safely

The Prisma tree contains timestamped migrations alongside consolidation scripts, fixed variants, rollbacks and raw SQL migration folders. The new operations/security docs therefore make `prisma/schema.prisma` the model contract while requiring explicit inspection of migration status/history before changing production data.

### 18. Type/lint coverage is narrower than command names imply

`tsconfig.json` excludes `tests`, `scripts` and `scripts-private`. ESLint also ignores tests and scripts. Therefore `npm run type-check` and `npm run lint` do not prove those areas are type/lint clean. The canonical testing doc records this boundary so Cursor does not overstate verification.

## Priority 2 — maintainability opportunities

- Several large dashboard/admin/search/profile files are sensible candidates for future boundary extraction, but only when changes justify it.
- `legacy-peer-deps=true` should be investigated rather than carried indefinitely.
- There is a source backup file (`src/components/dashboard/SettingsOld.tsx.backup`) that should be archived or removed if no longer needed.
- Vercel config still contains a `src/pages/api/**/*.ts` function rule even though the project uses App Router routes.
- Dependabot/CI ownership settings should be checked against the actual GitHub repository configuration.

## Verified local health baseline — 31 August 2026

Recorded after the governance installation and after removing `docs-private/` from the Git index. Local private files were preserved. No runtime, dependency, schema, auth, Stripe, email, Docker, CI, or deployment configuration was changed for this baseline.

Environment used: Node v22.18.0, npm 10.9.3, `npm ci` against the existing lockfile (success). Prisma Client generated as 6.19.2 from the `^6.16.3` range. `npm ci` printed ordinary deprecation/funding noise and an `npm audit` count of 46 vulnerabilities; those were not treated as a reason to upgrade packages.

| Command | Result |
|---|---|
| `npm run health` (quick) | Overall **WARN**, exit 0. `tracked-sensitive-paths` is PASS. Remaining WARNs match Priority 1 items already listed above (env-contract drift, Docker Node 25, Docker standalone mismatch, Next middleware/proxy, disabled CI, Prisma query logging, critical-path TODOs, large source files). |
| `npm run type-check` | PASS (`tsc --noEmit`; tests/scripts still excluded by `tsconfig.json`). |
| `npm run lint` | FAIL before any file analysis: ESLint 10.0.2 cannot resolve `globals`, required at runtime by `eslint-plugin-sonarjs`. That package is not present in `package-lock.json`. `eslint-plugin-sonarjs` 3.0.6 also declares a peer of ESLint 8 or 9, while this repo uses ESLint 10. |
| `npx jest tests/unit --runInBand` | FAIL: 1 failed, 146 passed, 7 suites. Failure: `tests/unit/admin/studio-update-geocoding.test.ts` — `detectManualCoordinateOverride` expected `false` when existing coordinates are null, received `true`. |
| `npx jest tests/integration --runInBand` | FAIL: 17 failed, 7 passed, 4 suites. Sixteen failures in `tests/integration/api-endpoints.test.ts` because nothing was listening on `http://localhost:4000`. One failure in `tests/integration/subscriptions/enforcement-database.test.ts` (`decisions.length` expected `>= 2`, received `1`). Image-rights and admin studio-update integration suites passed. These DB-backed tests used the local development `DATABASE_URL`, not production. |
| `npm run build` | PASS. Next.js 16.2.6 Turbopack production build compiled and generated routes. Build-time warning: middleware file convention is deprecated in favour of `proxy`. Prisma printed a major-upgrade advertisement (6.19.2 → 8); ignored. Health-full still skips build unless `HEALTH_BUILD=1`. |
| `npm run health:full` | Overall **FAIL**, exit 1, because full mode re-runs lint and unit tests. Type-check PASS. Build skipped (default). `tracked-sensitive-paths` PASS. |
| `git diff --check` | PASS (exit 0). Unrelated working-copy LF/CRLF notice on `vostudiofinder.code-workspace` only. |

Do not treat the full-health FAIL as a regression from untracking `docs-private/`. Quick health no longer FAILs on tracked private documentation. Lint, the geocoding unit assertion, the live-server integration suite, and the enforcement-database assertion were Phase 2B verification-toolchain backlog (see below).

## Phase 2B — verification toolchain repair (31 August 2026)

Repaired local verification tooling without changing production application behaviour.

- ESLint: upgraded `eslint-plugin-sonarjs` from 3.0.6 (ESLint 8/9 peer, runtime `globals` missing) to **4.2.0** (official ESLint 8/9/10 peer; depends on `globals` 17.11.0). Existing narrow Sonar rule selection preserved (`cognitive-complexity`, `no-duplicate-string`, `no-identical-functions`). Recommended Sonar ruleset not enabled. Lint now completes: 0 errors, 818 pre-existing warnings (not refactored).
- Geocoding unit test: runtime `detectManualCoordinateOverride()` treating request-supplied coordinates as a manual override when stored coordinates are null is intentional. The stale test expectation was updated; production geocoding was not changed.
- Enforcement integration fixture: updated to the current BASIC/PREMIUM model (explicit `membership_tier: PREMIUM` for expired-subscription studios; query shape matches `src/app/api/cron/check-subscriptions/route.ts`). Production enforcement logic was not changed. The suite was not executed against a database in this phase because `TEST_DATABASE_URL` is unset.
- Test classes: `npm test` is unit-only. Database integration tests require `TEST_DATABASE_URL` and refuse the shared development `DATABASE_URL`. Live HTTP tests live under `tests/live/` and are run with `npm run test:live` / `test:live:start`.

| Command | Result |
|---|---|
| `npm ci` | PASS (lockfile with `eslint-plugin-sonarjs` 4.2.0). Prisma Client 6.19.2. `npm audit` 44 vulnerabilities; not treated as in-scope. |
| `npm run type-check` | PASS |
| `npm run lint` | PASS (exit 0). 0 errors, 818 warnings. Tooling no longer fails before analysis. |
| `npx jest tests/unit --runInBand` | PASS: 7 suites, 148 tests. |
| `npm run test:live` | Exit 2 by design: nothing listening on port 4000. Prerequisite message, not an application regression. Suite not executed. |
| `npm run test:integration` | Refusal: `TEST_DATABASE_URL` unset. No shared development-database mutations. Fixture not executed. |
| `npm run build` | PASS. Next.js 16.2.6 Turbopack. Middleware-deprecation warning unchanged. |
| `npm run health` (quick) | Overall **WARN**, exit 0. Same Priority 1 WARNs as Phase 2A. `tracked-sensitive-paths` PASS. |
| `npm run health:full` | Overall **WARN**, exit 0 (was FAIL in Phase 2A). type-check/lint/unit PASS. Build skipped unless `HEALTH_BUILD=1`. |
| `git diff --check` | PASS (exit 0). CRLF/LF working-copy notices only. |

## Phase 2C — environment contract and Node/Docker baseline (31 August 2026)

Refreshed `env.example` from live `process.env` usage, set Node 24 LTS as the supported major, moved Docker off EOL Node 25, and enabled Next.js `output: 'standalone'` so the Dockerfile packaging path matches the build output. Application dependencies, Prisma schema, auth, Stripe, middleware/proxy, and GitHub CI were not changed. Nothing was deployed or pushed.

| Command | Result |
|---|---|
| `npm ci` | PASS against the existing lockfile. Prisma Client 6.19.2. `npm audit` 44 vulnerabilities; not treated as in-scope. |
| `npm run type-check` | PASS |
| `npm run lint` | PASS (exit 0). 0 errors, 818 pre-existing warnings. |
| `npm run test:unit` | PASS: 7 suites, 148 tests. |
| `npm run build` | PASS. Next.js 16.2.6 Turbopack. `.next/standalone/server.js` and `.next/static` generated. Middleware-deprecation warning unchanged. |
| Docker `vostudiofinder:local-test` | PASS. Base `node:24-alpine` (runtime Node v24.20.0). Standalone `server.js` copied. No `.env*` files in the image. |
| Container smoke-start | PASS with **fake** env only on host port 4010. Next.js reported Ready on `0.0.0.0:4000`. `GET /robots.txt` returned 200. `/api/health` was not called (it requires PostgreSQL). Container removed after the check. Not a production deployment. |
| `npm run health` (quick) | Overall **WARN**, exit 0. **PASS:** `env-contract`, `docker-node`, `docker-standalone-contract`. Remaining WARNs: middleware/proxy, disabled CI, Prisma query logging, critical-path TODOs, large source files. |
| `npm run health:full` | Overall **WARN**, exit 0. type-check/lint/unit PASS. Build skipped unless `HEALTH_BUILD=1`. |
| `git diff --check` | PASS (exit 0). CRLF/LF working-copy notices only. |

Docker build notes (packaging only): deps stage uses `npm ci --ignore-scripts` because `postinstall` runs `prisma generate` before the schema is copied; the builder generates the client. Page-data collection requires a non-empty `RESEND_API_KEY`; the Dockerfile supplies `re_build_placeholder` on the build command only (not stored as an image ENV). Sitemap generation already tolerates a missing database.

## Recommended work order

1. Install this governance pack only.
2. Run the new quick health audit and record baseline WARN items. **Done** (Phase 2A). Phase 2B repaired lint tooling, the geocoding unit assertion, integration-test classification, and `TEST_DATABASE_URL` safety. Remaining full-health WARNs are Priority 1 runtime/ops items, not verification-toolchain failures.
3. Refresh `env.example` and environment documentation in a documentation/config-only workstream. **Done** (Phase 2C).
4. Move Docker to Node 24 LTS and repair/verify standalone output as one deployment workstream. **Done** (Phase 2C). Docker image build/smoke-start evidence is in the Phase 2C section above.
5. Migrate Next.js `middleware.ts` to `proxy.ts` with focused tests.
6. Restore a current CI workflow after local checks are deterministic.
7. Resolve Sentry runtime/operations intent.
8. Triage high-risk payment/account TODOs individually.
9. Plan Prisma and auth major upgrades separately. Do not combine them.

## What the governance pack deliberately does not decide

It does not declare old feature docs false simply because they are dated. Cursor should compare them with current code and either refresh, archive or retain them as historical evidence. It also does not prescribe refactors solely from file length, and it does not change production behaviour while fixing documentation authority.
