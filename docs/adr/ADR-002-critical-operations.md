# ADR-002: Critical operational changes require explicit environment safety

Status: Accepted
Date: 31 August 2026

## Decision

Database/schema/migration, auth/permissions, Stripe/money, destructive account/data operations, real-user bulk email and production-data changes are CRITICAL TEE work.

No generic project instruction may require automatic execution of a new migration or destructive script against an unspecified environment.

## Consequences

Development remains efficient for routine work while high-impact state changes require environment identity, deterministic verification, recovery/rollback planning and explicit scope.
