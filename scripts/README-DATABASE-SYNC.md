# Database Synchronization

## Overview

One script to mirror the production database into dev. It reads every table from production and writes it to dev, making them identical.

## Usage

```bash
npm run db:sync
```

This runs `scripts/full-sync-production-to-dev.ts`.

**What it does:**
1. Deletes ALL data in the dev database
2. Copies ALL tables and ALL fields from production to dev
3. Verifies the counts match

**Safety:**
- Production is READ ONLY - never modified
- Requires double confirmation (or `--confirm` flag to skip prompts)
- Validates that dev and production URLs are different before proceeding

## Skip Confirmation

```bash
npx tsx scripts/full-sync-production-to-dev.ts --confirm
```

## Database Connections

- **Dev:** `.env.local` → `DATABASE_URL`
- **Production:** `.env.production` → `DATABASE_URL`

## Tables Copied

Users, accounts, sessions, studio profiles, studio types, studio images, studio services, payments, subscriptions, refunds, reviews, review responses, messages, user connections, user metadata, notifications, content reports, saved searches, pending subscriptions, support tickets, FAQ, waitlist, contacts, Stripe webhook events, error log groups, POI, admin sticky notes, rate limit events, profile audit findings, profile enrichment suggestions, profile audit log, email templates, email template versions, email campaigns, email deliveries, email preferences, platform updates (What's New).

## Other Tools

- `npm run db:compare` — Compare dev and production schemas (`scripts/compare-databases.ts`)
- `npm run db:sync-faq-waitlist` — Bidirectional FAQ/waitlist sync

## Troubleshooting

**"Missing database URLs"** — Check `.env.local` and `.env.production` both have `DATABASE_URL` set.

**"Dev and Production databases are the same"** — The URLs in both env files are identical. Fix `.env.production`.
