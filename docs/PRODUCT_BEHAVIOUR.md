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
