# ADR-003: Shared domain sources of truth

Status: Accepted
Date: 31 August 2026

## Decision

Before introducing duplicate constants or rules, use the existing shared modules where applicable:

- membership tier limits/pricing display: `src/lib/membership-tiers.ts`
- membership access/state: `src/lib/membership.ts`
- theme/z-index: `src/lib/theme.ts`
- navigation registry: `src/config/navigation.ts`
- auth: `src/lib/auth.ts`
- data models: `prisma/schema.prisma`

## Consequences

New features should extend shared contracts deliberately rather than creating page/API-specific copies that drift.
