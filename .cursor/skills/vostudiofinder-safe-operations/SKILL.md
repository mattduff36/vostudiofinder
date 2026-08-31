---
name: vostudiofinder-safe-operations
description: Safe execution protocol for Voiceover Studio Finder database, Stripe, email, cron, destructive maintenance and production operations.
---
# Voiceover Studio Finder Safe Operations

Use when a task asks to run or change an operation that can affect stored user data, money, memberships, outgoing email, scheduled jobs or production state.

## Required preflight

1. Identify the exact environment and service/account.
2. Identify whether the action is read-only, reversible mutation or destructive/irreversible mutation.
3. Inspect the exact script/route/command being used. Never infer safety from its filename.
4. Prefer a dry-run/report query first when available.
5. For destructive/data-changing work, capture deterministic target counts/identifiers without exposing unnecessary PII.
6. Confirm rollback/recovery and stop conditions.
7. Apply the CRITICAL TEE architecture/review requirements when engineering changes the operation or its safety contract.

## Database

Do not run production schema/data mutations automatically. Do not substitute `db push` for a deliberate production migration. Verify the target database before execution and stop on environment ambiguity.

## Stripe

Use test mode for implementation verification. Do not refund, charge, cancel or mutate live subscriptions as a side effect of testing. Validate webhook/idempotency paths with fixtures or test events first.

## Email

Rendering/preview tests should not deliver to real users. Bulk sends require explicit recipient scope and live-send intent. Preserve unsubscribe/preferences.

## Cron and deployment

A successful HTTP call is not proof that a scheduled production job is correctly configured. Separate route logic verification from scheduler/deployment verification.

## Handoff

Report the environment, operation, dry-run/result counts, verification and any unresolved production acceptance separately from implementation completion.
