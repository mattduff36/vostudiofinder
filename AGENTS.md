# Voiceover Studio Finder Agent Instructions

## Purpose

This file is the project-level authority for AI-assisted engineering in this repository. It complements the user's global Token-Efficient Engineering (TEE) skill. Use the lightest TEE lane that safely proves the requested work.

## Authority chain

For repository work, resolve conflicts in this order:

1. The user's explicit current instruction.
2. This `AGENTS.md`.
3. Applicable scoped rules in `.cursor/rules/`.
4. Canonical project docs listed below.
5. Current code, tests and configuration as implementation evidence.
6. Generated reports and dated implementation notes.
7. Archived/historical documentation.

If canonical documentation conflicts with current code, do not silently pick one. Investigate which reflects intended current behaviour, preserve user-facing behaviour unless the task says otherwise, and update stale documentation when appropriate.

## Canonical docs

- `docs/PRODUCT_BEHAVIOUR.md`
- `docs/ARCHITECTURE.md`
- `docs/DESIGN.md`
- `docs/DEVELOPMENT.md`
- `docs/ENVIRONMENT.md`
- `docs/TESTING.md`
- `docs/OPERATIONS.md`
- `docs/SECURITY.md`

Exact dependency versions live in `package.json`/`package-lock.json`. Exact data models live in `prisma/schema.prisma`. Current code remains implementation evidence, not a substitute for deliberately documented product intent.

## Project boundaries

Voiceover Studio Finder is a production Next.js application with authentication, user/studio profiles, public search/maps, Basic/Premium membership, Stripe billing, admin tooling, Resend email workflows, scheduled jobs and PostgreSQL persistence.

Changes involving database/schema/migrations, auth/permissions, money/Stripe, destructive user operations, production data, email campaigns to real users, or production deployment are CRITICAL under TEE.

## Safety rules

- Never push to GitHub unless the user explicitly authorises it under the user's global push policy.
- Never deploy to production unless the user explicitly requests the deployment.
- Never run a production database mutation merely because a migration/script was created.
- Identify the target environment before any database, Stripe, email, cron or destructive operation.
- Prefer dry-run/read-only inspection first when an operation can affect users, money or stored data.
- Preserve rollback/recovery options for production-impacting work.
- Do not send real user email, start a campaign, issue a refund, cancel a membership, delete an account or alter production data as an incidental verification step.
- Do not expose secrets, tokens, private docs, database dumps or personal data in commits, logs, prompts or generated reports.

## Engineering behaviour

- Search narrowly before reading large files.
- Reuse existing project abstractions and design tokens before introducing new ones.
- Do not introduce shadcn/ui, Radix, `nuqs` or other globally preferred libraries unless this repository already uses them or the user approves adding them.
- File size alone is not a reason to refactor. Extract only coherent boundaries that reduce actual risk or duplication.
- Keep public API, membership, auth, search and payment behaviour stable unless the task explicitly changes their contract.
- Use TypeScript for new application code and preserve existing strictness.
- Prefer interfaces for shared object contracts/props, consistent with the user's global rules.
- Treat tests and current code as evidence. Do not weaken tests to make a change pass.

## Product sources of truth

Use these existing modules before duplicating domain constants:

- Membership tiers/limits: `src/lib/membership-tiers.ts`
- Membership state/gating: `src/lib/membership.ts`
- Theme/z-index: `src/lib/theme.ts`
- Navigation registry: `src/config/navigation.ts`
- Auth options: `src/lib/auth.ts`
- Database client: `src/lib/db.ts`
- Prisma model contract: `prisma/schema.prisma`
- Vercel schedules/deployment config: `vercel.json`

## Historical material

Dated implementation summaries, migration status snapshots, old PRDs, `project-archive/`, backups and private material are evidence only. They are not current product authority unless the user explicitly asks to recover historical intent.

## Completion

Run the narrowest meaningful checks first, then broader checks proportional to the TEE lane and changed contract. Report baseline failures separately from failures introduced by the task. Inspect the final diff and follow the user's local commit/push policy.
