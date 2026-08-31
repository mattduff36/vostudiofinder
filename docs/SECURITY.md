# Security

Status: canonical security engineering guide
Last reviewed: 31 August 2026

## High-risk domains

Treat these as CRITICAL under TEE:

- authentication, session, OAuth, reset/verification and role/permission logic
- Prisma schema/migrations and production data mutations
- Stripe payments, refunds, membership state and webhook processing
- account deletion or bulk destructive operations
- real-user campaign/bulk email
- secrets/environment handling
- production deployment changes with material security/data impact

## Secrets and private data

- Never commit `.env*`, provider secrets, database dumps, private documentation or maintenance exports containing personal data.
- `.cursorignore` excludes local sensitive/noisy trees from normal agent indexing.
- Do not echo secrets into logs, screenshots, prompts, test fixtures or generated reports.
- `NEXT_PUBLIC_*` variables are client-visible by design; never place server secrets there.

## Authorization

Admin UI visibility is not authorization. Every sensitive server route must enforce the appropriate server-side session/role/membership rule.

## Input and output

Validate untrusted request input. Avoid reflecting raw provider/database errors to clients. Sanitize user-generated content where it is rendered into HTML/email/metadata contexts.

## Auth tokens

Reset, verification, OAuth and retry links are security-sensitive capabilities. Use sufficiently random, expiring, single-purpose tokens and avoid logging them. The existing payment-retry secure-token TODO should be treated as real security debt.

## Webhooks

Verify provider signatures/secrets before processing Stripe, Resend or Sentry webhook data. Preserve idempotency for events that can be delivered repeatedly.

## Production logging

Review `src/lib/db.ts` before relying on production logging policy: Prisma query logging is currently enabled globally. Production logs should be deliberate and avoid unnecessary user/operational detail.

## Dependencies/runtimes

Do not run production on unsupported runtimes. The audited Dockerfile uses Node 25, which is EOL as of this review and should be replaced in a separate deployment task.
