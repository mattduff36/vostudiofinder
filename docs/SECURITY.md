# Security

Status: canonical security engineering guide
Last reviewed: 12 October 2026 (reviewed admin implementation)

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

The reviewed admin studio, message-template, shared-note and build-badge paths use the established `ADMIN` role. Matching a legacy owner email or username is not an authorization alternative. The legitimate owners' stored roles were checked read-only before those exceptions were removed; the change does not grant roles. The existing JWT contains the role captured at sign-in, so acceptance after a role/session change requires a fresh valid sign-in, not merely a page refresh. Keep `src/lib/auth.ts` as the authentication authority.

An admin editor's customer target is explicit and separate from the signed-in administrator. Profile reads, images, visibility, verification and privacy saves must retain that captured target; an absent admin target must fail instead of falling back to the owner endpoint.

## Input and output

Validate untrusted request input. Avoid reflecting raw provider/database errors to clients. Sanitize user-generated content where it is rendered into HTML/email/metadata contexts.

## Auth tokens

Reset, verification, OAuth and retry links are security-sensitive capabilities. Use sufficiently random, expiring, single-purpose tokens and avoid logging them. The existing payment-retry secure-token TODO should be treated as real security debt.

## Webhooks

Verify provider signatures/secrets before processing Stripe, Resend or Sentry webhook data. Preserve idempotency for events that can be delivered repeatedly.

The Sentry endpoint requires a correctly formed, valid raw-body HMAC before parsing or persistence. Missing, malformed and incorrect signatures are rejected; missing server configuration is an unavailable integration, not permission to accept unsigned requests. Confirm the deployed Sentry integration supplies the supported signature before release. Do not restore unsigned acceptance as a rollback.

Error detail and ingestion use `src/lib/admin/error-log/redaction.ts` for bounded sanitization of live and cached samples, nested credentials, URL queries, headers and structured bodies. Unstructured request bodies are omitted. Responses must not expose raw provider/database errors or token fragments. Response-time protection does not depend on rewriting historical stored events.

## Durable email and refund operations

Support replies, campaign deliveries and refund notifications persist the reviewed recipient, frozen content, stable provider key and durable outcome before dispatch. Their stored payloads can contain personal data or capability links: restrict access and approve an operational retention policy before activation. Uncertain outcomes and accepted-operation evidence must survive UI rollback, account/ticket deletion and payload-retention jobs until their defined recovery obligations are resolved.

Refund money, benefit changes, future billing and notification are independently recorded effects. Authorization or retry of one does not authorize another money movement or email. Historical and external operations with uncertain attribution require evidence; never infer a human actor or generate new provider keys to bypass an unresolved outcome. See `docs/OPERATIONS.md` for release flags, migration order and recovery boundaries.

## Production logging

Review `src/lib/db.ts` before relying on production logging policy: Prisma query logging is currently enabled globally. Production logs should be deliberate and avoid unnecessary user/operational detail.

## Dependencies/runtimes

Do not run production on unsupported runtimes. The supported Node major is 24 LTS (Docker `node:24-alpine`, `.nvmrc`). Node 25 is EOL and must not be used.

The required Next.js security baseline is **16.3.3** (August 2026 Active LTS). That release addresses two CRITICAL issues: unauthenticated RCE while optimizing AVIF images (`GHSA-2xp9-vwfh-vxw4`) and unauthenticated RCE on Windows-hosted servers (`CVE-2026-75604` / `GHSA-p293-qw3h-jr36`). The previous in-repo baseline was 16.2.6. `npm run health` fails if the declared or lockfile Next.js version is below 16.3.3. Do not treat a later 16.3.x follow-up as automatically in-scope; bump the health floor only when a new required secure release is adopted.

The patched 16.3.3 runtime disables AVIF image optimization until an upstream libheif fix is propagated. This repository still lists `image/avif` in `next.config.ts`; Next.js serves those files without the vulnerable optimizer. Instant Navigations / Cache Components were not enabled.

`src/proxy.ts` is the canonical Next.js request-boundary file (migrated from deprecated `middleware.ts`). It sanitises and canonicalises inbound URLs with 301 redirects. It is not authentication middleware: it does not check sessions, roles, or membership, and it does not touch payments or the database. Do not reintroduce `src/middleware.ts`.

The required NextAuth / Auth.js v4 security baseline is **next-auth 4.24.15** (July 2026 advisories). Previous resolved baseline was **4.24.13** (declared `^4.24.11`). `@auth/prisma-adapter` **2.11.3** pins `@auth/core` **0.41.3**. There is no direct `@auth/core` dependency. Do not migrate to NextAuth/Auth.js v5 as part of routine security work.

Advisories addressed by 4.24.15 / `@auth/core` 0.41.3:

| Advisory | Severity (npm/GHSA) | Applicability in this project |
| --- | --- | --- |
| GHSA-7rqj-j65f-68wh | Critical / High | Email/magic-link `EmailProvider` only. **Not exposed:** Credentials + Google/Facebook/Twitter only; verification email is a separate Resend token flow. |
| GHSA-xmf8-cvqr-rfgj | High | `getToken()` malformed Bearer DoS. **Not exposed:** application uses `getServerSession` / `useSession`; no `getToken()` call sites. |
| GHSA-x445-f3h2-j279 | Moderate | OAuth state/nonce/PKCE cookies unbound to provider. **Limited exposure:** three OAuth providers configured; no logged-in “link another provider” UI; patch applied at library level. |

`npm run health` fails if declared or lockfile `next-auth` is below 4.24.15 when major is 4. A deliberate future major `>= 5` is accepted by the health floor without implying a completed v5 migration.

`next-auth@4.24.15` still lists an optional peer on `@auth/core@0.34.3` while `@auth/prisma-adapter` pins 0.41.3. The repository’s pre-existing `.npmrc` `legacy-peer-deps=true` remains; do not add a new override.

Do not run `npm audit fix` or `npm audit fix --force` as a substitute for a scoped framework update. Remaining npm audit findings (Prisma, sharp top-level, tooling) are a separate backlog.
