# Reviewed admin implementation — 12–13 October 2026

Status: implementation and verification complete on `feat/admin-studios-reviewed-v2`. Production release is separate.

## Scope and decisions

This implements Matt's attached **Voiceover Studio Finder Admin Implementation Plan, Reviewed v2**, including the approved recommended answers and its amendments. The source baseline is `237569c02c41abe49c0ebc06dba40ab6d6c3d4ae`; the implementation branch is `feat/admin-studios-reviewed-v2`. The attachment is the specification. The separately named review conversation was not independently retrieved, so no additional decisions are attributed to it.

The scope includes ST1–ST5, SH1–SH9, E1–E6 and DP1–DP7, with all 22 admin routes accounted for below. Optional redesigns, speculative historical data repair and new customer communications were not added.

| Decision | Implemented contract |
|---|---|
| Studio interaction | Summary/card click expands inline; explicit Edit opens the editor. Multiple studios may be expanded. Preserve the existing table, mobile cards, columns, colours and controls. |
| Completion | Reuse the dashboard's exact 18 checks and existing weighting. Show required and optional completed/outstanding items, section-specific editing and a copyable outstanding list. |
| D1: refunds | Partial refunds retain benefits. A cumulative full refund requires an affirmative benefit choice; an attributable recurring subscription requires a separate future-billing choice. Neither choice is preselected. Only the identified grant may end, and independently surviving access remains effective. Ambiguous history/external refunds require review. |
| D2: error status | An explicit local OPEN/RESOLVED/IGNORED decision overrides ingested Sentry status and survives event cleanup/reimport. Historical provenance is not invented. |
| D3: access | Use the established ADMIN role on the targeted routes/components. Both legitimate owners were verified read-only as stored ACTIVE/ADMIN in non-production and production before removing identity exceptions. No role was granted. Fresh sign-in is required to refresh an existing JWT's role. |

## Delivered changes

### Studios and shared profile editing

`getProfileCompletion` is the common source for the dashboard, admin details and editor section indicators. All eleven required and seven optional checks retain the previous predicates, weights, rounding and 100% cap. The original public compatibility wrapper remains. Vimeo and Bluesky now participate in the editor's social section consistently; the website edit action opens Basic Info without changing the scoring rule.

The admin list returns an explicit summary DTO with completion items, owner identity, dates, counts and useful profile details. It omits sensitive user/provider fields. Rows and count come from one post-enforcement RepeatableRead snapshot. Derived completion/expiry ordering is calculated before slicing, with stable ID ties and null handling. Validation rejects unsupported ranges and sorts. A targeted studio lookup bypasses unrelated filters.

The loaded prefix grows 80 → 160 → 240 → 320 → 400; bounded Previous/Next windows keep the full result set accessible. Refresh replaces a coherent visible range instead of mixing independently refreshed pages. Request generations, cancellation and per-studio write guards reject obsolete responses. Existing rows remain visible during quiet recovery. Adding the owner's ID to the display DTO does not add membership downgrade-on-read: an explicit enforcement adapter preserves the pre-existing list-write boundary, including the existing Featured-expiry enforcement and subsequent fresh read.

Studio summaries now expand without a request or edit dialog. Checkboxes, View, Edit, Delete, status/visibility/verification/review controls, Featured expiry and the column selector retain their own actions. The desktop detail row spans the currently visible columns; mobile details stay inside the card. The chevron sits outside clamped studio names so it remains visible. The existing table fitting mechanism remains, so the controlled desktop table fits at 75% rather than the baseline's 76% with the added disclosure.

Closing an unchanged editor does not fetch or reload the studio list. Successful writes trigger targeted, quiet summary recovery and a coherent range refresh. Draft identity includes the actual studio, owner and editing session; an absent customer target fails explicitly. Delayed results cannot move to a different studio.

The editor coordinates ordinary Save with independent image, privacy, visibility and verification writes. Acknowledgements patch only the confirmed fields in both the current draft and saved baseline; unrelated typing survives. Customer privacy switches call the selected customer's admin endpoint instead of the signed-in administrator's profile endpoint. Embedded image galleries use acknowledged parent state across section/viewport remounts. Never Expires clears the actual draft date immediately. Failed independent image writes retain an inline error and a visible global notice. Save/Discard/Cancel protects close and supported navigation, including Back/Forward; native unload retains the browser's standard warning.

### Shared admin behaviour

One overlay manager owns portal ordering, nested body/document locks, background inertness, topmost Escape, focus containment and sensible restoration. Modal, Drawer, confirmation, profile/image, membership and navigation consumers use this shared mechanism. Owned address-autocomplete popups are included without exposing unrelated background UI. The Suggestions drawer follows its real 1024px breakpoint; other drawers retain their respective 768px boundaries. Admin navigation uses real links, keyboard-accessible menus and bounded overflow without changing the navigation registry.

Suggestions maintain drafts and pending results per customer. A reply freezes its reviewed recipient, payload and operation identity before provider dispatch. Accepted mail and a ticket status change are separate durable outcomes; recovering status cannot send again or overwrite a later reopening. Uncertain outcomes retain their original key and payload within the bounded recovery window, then require review.

The Error Log has coherent database paging/counts, independent list/detail request ownership, useful retry states and durable local triage. Manual sync, scheduled sync, signed webhook ingestion and retention use the same effective-status rule. Raw payload cleanup does not delete triage decisions. Sentry requires a valid raw-body HMAC before parsing or persistence. A common bounded redactor covers live and cached samples, headers, nested credentials, URL queries and structured bodies; unsafe unstructured bodies and raw internal errors are omitted.

Analytics use one clock, an exact rolling 24 hours and 7/30 UTC calendar-date ranges. Missing observations are distinguished from a failed read; daily buckets are chronological and zero-filled. Mobile device classification and overview activity labels were corrected. Shared notes use read-only GET, versioned saves and conflict recovery that retains the draft. A validated session sandbox store replaces polling and keeps settings, badge and editor state consistent; customer editing explicitly bypasses sandbox overrides.

### Email administration

A canonical recipient service supplies browsing, review, counts and campaign start. It uses the actual `is_verified` field and consistent search, selection, exclusions, marketing preferences and normalized destinations. Selection survives paging/filtering and explicit selection is distinct from a whole-filter audience. A changed recipient set cannot pass review merely because its count stayed the same.

Templates share one resolution/rendering contract. Deliberately blank overrides remain blank, database failure does not silently fall back to registry copy, version conflicts retain drafts, and preview/test uses the current intended content. Samples follow template variable schemas and cannot leak into live campaign payloads.

Campaign creation and start persist stable request identity, reviewed audience/template versions and immutable snapshots. Queue materialization is atomic and bounded. The worker claims bounded rows with leases, freezes provider payload/key before dispatch and separates accepted, rejected, skipped and uncertain outcomes. Before first submission it checks the captured user's current identity/address, applicable deletion holds and fresh marketing consent. It never silently retargets an address or treats a deleted user's missing preferences as consent. Cancellation and retry preserve accepted history and cannot resurrect canceled delivery automatically. Polling and request ownership preserve the current page and selected record. A recovered campaign read clears its stale load error without erasing durable creation/start uncertainty or a failed action notice; the initial retry also displays its pending state. Four focused regression tests cover those separate notice lifetimes.

### Payments, reservations and content

Payment list/drawer/detail share accurate detail and refund form contracts. Refund operations reserve amounts under database locks and record money, benefit, billing and notification independently. Admin requests and provider-originated events converge on fresh provider evidence. Pending/action-required outcomes do not become settled money. External events have no invented human actor.

Forward purchase writers record exact benefit intervals and preserve existing INACTIVE/visibility/deletion holds. Refunding a Featured purchase does not remove unrelated Premium access. An older overlapping paid grant remains effective after a newer grant ends, including public profile/search/map reads. Future isolated intervals are not counted as present access. Checkout retries use durable original-invoice billing setup; a cached provider update response cannot falsely confirm the current renewal setting. Recovery never retries money merely because cancellation or email failed.

FAQ, message templates and platform updates retain editor identity, input focus and drafts during failures and prevent duplicate submissions. FAQ final-slot moves and keyboard controls share a pure ordering helper; create/delete/reorder share an advisory lock and stale orders return a conflict. Reservation deletion rechecks eligibility while holding the user lock, including activation/payment races. Waitlist export preserves its existing scope while correctly encoding quotes, commas and newlines; failed deletion/export receives truthful feedback.

## Package and route coverage

All listed packages are **implemented and verified within the recorded code/fixture boundaries**. Their final gate results are below; live activation remains subject to the applicable release procedure. There are no outstanding policy questions from the approved recommended answers. Production activation and historical review are release prerequisites, not missing implementation packages.

| Package | Code delivery | Release dependency |
|---|---|---|
| SH6 urgent privacy/signature patch | Separate baseline-compatible commit, independently tested | Confirm deployed Sentry signature configuration; no new schema |
| DP5 urgent containment | Separate baseline-compatible commit, independently tested | Pauses new admin refunds and retains signed external receipts; no new schema |
| ST1–ST5 + necessary SH1/SH2/SH9 integration | Separate studio/UI batch | Existing schema; preserve the approved role/session context |
| SH3/SH4/SH5 | Durable support and triage | Additive shared migration and approved operational retention/recovery |
| SH7/SH8/SH9 and independent content usability | Reporting, notes, access, sandbox and content fixes | Existing permissions/contracts; no historical rewriting |
| E1–E6 | Recipient/template/campaign changes | Email migration, historical preflight and explicit campaign activation |
| DP1/DP2/DP3/DP4/DP6/DP7 | Payments, reservations/content and durable financial lifecycle | Financial migration; independently controlled lifecycle/initiation/notification activation |

| Admin route | Principal implementation/proof |
|---|---|
| `/admin` | Navigation, overview labels, unavailable reporting |
| `/admin/studios` | ST1–ST5, expansion, editor targeting, coherent range and browser controls |
| `/admin/analytics` | UTC ranges, loading/unavailable reporting and device classification |
| `/admin/payments` | Current-query list, drawer identity and shared refund form |
| `/admin/payments/[id]` | Detail/retry and independently recorded financial outcomes |
| `/admin/reservations` | Stable search and transaction-safe eligibility/deletion |
| `/admin/waitlist` | CSV encoding, preserved export scope and deletion feedback |
| `/admin/faq` | Retained draft, ordering conflicts and accessible move controls |
| `/admin/message-templates` | CRUD recovery and role-only access |
| `/admin/platform-updates` | Editor identity, dates and retained failure state |
| `/admin/error-log` | Paging, detail ownership, durable triage and safe ingestion |
| `/admin/suggestions` | Responsive drawer and per-customer durable reply state |
| `/admin/support` | Preserved redirect to Suggestions |
| `/admin/sandbox` | Validated session state and reset/disable propagation |
| `/admin/emails` | Independent section errors, retained working tab and resolved templates |
| `/admin/emails/recipients` | Canonical selection, counts, predicates and request ownership |
| `/admin/emails/campaigns/create` | Durable creation identity, valid audience and reviewed start |
| `/admin/emails/campaigns/[id]` | Details, polling, retry/cancel, recovery and truthful uncertainty |
| `/admin/emails/template/new` | Key/schema validation, version consistency and draft retention |
| `/admin/emails/template/[key]` | Blank overrides, current draft, conflicts and safe saves |
| `/admin/emails/template/[key]/preview` | Schema-driven samples and direct saved-template compatibility |
| `/admin/emails/template/[key]/test` | Intended variables/content and controlled feedback |

All 22 routes passed their browser smoke checks, and all 12 additional recovery/regression checks passed: **34/34**, zero skipped or flaky tests, zero forbidden API attempts and zero uncaught browser errors. The actual current routes and styles ran in isolated Chromium/Next with synthetic client APIs and a guarded read-only server database fixture. A manifest verifies 516 matching source files; the only existing-source substitutions are the isolated root layout and database module. The browser gate is explicitly separate from the real PostgreSQL transaction gate. No customer account or deployed bot protection was used or bypassed.

## Verification evidence

| Gate | Result and scope |
|---|---|
| Complete unit + original completion suite | 60 suites / 568 tests passed, zero skips; explicit `tests/unit` plus `tests/profile-completion.test.ts` selection |
| Sentry independent baseline slice | 2 suites / 9 tests passed against the baseline-compatible source |
| DP5 independent baseline slice | 1 suite / 12 endpoint tests passed; semantic types and apply/reverse checks passed |
| Actual PostgreSQL | 6 suites / 51 tests passed across the resolved final runs; all provider effects mocked |
| Additive migration rehearsal | Exact baseline plus all three final migrations applied successfully to disposable PostgreSQL 18.4 UTF8 |
| Main admin browser | 6 scenarios passed against the production build, including four collapsed widths, expansion/controls, Save/close/privacy, Back/Forward, drawer resize and full bounded list navigation |
| Shared component browser | 3 scenarios passed: owner edit/cropper, admin self-edit and public image/What's New dialogs |
| Full admin route browser | 34 checks passed: all 22 routes plus 12 error/recovery regressions; actual route/navigation/style code in the documented isolated fixture |
| Application type-check | Passed; tests/scripts remain excluded by the existing configuration |
| Full configured ESLint | 0 errors, 758 warnings at the main final gate; existing warnings were not blanket-suppressed |
| Production build | Successful Next.js 16.3.3 Turbopack build with Prisma 6.19.2 generation and fake fixture configuration |

The SQL suites are `studio-list` (9), `shared-workflows` (6), `content-reservation-writes` (4), `refund-lifecycle` (12), `purchased-benefit-holds` (5) and `email/campaign-lifecycle` (15). They prove real locks, constraints, snapshots, claims and recovery. An advisory-lock query that returned PostgreSQL's unsupported `void` result was corrected to the repository's supported `$executeRaw` pattern. Test docblock parsing and foreign-key-safe fixture teardown were corrected without weakening assertions.

Browser evidence uses invented studios and intercepted providers. Owner/public checks import unchanged production components and canonical styles into a separate test route/layout that is absent from the production repository. This is desktop Chromium and mobile viewport evidence; it does not claim Safari, physical-device gestures, live map/provider behaviour or a full deployed customer authentication flow. The original collapsed reference used the development runtime; development tooling chrome is not part of the visual contract.

The build intentionally cannot query the fake database for profile static parameters or the sitemap and uses the application's existing on-demand fallback. This is distinct from a failed production database query. `npm test` alone excludes the original completion file; the explicit final command includes it. Unit, browser and real database results are reported separately.

### Controlled size/capacity measurements

These are measurements of deliberately long synthetic profiles on the isolated fixture, not production benchmarks.

| Studio summary rows | Serialized bytes | SQL queries | Observed elapsed time |
|---:|---:|---:|---:|
| 80 | 605,376 | 14 | 84.82 ms |
| 160 | 1,210,718 | 14 | 119.11 ms |
| 400 | 3,026,799 | 14 | 227.32 ms |

The campaign test rejected 10,001 recipients and atomically materialized an explicitly selected 10,000. Its request was 629,156 bytes. Review/create/start measured 917/963/3,080 ms and 2/9/14 SQL queries respectively. No email was sent.

### Acceptance traceability

A01–A02 map to controlled collapsed screenshots and actual summary/control/browser interactions. A03 maps to all 18 predicates, section navigation fixtures and the 38 original compatibility tests. A04–A08 map to editor/list/bulk tests, the actual profile/browser scenarios and the real studio snapshot suite. A09/A18 map to shared overlay/navigation unit cases and actual admin/owner/self/public component browsers. A10 maps to support UI/operation and real transaction tests. A11–A13 map to recipient/template/campaign unit and queue tests plus route recovery checks. A14 maps to financial unit and real refund/purchase suites. A15 maps to content/CSV tests and FAQ/reservation SQL races. A16 maps to redaction/signature, triage UI/API and real cleanup/reimport tests. A17 maps to analytics, notes and sandbox tests and route smoke checks.

## Recorded artifacts and local commits

The evidence includes [the verification summary](admin-review-evidence-2026-10-13/verification-summary.json), [the full 22-route and recovery result inventory](admin-review-evidence-2026-10-13/admin-route-browser-final-summary.json), [SQL suite results](admin-review-evidence-2026-10-13/sql-evidence-summary.json), and [controlled before/after screenshots](admin-review-evidence-2026-10-13/README.md). The [portable browser harness](../../tests/fixtures/admin-route-smoke-harness/README.md) is under tests and is excluded from application compilation by the existing configuration. Its isolated source overrides are fixtures, never enabled production routes. The recorded browser source manifest includes the sole post-test normalization: removal of one extra trailing blank line in the refund presentation helper, with no semantic change.

The implementation is split into these local commits. Documentation and retained evidence follow in the final handover commit.

| Commit | Change |
|---|---|
| `0eee233e` | fix(security): require signed Sentry webhooks and redact error details |
| `03146f21` | fix(payments): contain refund processing pending durable reconciliation |
| `35b06532` | feat(admin): expand studio details and coordinate profile editing |
| `b33227ba` | feat(db): add durable admin operations and delivery records |
| `7f0bd545` | fix(admin-email): preserve reviewed audiences and durable delivery outcomes |
| `4d465393` | fix(admin): preserve support triage drafts and reporting state |
| `c8025eeb` | fix(admin): validate content edits and reservation actions |
| `a757a515` | feat(payments): reconcile refunds and exact purchased benefits |

The delivery checkout is `D:\Websites\vostudiofinder` on `feat/admin-studios-reviewed-v2`, based on the original `main` commit. The pre-existing workspace-file edit has SHA256 `CD63009DDAADCBE8F4B172225581AC372447F071598EBFCAA8AE3863E94332F9`; local integration must preserve it byte for byte. No existing user commit is replaced. Final checkout verification is included in the handover.

## Release and recovery

The first two commits provide independently reviewable urgent containment. Studio/UI changes have their own batch. The complete application includes schema-dependent support, triage, email and financial work; closed flags do **not** make its generated Prisma client compatible with the old schema.

Apply the three reviewed migrations in order through the target's verified migration history before deploying the complete generated client:

1. `202610120001_admin_refund_lifecycle`
2. `20261013020000_admin_support_triage`
3. `20261013021000_admin_email_queue`

The complete release defaults `REFUND_LIFECYCLE_ENABLED`, `ADMIN_REFUNDS_ENABLED`, `REFUND_NOTIFICATIONS_ENABLED` and `EMAIL_CAMPAIGNS_ENABLED` to false. The refund reconciliation cron entry is versioned at five minutes; it remains an authenticated no-op with lifecycle off. Existing schedules are preserved. Code and schedule configuration do not constitute a deployed activation.

Before activation, inspect the real migration baseline and historical refund/campaign state, review ambiguous benefit mappings and old processed receipts, confirm Sentry signing, approve access/retention of frozen operation payloads, and verify owners using fresh sessions. The repository supplies no guessed historical repair. Campaigns with missing reviewed snapshots and outcomes beyond the provider recovery window need evidence and review, not new keys or blind replay.

Keep operation, grant and triage history during rollback. Preserve current public entitlement projections after applying refund effects. UI rollback cannot reverse settled money or accepted email. Pause new affected initiations when operationally authorized and retain compatible recovery paths; never restore unsigned webhooks, blanket membership cancellation or replay unresolved sends/refunds with a new key. Full operational details are in [OPERATIONS.md](../OPERATIONS.md), with environment flags in [ENVIRONMENT.md](../ENVIRONMENT.md) and [env.example](../../env.example).

Local implementation and verification used mocked providers and owned synthetic data. No push, production deployment/migration, live refund, renewal change, campaign or customer email was performed. Checkout integration preserves the user's pre-existing `vostudiofinder.code-workspace` edit. The owned disposable PostgreSQL fixture was shut down cleanly after retaining the evidence.
