# Release Summary: What's New & Premium Downgrade Features

**Branch:** `dev/whats-new`  
**Date:** February 2026

---

## What Was Done

### 1. What's New Modal
- **"What's New"** added to the hamburger menu (desktop and mobile)
- Modal shows platform updates grouped by date (newest first)
- Updates use categories: Feature, Improvement, Fix, Security
- **Red dot badge** on the hamburger icon when a new update exists since the user's last login

### 2. Admin: Manage What's New
- New admin section: **Admin → What's New** (burger menu)
- Add, edit, and delete platform updates
- Configure: title, description (one line per bullet), category, release date, and "Highlight this update"

### 3. Premium Membership & Downgrade
- **Auto-renew option** at checkout: two-step selection — "Auto-renew annually £25/year" (default on) or "Pay once £25" — then Stripe payment form
- **Renewal reminders** by email at 30, 14, 7, and 1 day(s) before expiry
- **Settings controls** for Premium users:
  - "Cancel auto-renewal" — stop subscription; keep Premium until current period ends
  - "Downgrade to Basic" — scheduled downgrade at end of current period (no partial refunds)
- **Auto-renew badge** visible to both users (on status card) and admins (read-only in Edit Profile)
- **Upgrade flow** for existing Basic users: "Upgrade to Premium" button opens a modal with two-step payment selection
- **Basic tier limits** clearly shown:
  - Extra images greyed out with "Upgrade to show all images"
  - Extra social link fields greyed with "Premium allows all platforms"
- **Stripe subscriptions** supported for recurring Premium payments

### 4. Bug Fixes
- Downgrade logic now runs for Premium users whose studios are already inactive (edge case)
- Studio status is only set to Active after a successful downgrade (no incorrect Active status if downgrade fails)
- Fixed broken "Upgrade to Premium" CTA button on Basic user membership page (was redirecting to dashboard)
- Removed immediate downgrade path; all downgrades now happen at end of membership period

---

## How to Use the New Features

### For Admins
1. Go to **Admin → What's New** (from the burger menu when logged in as admin)
2. Click **Add Update**
3. Fill in: title (optional), description (one line per bullet), category, release date
4. Optionally tick **Highlight this update**
5. Click **Create Update**

Updates appear in the What's New modal for users.

### For Users
- Open the **hamburger menu** → **What's New**
- If there's a new update since your last login, a red dot appears on the hamburger icon
- Viewing the modal does not change the badge; it disappears after the next login when there are no newer updates

### For Premium Users
- **Cancel auto-renewal:** Settings → Membership → "Cancel auto-renewal" (keeps Premium until period end)
- **Downgrade to Basic:** Settings → Membership → "Downgrade to Basic" (takes effect at end of current period)

### For Basic Users
- **Upgrade to Premium:** Settings → Membership → "Upgrade to Premium — £25/year" button

---

## How to Test

### What's New modal
1. Add an update in Admin → What's New
2. Log in as a user, open the hamburger menu → **What's New**
3. Confirm the modal shows the update with correct date and category
4. Log out and log back in; the red dot should disappear when there are no newer updates

### Auto-renew & checkout
1. Go through Premium signup — select "Auto-renew annually" or "Pay once"
2. Click "Continue to payment" and confirm the Stripe form appears
3. Confirm the Stripe session uses subscription mode (auto-renew) or payment mode (pay once)

### Upgrade flow (existing Basic user)
1. As a Basic user, go to Settings → Membership
2. Click **Upgrade to Premium — £25/year**
3. Select payment option and complete the Stripe checkout
4. Confirm upgrade to Premium with correct auto-renew setting

### Downgrade flow
1. As a Premium user with auto-renew, go to Settings → Membership
2. Click **Cancel auto-renewal** — confirm the modal and that auto-renew status updates
3. Click **Downgrade to Basic** — confirm the modal explains downgrade happens at period end

### Admin: auto-renew visibility
1. Open the Edit Profile modal for a Premium user
2. Go to the Admin Settings tab
3. Confirm the read-only auto-renew badge is visible under Membership Tier

### Basic tier limits
1. As a Basic user with more than 2 images, confirm extra images are greyed with "Upgrade to show all images"
2. As a Basic user, confirm extra social link fields are greyed with "Premium allows all platforms"

### Renewal reminders (cron)
- Use the cron endpoint (with `CRON_SECRET`): `GET /api/cron/send-renewal-reminders`
- Requires Premium users with subscriptions expiring in the configured windows (30, 14, 7, 1 days)

---

*This summary is for client review. For implementation details, see the git diff and codebase.*
