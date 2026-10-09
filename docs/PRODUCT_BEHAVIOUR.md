# Product Behaviour

Status: canonical high-level reference
Last reviewed against code: 31 August 2026

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

## Email

The app contains templated transactional email plus admin campaign/delivery tooling. Real-user sends are operational actions, not routine tests. Preferences/unsubscribe and delivery tracking must be preserved.

## Admin

Admin pages/APIs require role-protected access. Admin capability includes sensitive data/payment/destructive operations, so UI access control must not substitute for server authorization.

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
