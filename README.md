# Voiceover Studio Finder

Production web application for discovering voiceover/recording studios and managing studio profiles, memberships, payments and administration.

## Start here

- Agent/project rules: `AGENTS.md`
- Documentation index: `docs/README.md`
- Architecture: `docs/ARCHITECTURE.md`
- Product behaviour: `docs/PRODUCT_BEHAVIOUR.md`
- Development: `docs/DEVELOPMENT.md`
- Environment: `docs/ENVIRONMENT.md`
- Testing: `docs/TESTING.md`
- Operations: `docs/OPERATIONS.md`
- Security: `docs/SECURITY.md`
- Latest governance/codebase audit: `docs/CODEBASE_AUDIT_2026-08-31.md`

## Development

Supported Node.js major is **24 LTS**. See `docs/DEVELOPMENT.md` and `docs/ENVIRONMENT.md`.

Typical local flow:

```bash
npm install
npm run dev
```

The development server is configured on port 4000 by the current package scripts.

## Verification

```bash
npm run health
npm run type-check
npm run lint
npm test
```

Use `npm run health:full` for broader local checks when dependencies and a safe development environment are available. See `docs/TESTING.md` for the current coverage boundaries.

## High-risk work

Database/schema/migration, auth/permissions, Stripe/money, destructive account/data operations, real-user bulk email and production deployment work require the project safety rules in `AGENTS.md`, `docs/OPERATIONS.md` and `docs/SECURITY.md`.

## Historical documentation

Dated implementation summaries and superseded setup/status notes are retained as historical evidence under `docs/archived/` rather than being treated as current project authority.
