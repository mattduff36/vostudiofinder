---
name: vostudiofinder-engineering
description: Project-aware workflow and domain map for engineering Voiceover Studio Finder safely within the global TEE lanes.
---
# Voiceover Studio Finder Engineering

Use this skill for implementation, diagnosis, refactoring and planning in this repository. The user's global `token-efficient-engineering` skill remains the routing authority for FAST, STANDARD, GUARDED and CRITICAL.

## Start with the authority chain

Read `AGENTS.md`, then only the scoped project rules and canonical docs relevant to the task. Search before broad reading. Treat dated implementation notes as evidence, not authority.

## Domain map

- Public discovery/profile: `src/app/studios`, `src/app/[username]`, `src/components/search`, `src/components/studio`, `src/lib/studios`, `src/lib/search`
- Account/dashboard: `src/app/dashboard`, `src/components/dashboard`, `src/app/api/user`
- Auth: `src/lib/auth.ts`, `src/lib/auth-guards.ts`, `src/app/api/auth`, `src/app/auth`
- Membership: `src/lib/membership-tiers.ts`, `src/lib/membership.ts`, `src/lib/subscriptions`, `src/app/api/membership`
- Stripe: `src/lib/stripe`, `src/app/api/stripe`, `src/app/api/admin/payments`
- Admin: `src/app/admin`, `src/components/admin`, `src/app/api/admin`
- Email: `src/lib/email`, admin email routes/pages, Resend webhook and email cron routes
- Maps/location: `src/components/maps`, `src/lib/location`, geo/search APIs
- Data contract: `prisma/schema.prisma` plus migration history
- Runtime/deployment: `next.config.ts`, `vercel.json`, Docker files, package scripts

## Reuse before inventing

Check `src/lib/theme.ts`, `src/config/navigation.ts`, membership helpers, auth guards, email registry/layouts and existing API validation patterns before adding new constants or abstractions.

## Risk routing

Always escalate persistence/schema/migrations, auth/permissions, Stripe/money, destructive account changes, real-user bulk email and production-data operations to CRITICAL. Keep unrelated UI/docs work in its own lighter lane rather than escalating the whole request unnecessarily.

## Verification

Use targeted unit/integration checks first. Remember that current TypeScript and ESLint config excludes tests/scripts. Use `npm run health` for governance/static drift and `npm run health:full` when its local prerequisites are satisfied.
