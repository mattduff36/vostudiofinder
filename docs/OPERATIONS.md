# Operations

Status: canonical operational safety guide
Last reviewed: 12 October 2026 (admin workflow migrations and refund recovery)

## Environments

Treat local development, preview/staging and production as distinct systems. Identify the exact environment before database, Stripe, email, cron or destructive operations.

## Deployment

Vercel is the current primary production host (`vercel.json`). Docker is a secondary packaging path for self-hosting.

- Docker base image: `node:24-alpine` (builder and runner).
- Next.js security baseline is **16.3.3** (August 2026 Active LTS). Confirm the image/lockfile version after any framework change.
- Next.js output is platform-conditional in `next.config.ts`: standalone is assigned only when `VERCEL` is unset (`if (!process.env.VERCEL) nextConfig.output = 'standalone'`). Vercel uses its native Next.js adapter and must not request standalone (Next.js 16.3 adapter builds omit `.next/next-server.js.nft.json`, which standalone finalisation then fails to open). Local and Docker builds still produce `.next/standalone` plus `.next/static`; the Dockerfile copies both (and `public/`) into the runtime image. Do not remove the conditional until upstream adapter/standalone behaviour is verified fixed.
- Request-boundary URL sanitisation lives in `src/proxy.ts` (Next.js 16 Proxy, Node.js runtime). A local Docker smoke-start can prove Proxy 301s (for example `/about?foo=bar` → `/about`) without following the redirect into database-backed rendering. Do not call `/api/health`, Stripe, Resend, Neon, or GSC as part of that check.
- A successful `npm run build` on a developer machine is not proof that the Docker image builds. Build a local test tag to verify packaging.
- Deps stage runs `npm ci --ignore-scripts` because `postinstall` would otherwise generate Prisma before the schema is copied. The builder runs `prisma generate`.
- Next.js page-data collection requires a non-empty `RESEND_API_KEY`. The Dockerfile passes `re_build_placeholder` on the build command only; it is not stored as a runtime image ENV.
- Do not bake `.env.local` or production credentials into the image. Supply runtime secrets at container start.

Never deploy as an incidental completion step. Deployment requires explicit user intent.

### Safe Docker image verification

```bash
docker build -t vostudiofinder:local-test .
docker run --rm vostudiofinder:local-test node -v
```

A smoke-start may use **fake** environment values only. Do not pass production `DATABASE_URL`, Stripe, Resend, or Neon credentials. `/api/health` queries PostgreSQL; reaching `node server.js` listening on port 4000 is enough to prove the standalone entrypoint without contacting production systems.

Do not claim a Docker **deployment** was tested if only the image was built or smoke-started locally.

## Database

- `DATABASE_URL` selects PostgreSQL.
- `prisma/schema.prisma` is the model contract.
- Migration history is non-trivial and includes old/consolidation/raw SQL material.
- Use read-only/status inspection first.
- Production schema/data changes require a CRITICAL workstream, recovery plan and explicit environment confirmation.
- Do not use `prisma db push` as an undocumented production migration process.

### Admin workflow schema rollout

The admin workflow release uses an expand-first sequence. Apply the reviewed database expansion before deploying the complete application and generated Prisma client. All flags below remain closed until their own activation gates pass. Closed flags alone do not provide compatibility with the previous database: shared Prisma-model reads and writes can return newly added columns even when processing is paused. Do not describe this complete release as a schema-independent containment patch.

The three additive migrations, in repository order, are:

| Migration | Expansion and historical treatment |
|---|---|
| `202610120001_admin_refund_lifecycle` | Adds durable refund operations, exact purchased-benefit grants, refund operation/provider/source metadata and webhook retry bookkeeping. Relaxes the refund actor to nullable with `SET NULL` on deletion. Preserves existing settlement history; does not infer historical purchased periods, actors or benefit decisions. |
| `20261013020000_admin_support_triage` | Adds durable support-reply operations and independent local error triage. Does not infer that an old error status was a manual admin decision. |
| `20261013021000_admin_email_queue` | Adds delivery outcome states, frozen campaign/template/provider-submission fields, retry/claim metadata and identity constraints. Initializes template revision from existing version history. Does not create missing snapshots or recipient identities for historical campaigns. |

For a reviewed target environment:

1. Inspect the deployment SHA, database host/name, migration history, active workers, pending refund receipts/operations and campaigns without mutation. Because this repository has legacy/consolidation migration material, confirm the target's actual baseline before choosing the approved migration commands; do not indiscriminately replay old SQL files.
2. Rehearse these exact migrations and the combined application against an isolated copy/fixture. Prove concurrent refund bounds, original request recovery after provider success/local failure, exact grant effects, overlapping access, FAQ ordering and reservation deletion locks. Keep provider and customer email effects mocked. Record the schema/client versions and the applicable unit, real PostgreSQL, build and browser results separately.
3. Prepare the recovery record and pause new financial/campaign initiation and relevant workers during transition. Keep signed webhook delivery/inbox retention accounted for; do not discard deliveries merely because processing is paused. Pause Sentry ingestion/sync/cleanup when needed for a reviewed historical-triage transition so it cannot race with preserving prior local decisions.
4. Under explicit environment-specific database authority, apply the reviewed expansions in order and verify columns, constraints/indexes and migration history. Do not drop the old fields or reinterpret historical rows as part of expansion. Deploy the compatible generated client and application only after the schema is ready.
5. Complete the historical reviews described below, verify recovery/read behaviour, then activate the separate processing stages deliberately. Retain evidence of the deployment, flag values, source reconciliation and who approved each live action. A successful local build or fixture run does not authorize live migration, financial actions, real email or deployment.

Do not automatically backfill `error_log_triage` from old `error_logs.status` values; inspect whether an outcome was a local admin decision or provider-derived and approve any preservation backfill separately. Historical campaign rows without the new queue version/snapshot require reviewed treatment. Neither schema expansion nor replay is permission to infer those facts.

## Stripe

Use test mode for development verification. Live charges/refunds/cancellations/subscription mutations require explicit live-operation intent. Webhook verification/idempotency must be preserved.

### Refund activation

The server gates are `REFUND_LIFECYCLE_ENABLED`, `ADMIN_REFUNDS_ENABLED` and `REFUND_NOTIFICATIONS_ENABLED`, each defaulting off unless exactly `true`. See [Environment](ENVIRONMENT.md#admin-processing-gates). Lifecycle enables reconciliation and the exact forward purchase writers; it is not a read-only switch. New admin refunds additionally require initiation enabled. Financial notifications require their separate gate. Do not enable all three as an incidental deployment step.

Before enabling live initiation, reconcile existing `payments.refunded_amount` against successful refund ledger/provider entries and inspect unresolved receipts and operations. An old payment's timestamp, amount, username or newest subscription does not prove what benefit it purchased. Exact provider invoice/subscription/payment and local grant evidence must support attribution. Existing observed intervals are `OBSERVED_BASELINE`, with no fabricated payment link. Orphaned payments/grants, conflicting totals, unexplained extensions and ambiguous recurring billing require a concrete reviewed reconciliation/mapping action; do not clear a REVIEW status just to unblock the form. Historical mapping/data corrections have separate approval and recovery requirements.

Confirm the actually enabled Stripe payment methods, relevant event payloads and currency minor units in the target environment. The current admin amount parser follows the application's two-decimal currency contract. Other minor-unit currencies require a deliberate contract extension and tests before activation; do not enable additional payment methods to make a test scenario possible. Review the refund notification sender/template and its independent send gate separately.

For any request that completes a cumulative full refund, the administrator explicitly chooses KEEP or END for the purchased benefit, with no preselected choice. END requires the exact eligible grant. For an attributable recurring subscription, KEEP or CANCEL_AT_PERIOD_END is a separate required future-billing choice with the checked subscription/period identified. A partial refund changes neither benefit nor billing. A provider-originated full refund has no invented admin choice and requires access review.

Ending one benefit must retain independent overlapping access and existing publication, visibility, deletion, review and refund-hidden holds. It must not cancel every membership or publish a previously hidden studio. Billing cancellation must never be inferred from the choice to end access. Unknown period, changed ownership, isolated future coverage or unsupported attribution remains reviewable instead of triggering a guessed downgrade.

### Refund recovery

Use the existing operation shown on the payment page. Its money, provider, benefit, billing and notification statuses are separate outcomes. Client cancellation, a closed dialog or a transport timeout is not evidence that Stripe rejected the request. Do not create a fresh request ID because the original result is uncertain.

| Recovery | Entry point | Scope |
|---|---|---|
| Payment ledger comparison | `PATCH /api/admin/payments/[id]/refund` | Retrieves provider refunds and reconciles their stored identities/status/totals; does not create a new refund. It can complete an already authorized operation's pending effects. |
| Submitted money | `POST /api/admin/refund-operations/[id]`, action `reconcile_money` | Recovers the original operation/provider key, discovers existing provider evidence, and reconciles settlement. An unsubmitted prepared operation can only start while initiation is enabled. |
| Purchased benefit | Same route, action `apply_benefit` | Rechecks cumulative successful settlement, exact mapping and surviving access before completing its recorded choice; never sends money or changes renewal. |
| Future billing | Same route, action `reconcile_billing` | Uses the original billing key and captured subscription/period; never sends money. Fresh provider state must confirm cancellation. |
| Notification | Same route, action `reconcile_notification` | Uses the frozen recipient/sender/content and original message key; never repeats money or benefit/billing effects. Requires its separate notification flag. |

Stripe API v1 can prune idempotency keys after at least 24 hours and returns the original cached response when a retained key is replayed. The application uses a conservative 23-hour replay window and a durable local operation; a replay key alone is not permanent protection. Billing recovery obtains a fresh subscription after update so a cached cancellation response cannot overwrite evidence that renewal was later re-enabled. [Stripe idempotency reference](https://docs.stripe.com/api/idempotent_requests).

Pending, unknown and action-required money outcomes reserve the refundable balance without claiming successful settlement. Authoritative later failure/return corrects provider status, ledger and holds and requires review of any prior access effect. Some supported methods can require further action after an earlier success, so do not freeze success as an irreversible local status or trust an old webhook payload over a fresh provider read. No such event automatically restores access, republishes a profile or creates another refund. [Stripe refund lifecycle](https://docs.stripe.com/refunds).

Missing evidence after the replay window, mismatched amount/currency/identity, contradictory history and previously applied effects under provider review require explicit investigation. Retain original provider IDs, request/payload hashes, stored before/after evidence, unique ledger entries and event receipts. Do not bypass holds by deleting operations or editing their balances. Payment-page recovery is deliberately not an unrestricted historical reattribution/override UI.

Original recurring checkout billing setup has separate durable evidence in `user_metadata` under `subscription_checkout_billing/<provider subscription>`. It uses the checkout's original invoice and a stable setup key. APPLIED setup replays do nothing; later owner/refund decisions, changed period, old first delivery or uncertain expired setup remain REVIEW. Inspect this evidence and the unprocessed checkout receipt when onboarding billing needs recovery. Never replay the original checkout choice to re-enable renewal after a later cancellation.

### Financial rollback

First pause new admin initiation and refund notifications. Preserve compatible signed ingestion, ledger reconciliation and affected-account access readers. Continue only the separately authorized recovery of already accepted provider actions. Keep additive tables, operation IDs, message keys, grants, snapshots and receipts; roll failed bookkeeping forward.

Do not roll back to the unsafe handler that downgrades unrelated memberships. Do not drop a ledger, create a compensating charge/refund, delete accepted operations, silently re-enable renewal or republish a held profile. Disabling the entire lifecycle after real access effects also disables its refund-adjusted overlap projection; retain the corrected readers and reconciliation while rolling back UI or new initiation. Any proposed access repair must compare recorded effects and current surviving grants and refuse changed records. Reversing real financial activity needs its own deliberate action, not a code rollback.

## Email

Use rendering/preview/test-recipient paths for development. Do not send campaigns or bulk mail to real users as a routine test. Verify recipient selection and unsubscribe/preferences before live sends.

`EMAIL_CAMPAIGNS_ENABLED` defaults off and controls new admin campaign starts and processing. Pause campaign processing during the expand-first migration. Historical started campaigns without the current `queue_version` and frozen template/audience evidence require review; do not invent their snapshots or silently requeue them. Provider acceptance and later delivery are distinct. Preserve frozen content, recipient identity, submission keys and uncertain outcomes during rollback. A notification or campaign retry must not repeat a refund or bypass recipient preferences.

Refund notification dispatch is controlled separately by `REFUND_NOTIFICATIONS_ENABLED`. It freezes final recipient/sender/content before submission and checks changed/deleting recipients before unaccepted recovery. Template edits do not change a previously submitted request behind its existing key. A provider acceptance is not a delivery guarantee; old/uncertain delivery outside the safe replay window requires review.

## Cron

Scheduled routes and schedules are listed in `vercel.json`. Verify route logic separately from Vercel scheduler configuration/logs. Cron endpoints must retain their authentication contract.

`/api/cron/reconcile-refunds` requires the configured `CRON_SECRET` bearer value; missing server configuration returns 500 and incorrect authorization returns 401. With lifecycle off, authenticated calls return a paused no-op. With it enabled, the worker processes a bounded group of unprocessed refund receipts and recoverable operations, using operation leases and receipt retry spacing. Its default budget is 20 receipts and 20 operations per invocation, with an internal maximum 50 per group. Untouched PREPARED money requests are not automatically started by the worker.

The recovery worker may complete already accepted money, recorded access or billing effects even while new initiation is paused. Notification submission still needs its separate flag. Verify the scheduled frequency in `vercel.json`, provider configuration and operational ownership before activation. Avoid invoking a live mutating worker merely to prove that the endpoint authenticates.

## Error monitoring

Sentry-related webhook/sync/admin functionality remains in the repo, but direct runtime instrumentation appears removed. Treat current Sentry ingestion as an operational item to verify before relying on the admin error log as complete application monitoring.

## Health

Run `npm run health` for cheap static governance/drift checks. `npm run health:full` adds available local deterministic checks when dependencies/environment support them. Quick mode includes an Auth.js security baseline check (`next-auth` >= 4.24.15 when major is 4). Dated command results live in `docs/CODEBASE_AUDIT_2026-08-31.md`. A production build remains opt-in for `health:full` via `HEALTH_BUILD=1`.

## Recovery first

For production-risk work, define stop conditions and recovery before mutation. Report implementation verification separately from post-deploy monitoring/user acceptance.

## Snapshot-bound legacy recovery

`scripts/recover-expired-memberships.ts` requires `--env-file`, `--expected-host`, and an absolute `--snapshot` path outside the repository. Without a mutation flag it is read-only and writes a dry-run plan. Review the counts and exclusions before running the same arguments with `--apply` under explicit production authority.

Apply verifies the host/database, snapshot hash, and current selected rows under user/profile/subscription locks. Any drift aborts the entire batch. It restores eligible listings to active Basic, preserves saved content, records the legacy offer state and a recovery run identifier, and sends no email. External snapshots contain identifiers and state and must remain private.

An `.applied.json` receipt stores the resulting state. `--rollback` with the original arguments restores the original selected fields/metadata only when the live rows still exactly match that receipt. If members or billing have changed them since, rollback refuses; investigate and reconcile rather than overwriting newer work. Never roll back publication by broad status updates.

Deploy the corrected workflow before applying a freshly verified recovery plan. Confirm production deployment SHA and domain, compare exclusion states, and verify representative public pages and search/map counts afterward. Do not invoke a mutating cron merely as an authentication smoke test.
