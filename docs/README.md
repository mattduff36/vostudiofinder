# Voiceover Studio Finder Documentation

This folder separates canonical current reference from dated feature/history evidence.

## Canonical reference

1. `PRODUCT_BEHAVIOUR.md` — stable product contracts and current feature boundaries
2. `ARCHITECTURE.md` — system structure and sources of truth
3. `DESIGN.md` — visual/UI standards
4. `DEVELOPMENT.md` — engineering workflow
5. `ENVIRONMENT.md` — environment-variable and environment-separation contract
6. `TESTING.md` — verification strategy and current coverage boundaries
7. `OPERATIONS.md` — environment/deployment/data/payment/email operational safety
8. `SECURITY.md` — security-sensitive engineering constraints
9. `CODEBASE_AUDIT_2026-08-31.md` — dated technical/governance audit and remediation backlog

## ADRs

`docs/adr/` contains accepted project-level engineering decisions.

## Feature/setup reference

These documents remain useful where current code still supports the feature, but they are subordinate to the canonical docs and live implementation. Several carry a short historical/staleness note at the top. Verify dated setup guides against current code/config before following them.

| File | Status |
|------|--------|
| `environment-setup.md` | Setup guide; non-canonical. Prefer `ENVIRONMENT.md` and `env.example` (Phase 2C). |
| `deployment-guide.md` | Setup/ops checklist; references older go-live files and claims |
| `database-safety-setup.md` | Still describes current safety scripts; written as a completion note |
| `stripe-setup-guide.md` | Stripe configuration |
| `stripe-dev-quick-start.md` | Local Stripe CLI/dev setup |
| `stripe-renewal-setup.md` | Renewal setup; early-renewal threshold in the guide is stale |
| `stripe-environment-variables.md` | Stripe env var reference; confirm against current code |
| `prd-username-reservation-system.md` | Feature spec; draft/historical — verify against current reservation code |
| `BOT_PROTECTION_DEPLOYMENT.md` | Turnstile + rate-limit setup |
| `error-log-system.md` | Admin error-log feature; Sentry runtime capture description is stale |
| `user-deletion.md` | Current account-deletion script usage |
| `NAVBAR_HEIGHT_REFERENCE.md` | Navbar height constants; navigation desktop breakpoint is 1080px in `DESIGN.md` |
| `project-structure.md` | Codebase overview; may omit newer paths |
| `RENEWAL_SYSTEM_UPDATE.md` | Renewal behaviour notes; verify against `src/lib/membership-renewal.ts` |
| `FUTURE_DEVELOPMENT.md` | Deferred ideas; last updated January 2026 |
| `todo-database-cleanup.md` | Unused-table cleanup backlog |
| `future-dev/ai-seo-copy-assistant-plan.md` | Future AI copy/SEO concept |

## Historical evidence

Implementation summaries, migration completion reports, release/session notes and superseded setup material live under `docs/archived/`. See `docs/archived/README.md`. Do not treat those files as current project authority.

Private documentation stays outside normal agent indexing in `docs-private/`.
