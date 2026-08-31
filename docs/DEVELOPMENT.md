# Development

Status: canonical engineering workflow
Last reviewed: 31 August 2026 (Phase 2E Next.js proxy migration)

## Baseline commands

Read `package.json` for the exact current scripts. Common commands include:

- `npm run dev`
- `npm run type-check`
- `npm run lint`
- `npm test` (unit tests under `tests/unit` only)
- `npm run test:integration` (requires `TEST_DATABASE_URL`)
- `npm run test:live` / `npm run test:live:start` (requires or starts the app on port 4000)
- `npm run build`
- `npm run health`
- `npm run health:full`

See `docs/TESTING.md` for the unit / database-integration / live-server test classes.

## Workflow

1. Read `AGENTS.md` and applicable scoped Cursor rules.
2. Route the task through the user's global TEE skill.
3. Search narrowly and identify the current source of truth for the domain.
4. Make the smallest cohesive change that satisfies the contract.
5. Run targeted verification first.
6. Run broader verification proportional to the risk/lane.
7. Inspect the final diff.
8. Commit locally for completed coding tasks under the user's Git policy. Do not push without explicit authorization.

## Node.js

Install Node 24 LTS when possible (`nvm use` / `fnm use` reads `.nvmrc`). `package.json` `engines.node` is `>=22 <25` so Node 22 still installs without rejection. Application dependencies are not upgraded merely to match a local Node 22 toolchain.

## TypeScript

The application uses strict TypeScript settings. Note that the current `tsconfig.json` excludes tests and scripts, so `npm run type-check` does not validate those trees.

## Lint

ESLint covers application/config JavaScript/TypeScript but currently ignores tests and scripts. Report that limitation rather than overstating coverage.

## Dependencies

Do not mix opportunistic dependency upgrades into feature/bugfix work. Runtime/framework/auth/database upgrades should be scoped separately with release notes and compatibility checks.

The current Next.js security baseline is **16.3.3** (declared `^16.3.3`, lockfile 16.3.3). React remains `^19.2.3` (lockfile 19.2.4). There is no `eslint-config-next` package in this repo. `legacy-peer-deps=true` in `.npmrc` is a pre-existing install setting, not a new workaround from the 16.3.3 update.

The Next.js request-boundary file is `src/proxy.ts` (the supported Next 16 convention). Query-sanitisation behaviour is covered by `tests/unit/proxy.test.ts` and is included in `npm run test:unit`. Do not reintroduce `src/middleware.ts`.

## Data/auth/payments

Schema/migration, production-data, auth/permission, Stripe/money and destructive changes are CRITICAL. Follow `docs/OPERATIONS.md`, `docs/SECURITY.md` and the safe-operations skill.

## Documentation

Update canonical docs when a change intentionally alters architecture, product behaviour, design standards, development/testing procedure, operations or security. Dated implementation summaries should not become new canonical docs.
