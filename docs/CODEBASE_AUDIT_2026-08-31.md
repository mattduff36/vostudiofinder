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

## Recommended work order

1. Install this governance pack only.
2. Run the new quick health audit and record baseline WARN items.
3. Refresh `env.example` and environment documentation in a documentation/config-only workstream.
4. Move Docker to Node 24 LTS and repair/verify standalone output as one deployment workstream.
5. Migrate Next.js `middleware.ts` to `proxy.ts` with focused tests.
6. Restore a current CI workflow after local checks are deterministic.
7. Resolve Sentry runtime/operations intent.
8. Triage high-risk payment/account TODOs individually.
9. Plan Prisma and auth major upgrades separately. Do not combine them.

## What the governance pack deliberately does not decide

It does not declare old feature docs false simply because they are dated. Cursor should compare them with current code and either refresh, archive or retain them as historical evidence. It also does not prescribe refactors solely from file length, and it does not change production behaviour while fixing documentation authority.
