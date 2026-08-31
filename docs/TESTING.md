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

## Verification strategy

Use the narrowest meaningful deterministic check first.

- Pure helper/domain change: targeted Jest unit test(s) plus type/lint for changed application code.
- API/auth/membership/payment change: focused unit/integration tests for success, invalid input, authorization and state/idempotency paths.
- UI change: targeted component test where useful plus browser verification for affected responsive/interactive surfaces.
- Next/config/deployment change: type/lint plus a production build in a valid non-production environment, then focused runtime/deployment checks.
- Prisma/schema/data change: CRITICAL migration plan, schema/migration validation, non-production execution and explicit production acceptance.

## Test environment safety

Before integration/E2E tests that write to a database or call external services, identify the target environment. Never let a test suite mutate production user/payment/email data.

## Baseline failures

If a pre-existing test/lint/build failure exists, capture it as baseline evidence. Do not fix unrelated debt unless it blocks proof of the requested change or the user expands scope.

## Do not weaken proof

Do not skip, delete, loosen or rewrite assertions simply to make a change pass. Fix the implementation or document a genuine baseline/contract change.
