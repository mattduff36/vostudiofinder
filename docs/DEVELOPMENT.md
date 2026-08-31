# Development

Status: canonical engineering workflow
Last reviewed: 31 August 2026

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

## TypeScript

The application uses strict TypeScript settings. Note that the current `tsconfig.json` excludes tests and scripts, so `npm run type-check` does not validate those trees.

## Lint

ESLint covers application/config JavaScript/TypeScript but currently ignores tests and scripts. Report that limitation rather than overstating coverage.

## Dependencies

Do not mix opportunistic dependency upgrades into feature/bugfix work. Runtime/framework/auth/database upgrades should be scoped separately with release notes and compatibility checks.

## Data/auth/payments

Schema/migration, production-data, auth/permission, Stripe/money and destructive changes are CRITICAL. Follow `docs/OPERATIONS.md`, `docs/SECURITY.md` and the safe-operations skill.

## Documentation

Update canonical docs when a change intentionally alters architecture, product behaviour, design standards, development/testing procedure, operations or security. Dated implementation summaries should not become new canonical docs.
