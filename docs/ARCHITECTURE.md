# Architecture

Status: canonical
Audit baseline: 31 August 2026
Admin workflow contracts reviewed: October 2026

## Runtime

- Next.js App Router application (security baseline 16.3.3)
- React + TypeScript
- PostgreSQL through Prisma
- NextAuth v4-era authentication integration
- Vercel deployment and cron configuration
- Cloudinary images
- Stripe payments/membership
- Resend email
- Google Maps/location services
- Redis-compatible caching where configured
- Docker packaging uses Node 24 Alpine and Next.js `output: 'standalone'`. Vercel (primary host) uses native Next.js output: `next.config.ts` sets `output` only when `VERCEL` is unset, avoiding a Next.js 16.3 adapter/standalone `.nft.json` regression.
- Sentry-related sync/webhook/admin error-log subsystem remains in code, while direct runtime instrumentation appears removed

Exact package versions are authoritative in `package.json` and `package-lock.json`.

## Major layers

### `src/app`

Pages, layouts and App Router route handlers. API endpoints are grouped by admin, auth, user, membership, Stripe, cron, email, search, studio and webhook concerns.

### `src/components`

Feature/UI components grouped around admin, auth, dashboard, maps, membership, navigation, search, studio/profile and common UI.

### `src/lib`

Server/domain helpers for auth, membership, subscriptions, Stripe, email, location, search, profile, SEO, caching, admin and shared utilities.

### `prisma`

`schema.prisma` is the current model contract. Migration history contains both timestamped Prisma migrations and older/consolidation/raw SQL material. Never infer safe production migration order without inspecting actual migration status.

## Key shared sources of truth

- `src/lib/theme.ts` — brand/theme/z-index tokens
- `src/config/navigation.ts` — navigation registry
- `src/lib/membership-tiers.ts` — tier limits and price display constants
- `src/lib/membership.ts` — membership state/access helpers
- `src/lib/utils/profile-completion.ts` — canonical completion predicates, item identities and weighted score
- `src/lib/profile/completion-sections.ts` — completion-to-editor section mapping for owner/admin contexts
- `src/lib/admin/studios/summary.ts` — explicit admin studio selection and serialized summary
- `src/lib/ui/overlay-manager.ts` — overlay ordering, focus/inert state and shared scroll ownership
- `src/lib/admin/sandbox-store.ts` — validated session sandbox state and same-document subscriptions
- `src/lib/auth.ts` — auth providers/callbacks/events
- `src/lib/db.ts` — Prisma client lifecycle
- `prisma/schema.prisma` — database model contract
- `vercel.json` — deployment route headers/redirects and cron schedules
- `src/proxy.ts` — Next.js 16 request-boundary file. URL/query sanitisation and canonical 301 redirects only; not authentication or membership gating

## Request boundary (`src/proxy.ts`)

Next.js 16 uses the `proxy.ts` file convention (migrated from deprecated `middleware.ts` in Phase 2E). The function sanitises inbound URLs:

- Known static pages (`/`, `/about`, `/privacy`, `/terms`, `/help`, `/blog`) drop any query string via a 301 redirect.
- `/studios` keeps an explicit search-parameter whitelist, rejects toxic keys/values and non-finite numeric values, and 301-redirects when the query is not already canonical.
- Other matched non-excluded paths drop any query string via a 301 redirect.
- Prefixes `/api`, `/admin`, `/dashboard`, `/auth`, `/_next`, `/private`, and `/email/unsubscribe` are passed through without query stripping.
- The matcher continues to exclude Next static assets, the image optimizer, `favicon.ico`, `robots.txt`, `sitemap.xml`, and paths with a file extension.

Proxy runs on Next.js's supported Node.js runtime. It does not import Prisma, NextAuth, Stripe, or Resend, and it does not fetch data. Focused unit tests live in `tests/unit/proxy.test.ts`.

## Data flow principles

- Prefer server-side data access for protected/persistent data.
- API routes validate untrusted input and enforce auth/role/membership at the server boundary.
- Client components should receive only data required for UI behaviour.
- External providers are explicit failure/trust boundaries.
- Payment and membership state changes should be transaction/idempotency aware.

## Admin workflow architecture (October 2026)

### Completion and coherent studio lists

`getProfileCompletion` in `src/lib/utils/profile-completion.ts` supplies the dashboard, profile editor, admin summary and existing completion callers. It returns stable item IDs, labels, completed/required flags, required/optional counts and the existing weighted percentage: eleven required items at 5.91 points each and seven optional items at 5 points each, rounded and capped at 100. `calculateCompletionStats` remains the compatibility adapter for the existing nested input and stats-only output. Studio website data is authoritative; adding display fields must not silently change completion predicates or visibility gates.

`src/lib/admin/studios/summary.ts` owns the selected database fields and date/numeric serialization. The admin summary contains the checklist data needed for expansion, without transferring full user/subscription records. `studioListEnforcementInput` is deliberately separate from this display DTO: supplying a user ID to the display must not introduce membership downgrade-on-read. The list retains its established Featured-expiry enforcement scope and rereads afterward.

`GET /api/admin/studios` validates filters, ordering and range. The response rows and count come from one `RepeatableRead` transaction. Completion and membership-expiry ordering are computed over matching records before slicing, with stable ID ties and null expiry dates last. A `studioId` lookup ignores the current list filters and range, so a saved target can be reconciled even when it no longer belongs in the visible results. This bounds response size, not the database work needed for derived ordering.

`src/hooks/useAdminStudioList.ts` replaces one accepted range at a time; it does not concatenate pages fetched from different snapshots. The UI grows by 80 records to a maximum 400-record window, then offers subsequent/previous windows. Each request has an abort signal and generation; mutations invalidate obsolete reads. A confirmed write refreshes its canonical target and then the current range so filtering, sorting, totals and membership in that range agree. Existing rows and the surrounding controls remain mounted during background loading. Separate requests do not share a permanent database snapshot.

### Profile editing and independent writes

`src/components/profile/EditProfileModal.tsx` keys each opening by explicit owner/admin mode, target and opening identity. An unresolved explicit admin target has loading/error/retry states; it cannot fall through to editing the signed-in administrator. `ProfileEditForm` keeps the main draft and its acknowledged baseline separate. `src/lib/profile/write-coordinator.ts` coordinates immediately persisted controls with the main Save: it waits for in-flight writes, coalesces Save requests and blocks new independent writes while the saved snapshot is being acknowledged.

Successful immediate writes merge only their affected fields into the current draft and baseline, preserving unrelated edits. Embedded image galleries receive the form's acknowledged images and limits so tab/viewport remounts cannot replace acknowledged uploads with a stale child fetch. `PersistedProfileChange` in `src/lib/profile/persisted-change.ts` carries the target studio ID and change kind to admin list reconciliation. Owner dashboard events remain confined to owner data paths. A close callback only closes the editor; it is not a save signal or a reason to refetch the studio list. Discarding the main draft does not undo an independent write already accepted by the server.

### Overlays, navigation and local state

`ManagedOverlay`, `useOverlay` and `overlay-manager.ts` provide body portals, semantic dialog titles, ordered navigation/dialog/confirmation layers, topmost Escape handling, focus containment/restoration and background/lower-overlay inertness. Body overflow and compatibility classes have shared ownership; a nested cropper, viewer, confirmation or fullscreen map cannot release another active owner's lock. Owned Google autocomplete popups participate in the active overlay. Animated overlays retain ownership until removal.

`AdminDrawer` registers only while its responsive mode is visible. Payments and error-log consumers use the default `md` boundary (below 768px); Suggestions uses `breakpoint="lg"` (below 1024px). These boundaries are independent of the 1080px navigation breakpoint. See `docs/DESIGN.md` for interaction requirements.

`src/hooks/useUnsavedNavigationGuard.ts` is scoped to mounted dirty editors. It protects ordinary links, browser Back and unload without replacing global router/history APIs, preserves Next's history state, and coalesces a pending leave decision. Callers must explicitly guard programmatic navigation; native unload uses the browser warning because it cannot await a custom Save dialog.

The sandbox's validated Zustand store persists to the existing `adminSandbox` session-storage key before notifying consumers. Same-document updates need no polling. Invalid/unreadable storage disables restored overrides; a failed write retains the previously accepted state and reports an error. Explicit customer editing excludes sandbox overrides. Shared sticky notes use a read-only absent-note result and compare-and-set persistence in `src/lib/admin/sticky-notes.ts`; a conflicting first create or stale version returns the latest value without silently replacing the draft.

### Authorization boundary

Reviewed admin exception sites use the `ADMIN` role, including studio detail/create/test-account deletion, message-user, message templates, shared notes and the sandbox badge. Email address and username aliases do not grant capability. The change followed read-only verification of the existing owners' stored admin roles; it does not grant roles or replace the authentication system. Existing session-role checks remain session-based; support retains its stored-role lookup. UI controls are not authorization boundaries, and sandbox state never grants server permission.

### Durable provider workflows

Provider I/O takes place outside database transactions. A durable operation or delivery records the reviewed identity and frozen payload before the first possible submission. Stable provider keys, conditional claims and bounded recovery are used together; none is a promise of permanent provider deduplication or inbox delivery.

| Workflow | Durable ownership and recovery boundary | Main implementation |
|---|---|---|
| Support reply | `support_reply_operations` freezes actor, ticket/user/version, recipient, rendered message, requested status and provider key. A lease owns dispatch. Provider acceptance and ticket-status application are separate. Status-only recovery compares the original ticket version and never calls the email provider or overwrites a later admin decision. | `src/lib/admin/support/replies.ts`; support-ticket reply route |
| Email campaign | Creation identity recovers lost responses. Start verifies reviewed audience/template revisions and atomically freezes the campaign and deliveries. Version-2 workers use bounded `SKIP LOCKED` claims, first-submission eligibility checks and conditional completion. Uncertainty remains recoverable/reviewable; cancellation and accepted history survive retry. | `src/lib/email/campaigns.ts`, `campaign-worker.ts`, `recipients.ts`, `template-store.ts`, `render.ts` |
| Refund | `refund_operations` freezes payment, amount/currency, actor, choices and provider identity before Stripe. User-then-payment locks protect cumulative refundable balance. Money, exact purchased-benefit effects, future billing and notifications have separate states and recovery actions. | `src/lib/payments/refunds/`; `src/lib/payments/benefit-grants.ts`, `purchased-benefits.ts`, `subscription-checkout-billing.ts` |

`src/lib/email/campaign-provider.ts` is a one-attempt adapter shared by these email dispatch paths. It distinguishes accepted (provider ID required), rejected and uncertain outcomes. Callers persist the exact payload/key first; uncertain replay reuses them within the implemented 23-hour recovery window, then requires review. Template preview, test and campaign rendering resolve the same stored/built-in template contract; unavailable storage is not a reason to silently send a built-in fallback.

Refund settlement retrieves current provider evidence rather than trusting event arrival order or a cached create/update response. Unknown money outcomes reserve the balance. Exact grants link a paid interval or Featured placement to its purchase; ambiguous historical attribution requires review. Billing reconciliation never creates another refund and confirms cancellation with a fresh subscription read after an idempotent update. Forward checkout setup records its original invoice, period and choice durably, and rechecks current owner/refund/grant context before writing local renewal state.

Refund-adjusted membership projection is narrowly shared by membership/expiry and public profile, browse/search and map readers. `src/lib/subscriptions/public-entitlements.ts` batches changed owners through `src/lib/payments/refunds/membership-projection.ts`, preserving ordinary latest-subscription semantics for unaffected accounts. Exact surviving coverage does not republish inactive/hidden studios, remove deletion/review holds or serialize entitlement records publicly. Forward paid writers preserve existing studio publication state.

### Error ingestion, local triage and retention

Sentry source status remains in `error_log_groups`; `error_log_triage` stores the independent local disposition by stable Sentry issue ID. Effective status is the local override when present, otherwise source status. Manual sync, cron sync and the signed webhook update source data only. Local admin triage makes no Sentry write. List queries join this disposition, validate pagination/filter input, use a stable tie-breaker and return count/page from one snapshot. Detail reads are independently authorized and target-specific.

The webhook verifies a well-formed HMAC against the raw body before parsing/writing and rejects absent/invalid signatures. `src/lib/admin/error-log/redaction.ts` bounds and sanitizes live issue/event detail, cached event responses and newly ingested webhook samples. The detail endpoint does not log token prefixes or return raw upstream failure bodies. Response sanitization also covers historical cached samples; it is not a migration that rewrites old stored payloads.

`src/lib/admin/error-log/triage.ts` owns cleanup and rechecks eligibility after acquiring the same group locks used by triage. Effective OPEN groups expire after 90 days without a new occurrence; RESOLVED/IGNORED groups after 30 days without an update. Event-group cleanup preserves lightweight triage records so ignored/resolved decisions survive reimport. Their current retention is indefinite pending an explicit disposition-expiry policy; no raw event payload is retained in that record, and no historical local-versus-source provenance is guessed during migration.

### Reporting and release compatibility

`src/lib/analytics/ranges.ts` supplies one report clock, a rolling 24-hour window and exact 7/30 UTC date buckets including today. Missing dates are zero-filled; query failure is distinct from no traffic. `src/lib/analytics/user-agent.ts` handles Android/iOS before generic Linux/macOS detection. Daily visitor identifiers are counted identifiers, not a claim of unique people across days.

The support/triage, email-queue and refund models are additive schema changes. Deploy the matching migration/client contract before code uses those models; a disabled feature flag does not guarantee that every generated Prisma operation works on an old schema. Campaign processing and financial initiation/recovery/notification activation have separate default-closed gates described in `docs/ENVIRONMENT.md` and `docs/OPERATIONS.md`. Historical campaigns and ambiguous purchased benefits require explicit review, not automatic attribution/backfill. Rollback must preserve accepted operations, provider references and local triage dispositions, and must not restore the legacy blanket refund handler. Keeping already-applied refund effects correct also requires retaining their read/reconciliation projection.

## Known architecture drift

See `CODEBASE_AUDIT_2026-08-31.md` for the audit backlog. Docker uses Node 24 LTS with Next.js standalone output. Vercel builds leave `output` unset. Next.js is on the August 2026 Active LTS security release 16.3.3. The deprecated `middleware.ts` convention was migrated to `src/proxy.ts` in Phase 2E. Remaining items include Prisma major-version lag, Sentry intent drift and disabled CI.
