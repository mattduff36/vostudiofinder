# Release Summary: What's New & Premium Downgrade Features

**Branch:** `dev/whats-new`  
**Date:** February 2026

---

## What Was Done

### 1. What’s New Modal
- **“What’s New”** added to the hamburger menu (desktop and mobile)
- Modal shows platform updates grouped by date (newest first)
- Updates use categories: Feature, Improvement, Fix, Security
- **Red dot badge** on the hamburger icon when a new update exists since the user’s last login

### 2. Admin: Manage What’s New
- New admin section: **Admin → What’s New** (burger menu)
- Add, edit, and delete platform updates
- Configure: title, description (one line per bullet), category, release date, and “Highlight this update”

### 3. Premium Membership & Downgrade
- **Auto-renew option** at checkout: “Auto-renew annually at £25/year” (default off)
- **Renewal reminders** by email at 30, 14, 7, and 1 day(s) before expiry
- **Settings controls** for Premium users:
  - “Let my membership expire” – turn off auto-renew
  - “Downgrade to Basic now” – switch to Basic immediately
- **Basic tier limits** clearly shown:
  - Extra images greyed out with “Upgrade to show all images”
  - Extra social link fields greyed with “Premium allows all platforms”
- **Stripe subscriptions** supported for recurring Premium payments

### 4. Bug Fixes
- Downgrade logic now runs for Premium users whose studios are already inactive (edge case)
- Studio status is only set to Active after a successful downgrade (no incorrect Active status if downgrade fails)

---

## How to Use the New Features

### For Admins
1. Go to **Admin → What’s New** (from the burger menu when logged in as admin)
2. Click **Add Update**
3. Fill in: title (optional), description (one line per bullet), category, release date
4. Optionally tick **Highlight this update**
5. Click **Create Update**

Updates appear in the What’s New modal for users.

### For Users
- Open the **hamburger menu** → **What’s New**
- If there’s a new update since your last login, a red dot appears on the hamburger icon
- Viewing the modal does not change the badge; it disappears after the next login when there are no newer updates

### For Premium Users
- **Enable/disable auto-renew:** Settings → Membership → “Let my membership expire”
- **Downgrade to Basic:** Settings → Membership → “Downgrade to Basic now”

---

## How to Test

### What’s New modal
1. Add an update in Admin → What’s New
2. Log in as a user, open the hamburger menu → **What’s New**
3. Confirm the modal shows the update with correct date and category
4. Log out and log back in; the red dot should disappear when there are no newer updates

### Auto-renew & checkout
1. Go through Premium signup with **Auto-renew** checked
2. Confirm the Stripe session uses subscription mode
3. Optionally test with **Auto-renew** unchecked and confirm one-time payment

### Downgrade flow
1. As a Premium user, go to Settings → Membership
2. Click **Let my membership expire** – confirm the modal and that auto-renew is disabled
3. Click **Downgrade to Basic now** – confirm the modal and that you are downgraded to Basic

### Basic tier limits
1. As a Basic user with more than 2 images, confirm extra images are greyed with “Upgrade to show all images”
2. As a Basic user, confirm extra social link fields are greyed with “Premium allows all platforms”

### Renewal reminders (cron)
- Use the cron endpoint (with `CRON_SECRET`): `GET /api/cron/send-renewal-reminders`
- Requires Premium users with subscriptions expiring in the configured windows (30, 14, 7, 1 days)

---

*This summary is for client review. For implementation details, see the git diff and codebase.*
