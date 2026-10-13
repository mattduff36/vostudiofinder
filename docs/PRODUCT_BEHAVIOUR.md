# Product Behaviour

Status: canonical high-level reference
Last reviewed against code: 31 August 2026
Admin workflow contracts reviewed against code: October 2026

This document records stable product-level behaviour. Detailed implementation lives in code and feature-specific docs.

## Core product

Voiceover Studio Finder lets users discover voiceover/recording studios, maintain a public studio profile and manage account/membership settings. It also provides administrator surfaces for studio/user operations, payments, email, support, platform updates, suggestions, FAQ, reservations and error-log management.

## Public discovery

- Public studio discovery is exposed through `/studios` and username-based profile pages.
- Search/filter/location behaviour is implemented across `src/components/search`, `src/lib/search`, location/map modules and studio search APIs.
- Public profile visibility and incomplete/expired profile rules must be respected by public browse/search/profile surfaces.

## Account and profile

- Authenticated users manage profile/settings through dashboard surfaces.
- Shared profile and visibility rules should be enforced server-side as well as represented in UI.
- Navigation should use `src/config/navigation.ts` rather than independent copies.

## Membership

`src/lib/membership-tiers.ts` is the current entitlement/limit source of truth.

- BASIC is the default/free tier.
- PREMIUM enables additional profile/features and requires active paid/granted membership state except for admin behaviour defined in membership helpers.
- Current display price for annual Premium is defined in code as £30/year.
- Membership gating/state is implemented by `src/lib/membership.ts` and subscription helpers.
- Legacy membership/VOICEOVER restrictions exist. Do not rewrite them from memory; inspect the current helper logic and tests before changing them.

## Payments and upgrades

Stripe handles membership/featured payment flows. Payment amounts, price IDs and entitlement mapping are server-owned contracts. Webhook processing must remain signature-verified and idempotent.

### Refunds and purchased benefits

The admin refund lifecycle separates four outcomes: money returned, the purchased benefit, future recurring billing and the notification. A partial refund changes money only. When successful refunds plus the requested amount reach the original payment total, the administrator must explicitly choose whether to KEEP or END the purchased benefit. For an applicable recurring subscription, KEEP or CANCEL_AT_PERIOD_END is a separate future-billing choice. These choices have no preselected answer, and END requires an exact eligible purchase-to-benefit association.

The refund review identifies the payment, amount/currency, precise benefit and relevant subscription/period. It does not infer an exact future charge amount. New requests are bounded by successful refunds and unresolved reserved amounts; duplicate submission recovers the same operation. Unknown provider outcomes remain pending/reviewable rather than inviting a new refund request. A refund initiated outside the app has no invented administrator benefit or billing choice.

Ending a Featured benefit affects only its linked studio placement and preserves overlapping placement. Ending Premium affects its linked paid period and preserves independently surviving coverage. A refund never automatically publishes an owner-hidden/inactive studio, removes a deletion/review hold or cancels an unrelated subscription. Unmapped history, ownership changes, unexplained extensions and ambiguous future coverage require review. Historical attribution is not guessed.

Recovery of money, access, billing and notification is independent. Rechecking billing or a failed notification cannot issue money again. A genuine later provider failure/return can revise the money result and require access/billing review; it does not automatically restore access, re-enable renewal or make a compensating charge. Provider acceptance of a notification is distinct from delivery.

Forward payment handling records exact purchased intervals and preserves existing publication state. A recurring checkout's initial renewal choice is not repeatedly reapplied by replaying an old checkout: newer renewal/refund decisions, a changed provider period or changed account context require review. Ordinary accounts retain existing entitlement behavior; accounts with applied/refund-review access effects use surviving valid coverage consistently across membership, expiry and public profile/search/map readers.

`REFUND_LIFECYCLE_ENABLED`, `ADMIN_REFUNDS_ENABLED` and `REFUND_NOTIFICATIONS_ENABLED` control lifecycle, new initiation and notifications separately and default closed. With lifecycle disabled, refund webhook receipts are retained for reconciliation without applying the former blanket membership/visibility changes. Activation, historical reconciliation, currency constraints and rollback are operational gates in `docs/OPERATIONS.md`; this product contract does not authorize a real refund or enable configuration.

## Email

The app contains templated transactional email plus admin campaign/delivery tooling. Real-user sends are operational actions, not routine tests. Preferences/unsubscribe and delivery tracking must be preserved.

### Admin templates, audiences and campaigns

Template editing, preview, test and campaign rendering use the same effective built-in/stored template. A stored override is honored as stored; an unavailable template store is a visible failure, not permission to send different content. Concurrent edits require revision review, and failed saves retain the draft. Preview-only sample variables do not become campaign recipient data.

Campaign audience review distinguishes an explicit set of selected user IDs from everyone matching a filter. The current-page checkbox applies only to that page; cross-page selection remains explicit. Invalid, missing, duplicate and ineligible recipients are reported in review counts. Before first submission, the worker rechecks current account/recipient and applicable marketing preferences. Recipient email addresses are not placed in navigation URLs.

Creation can recover the same campaign after a lost response or reload. Starting requires the reviewed audience and template revision to still match, then freezes the destinations, sender, template/footer and deliveries. Sending uses the frozen content. Acceptance requires a provider message ID; failed and uncertain results remain distinct. An uncertain submission is retried only with its original payload/key within the supported recovery window, then requires review. Cancelled campaigns do not reopen through retry, accepted deliveries are preserved, and a campaign with unresolved uncertainty is not reported complete.

The overview, recipient and delivery pages preserve meaningful URL state, report read errors and keep polling bounded without overlapping requests. Historical started campaigns without the new frozen-delivery contract require explicit review before retry. New campaign start/retry/worker processing requires `EMAIL_CAMPAIGNS_ENABLED=true`; this gate is independent from existing transactional email.

## Admin

Admin pages/APIs require role-protected access. Admin capability includes sensitive data/payment/destructive operations, so UI access control must not substitute for server authorization.

### Studio inspection and profile completion

On `/admin/studios`, the studio summary expands to reveal details. Edit Profile remains an explicit action; clicking the whole card/row no longer opens the editor. Existing collapsed cards/table, column controls, sorting, filters, selection and actions retain their purpose. Expansion does not select a studio, and interacting with a checkbox, switch, link, menu or selected text must not trigger expansion.

Expanded details show the dashboard's completion checklist with completed and outstanding items, required/optional counts and the same percentage. Each item opens its relevant editor section. Administrators can copy the outstanding items, with selectable text offered if clipboard access is unavailable. Details also show the owner/email verification, contact/location, connections, image/avatar presence, membership/expiry, listing/visibility, Featured state, review flag and descriptions.

The shared completion contract retains eighteen existing checks:

| Group | Completion checks |
|---|---|
| Required (11) | Username, display name, email, studio name, short description, full description, at least one studio type, location, a supported connection method, studio website URL, at least one studio image |
| Optional (7) | Avatar, About Me, phone, at least two social links, a positive session rate, equipment list, services offered |

The predicates and weighted percentage are defined in `src/lib/utils/profile-completion.ts`. The studio's website field is authoritative; social checks include all supported fields, including Vimeo and Bluesky. Required completion, overall completion, membership, verification and public visibility remain different concepts. This inspection feature does not add a new requirement to reach 100% before listing.

List filters and derived sorting apply to the matching dataset before pagination. Load More grows an accepted window from 80 to at most 400 records, with subsequent/previous windows available for the rest. Accepted refreshes replace a coherent range and reconcile sorting/filter membership; aborted or obsolete responses do not append duplicate pages. The surrounding controls and accepted rows remain visible during a refresh, with errors distinguished from empty results.

### Profile editing, close and navigation

A clean Edit Profile close closes the modal without requesting a studio-list refresh. Choosing Don't Save discards the unsaved main draft. A confirmed persisted change refreshes its actual studio and reconciles the active list independently from closing; this includes immediate controls that saved while the modal was open. Such saved controls are not undone by Don't Save.

The editor waits for independent writes before main Save or a close decision, prevents competing writes while saving, preserves unrelated draft fields when an immediate control acknowledges, and keeps failed drafts available. Returning to Images or changing viewport uses the same acknowledged gallery. Changing Never Expires participates in dirty tracking and saves a null expiry; turning it off requires an explicitly chosen date.

An explicit admin target remains bound to the selected customer throughout loading, editing and save. A failed lookup shows retry rather than substituting the signed-in administrator. Customer editing does not apply the administrator's sandbox overrides or emit owner-only dashboard events. Completion actions open the correct owner/admin editor section.

Dirty profile modals and shared notes offer Save, Don't Save and Cancel for supported close/navigation paths. Save must succeed before leaving; repeated leave requests share the decision. Native page unload uses the browser warning. Programmatic navigation must explicitly participate in the same guard. Nested dialogs/images and responsive drawers share focus, Escape and scroll ownership as defined in `docs/DESIGN.md`.

### Suggestions and support replies

`/admin/support` redirects to `/admin/suggestions`. Ticket details and reply drafts are keyed by ticket identity; selecting another ticket cannot inherit its reply text or receive its late result. A reply confirmation captures the reviewed recipient and requested status change.

Reply preparation persists an operation, ticket/recipient/version and exact message before dispatch. Browser recovery preserves the operation identity before submission and can resume it after reload; unavailable recovery storage is reported before sending. Confirmed provider acceptance and ticket status are shown independently. A requested status change applies only if the original ticket version still matches. If another administrator changes the ticket afterward, recovery preserves that newer decision.

Status-only recovery never resends the email. Unknown sends keep the original identity/payload during bounded recovery; expiry or conflicting evidence requires review. A terminal reply requires an explicit new-reply action before another message. Deletion is blocked while an unresolved reply operation could still need reconciliation. No provider result is treated as successful merely because a request returned without throwing.

### Error log and local triage

The error log distinguishes Sentry source status from the effective local admin disposition. Marking an issue OPEN, RESOLVED or IGNORED changes the app's local triage; it does not write back to Sentry. Manual Sync Now, scheduled sync and webhook updates preserve that decision. Filtering, counts, detail status and cleanup use the effective disposition consistently.

List and detail requests are keyed to current filters/selection, preserve accepted rows during refresh and expose retryable failures. Sync is an explicit action and reports partial failure. Live and cached detail JSON is bounded/redacted at the response boundary; raw provider failures and token prefixes are excluded from the detail response/logging path. Webhook writes require a valid raw-body signature.

Event groups retain the existing age policy: OPEN groups can be removed after 90 days without a new occurrence, and RESOLVED/IGNORED groups after 30 days without an update. Lightweight local decisions survive cleanup and reimport by stable Sentry issue ID, without retaining raw events. Their current policy is indefinite retention pending an explicit expiry decision. Historical status provenance is not automatically reclassified as an administrator override.

### Other admin surfaces

| Surface | Behavior contract |
|---|---|
| `/admin` and `/admin/analytics` | Reporting distinguishes unavailable data from genuine zero. Activity links identify a supported destination. Accounts updated in the last 30 days are not labelled as sign-ins, and custom-connection counts describe currently listed values. Visitor summaries use rolling 24 hours and exact 7/30 UTC dates including today; counted daily identifiers are not a count of unique people across days. |
| `/admin/payments` and `/admin/payments/[id]` | Deliberate search/filter application resets pagination together; obsolete responses cannot overwrite a newer target. Closing a detail drawer does not fetch. Canonical payment details and per-currency totals remain distinct from subscription filtering and independent refund outcomes. |
| `/admin/reservations` | Failed reads remain retryable. Deletion confirms its target, guards repeated submission and rechecks reserved-account eligibility under lock; active or paid/provider-linked accounts cannot be deleted through the reservation action. |
| `/admin/faq`, `/admin/message-templates`, `/admin/platform-updates` | Failed drafts remain editable; mutation pending state prevents competing writes. Validation rejects invalid/empty input and missing targets. FAQ reorder supports keyboard controls and stale-order conflict handling; cancelled drags make no write. |
| `/admin/waitlist` | Export All CSV retains its all-record scope and Name/Email/Joined Date columns, with CSV quoting and spreadsheet-formula escaping. Confirmed deletion preserves current filter context and updates counts. |
| Shared admin notes | Loading does not create a note. Editing waits for a successful load. First creation and subsequent saves compare the accepted version, report conflicts and retain the draft for review instead of overwriting another administrator's note. |
| `/admin/sandbox` | Supported preview consumers share validated session state immediately. Invalid/restoration failures disable restored overrides; failed changes retain prior accepted settings with a visible error. Customer edits and server authorization use real data/roles. |

The reviewed former owner-alias exceptions now require `ADMIN`, including studio detail/create, test-account deletion, message-user, message templates, notes and sandbox badge visibility. Existing owners' stored admin access was verified before removing aliases. An email address or username alone does not grant admin capability, and this change does not grant roles or replace the session model.

## Scheduled jobs

Vercel cron configuration currently includes subscription enforcement, reservation expiry, engagement email, campaign processing, Sentry sync, error-log cleanup and renewal reminders. `vercel.json` is the schedule source of truth.

## Product change rule

When dated PRDs/implementation summaries disagree with this document or current code, inspect the intended current behaviour and update the appropriate canonical doc. Do not revive historical features solely because archived documentation mentions them.

## Membership recovery and expiry (9 October 2026)

- Expiry removes Premium benefits and moves an account to Basic. It does not itself change studio `status` or turn an owner-hidden profile public. Cron, login and Stripe deletion use the same locked, entitlement-rechecking transition.
- Missing expiry records require review. Deletion-requested accounts are excluded from automatic transitions. A refund-hidden profile remains hidden.
- Basic public rendering limits images, social links, connection methods, studio types and Premium contact/badge/SEO features; stored content is retained for renewal. Voiceover categories are never silently converted to Home Studio. A downgraded Voiceover profile stays hidden until its owner chooses an eligible category.
- The advertised legacy six-month offer is redeemed once. `legacy_premium_offer_state` in user metadata distinguishes `unclaimed`, `claimed`, and `review`. Existing future grants are preserved; ambiguous prior claims are not automatically extended. A first claim records its time and creates an auditable subscription period.
- Recovery uses an explicit snapshot and the conservative policy in `src/lib/subscriptions/recovery-policy.ts`. It does not override visibility-off, deletion, review, refund, paid-membership ambiguity, Voiceover-category or missing-location holds. It sends no emails.
- Downgrade confirmations describe actual visibility. Renewal reminders exclude unclaimed/review legacy offers and do not mark failed provider sends as successful.

Expiry enforcement runs hourly in bounded batches. Historic catch-up (more than 48 hours after expiry) does not send a backlog of downgrade emails.

## Username completion

Display names may contain hyphens. Public usernames must contain 3–20 ASCII letters, digits or underscores, and cannot use reserved routes or system placeholder prefixes. Username validation is enforced in the browser and on the server before Basic activation or a new Premium checkout. Verification and membership entry points return incomplete signups to username selection, including when browser session storage is unavailable.

An authenticated active account stranded with a system placeholder can complete its username once from the dashboard. The server uses the signed-in account identity and refuses subsequent renames. Choosing a username does not alter membership, visibility, payments or deletion state.
