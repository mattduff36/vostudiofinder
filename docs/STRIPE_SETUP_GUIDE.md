# Stripe Setup Guide

**Complete guide for setting up Stripe membership payments on VoiceoverStudioFinder**

---

## Overview

This project uses Stripe for one-time annual membership payments (£25/year). This guide walks you through:

1. Creating a Stripe account
2. Setting up the membership product
3. Configuring webhooks
4. Getting API keys
5. Testing locally
6. Going live

---

## Prerequisites

- Stripe account (create at [stripe.com](https://stripe.com))
- Access to your project's environment variables
- Stripe CLI (for local testing)

---

## Step 1: Create Stripe Account

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Sign up with your business email
3. Complete business verification (required for live payments)
4. Enable your account for the UK (GBP) or your target currency

---

## Step 2: Create Membership Product

### In Stripe Dashboard:

1. Navigate to **Products** → **Add product**
2. Fill in product details:
   - **Name**: `Annual Membership`
   - **Description**: `VoiceoverStudioFinder annual membership - full site access for 12 months`
3. **Pricing**:
   - **Price**: `25.00`
   - **Currency**: `GBP` (or your currency)
   - **Billing period**: **One time** (NOT recurring)
   - ⚠️ **IMPORTANT**: Do NOT select "Recurring" or "Subscription"
4. Click **Save product**
5. **Copy the Price ID** (starts with `price_...`)
   - You'll need this for `STRIPE_MEMBERSHIP_PRICE_ID`

### Why One-Time Payment?

- Members pay £25 for exactly 12 months of access
- After 12 months, membership expires
- Manual renewal (another one-time payment) required
- No auto-billing or subscription management needed

---

## Step 3: Get API Keys

### Test Mode (Development):

1. In Stripe Dashboard, ensure you're in **Test mode** (toggle in top-right)
2. Navigate to **Developers** → **API keys**
3. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)
4. Copy both keys

### Environment Variables:

```env
STRIPE_SECRET_KEY="sk_test_YOUR_SECRET_KEY_HERE"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_PUBLISHABLE_KEY_HERE"
```

⚠️ **Never commit real keys to git!** Use `.env.local` (git-ignored)

---

## Step 4: Configure Webhooks

Webhooks allow Stripe to notify your app when payments succeed or fail.

### Local Development:

#### Install Stripe CLI:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
# Download from https://github.com/stripe/stripe-cli/releases
```

#### Forward Webhooks Locally:

```bash
# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will output a webhook signing secret like:
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef...
```

Copy this secret to your `.env.local`:
```env
STRIPE_WEBHOOK_SECRET="whsec_YOUR_LOCAL_WEBHOOK_SECRET"
```

### Production (Vercel/Live Site):

1. In Stripe Dashboard, navigate to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://voiceoverstudiofinder.com/api/stripe/webhook
   ```
4. Select **API version**: `Latest version` (or match your Stripe SDK version)
5. **Select events to listen to**:
   - `checkout.session.completed`
   - `charge.refunded`
   - `refund.updated`
6. Click **Add endpoint**
7. **Copy the Signing secret** (starts with `whsec_...`)
8. Add to production environment variables:
   ```env
   STRIPE_WEBHOOK_SECRET="whsec_YOUR_PRODUCTION_WEBHOOK_SECRET"
   ```

#### Important:
- ✅ Use different webhook secrets for test vs live mode
- ✅ Keep secrets secure (never in git)
- ✅ Test webhooks before going live

---

## Step 5: Environment Variables Summary

Your `.env.local` should look like:

```env
# Stripe Test Mode (Development)
STRIPE_SECRET_KEY="sk_test_51ABC..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51ABC..."
STRIPE_WEBHOOK_SECRET="whsec_123..."
STRIPE_MEMBERSHIP_PRICE_ID="price_1ABC..."
```

For production (Vercel):

```env
# Stripe Live Mode (Production)
STRIPE_SECRET_KEY="sk_live_51ABC..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_51ABC..."
STRIPE_WEBHOOK_SECRET="whsec_456..."
STRIPE_MEMBERSHIP_PRICE_ID="price_1XYZ..."
```

⚠️ **Security Notes**:
- `STRIPE_SECRET_KEY` - Server-only, never expose to client
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Safe to expose to client
- `STRIPE_WEBHOOK_SECRET` - Server-only, used to verify webhook authenticity
- `STRIPE_MEMBERSHIP_PRICE_ID` - Server-only, client cannot choose price

---

## Step 6: Testing

### Test Cards (Development Mode):

Stripe provides test cards that simulate different scenarios:

| Card Number         | Scenario                      |
|---------------------|-------------------------------|
| 4242 4242 4242 4242 | Successful payment            |
| 4000 0000 0000 9995 | Payment declined              |
| 4000 0025 0000 3155 | Requires authentication (3DS) |

- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

### Test Flow:

1. Start your dev server: `npm run dev`
2. In another terminal, start Stripe CLI webhook forwarding:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. Visit: `http://localhost:3000/auth/membership`
4. Fill in test user details
5. Click "Complete Membership Purchase"
6. Use test card `4242 4242 4242 4242`
7. Complete payment
8. Check:
   - ✅ User is redirected to success page
   - ✅ Webhook fires (visible in Stripe CLI output)
   - ✅ Database: `payments` table has record
   - ✅ Database: `subscriptions` table has 12-month membership
   - ✅ Database: `stripe_webhook_events` table has event record

### Verify in Stripe Dashboard:

1. Go to **Payments** → you should see the test payment
2. Go to **Developers** → **Webhooks** → your endpoint → **Attempted events**
3. Check that `checkout.session.completed` event was sent and succeeded

---

## Step 7: Going Live

### Activate Your Account:

1. Complete business verification in Stripe Dashboard
2. Add bank account for payouts: **Settings** → **Bank accounts and scheduling**
3. Set payout schedule (e.g., daily/weekly)

### Switch to Live Mode:

1. In Stripe Dashboard, toggle to **Live mode** (top-right)
2. Create a NEW product for live mode:
   - Go to **Products** → **Add product**
   - Same settings as test product (£25, one-time)
   - Copy the LIVE Price ID (`price_...`)
3. Get LIVE API keys:
   - **Developers** → **API keys**
   - Copy `pk_live_...` and `sk_live_...`
4. Create LIVE webhook:
   - **Developers** → **Webhooks** → **Add endpoint**
   - URL: `https://voiceoverstudiofinder.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `charge.refunded`, `refund.updated`
   - Copy the LIVE webhook secret

### Update Production Environment Variables:

In Vercel (or your hosting platform):

```env
STRIPE_SECRET_KEY="sk_live_YOUR_REAL_KEY"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_REAL_KEY"
STRIPE_WEBHOOK_SECRET="whsec_YOUR_REAL_WEBHOOK_SECRET"
STRIPE_MEMBERSHIP_PRICE_ID="price_YOUR_REAL_PRICE_ID"
```

### Test with Real Card:

⚠️ **Use your own card first** to verify everything works!

1. Visit your live site
2. Complete a real £25 payment
3. Verify:
   - ✅ Webhook fired successfully (check Stripe Dashboard)
   - ✅ Payment appears in admin console: `/admin/payments`
   - ✅ Membership granted (12 months)
   - ✅ User can access member features

4. Issue a test refund:
   - Go to `/admin/payments/[payment-id]`
   - Issue partial refund (e.g., £10)
   - Verify membership still active
   - Issue full refund (remaining £15)
   - Verify membership immediately cancelled

---

## Admin Functions

### View All Payments:

- **URL**: `/admin/payments`
- **Permissions**: Admin only
- **Features**:
  - Search by user email
  - Filter by status (Succeeded, Refunded, etc.)
  - Pagination

### View Payment Details:

- **URL**: `/admin/payments/[id]`
- **Features**:
  - Full payment information
  - Customer details
  - Associated membership
  - Refund history

### Issue Refunds:

1. Navigate to payment detail page
2. Click "Issue Refund"
3. Enter amount (full or partial)
4. Add reason (optional)
5. Confirm

**Refund Behavior**:
- **Partial refund**: Membership remains active
- **Full refund**: Membership immediately cancelled, studio set to INACTIVE

---

## Troubleshooting

### "Payment failed" error:

**Possible causes**:
- Incorrect API keys (test vs live mismatch)
- Product not created in correct mode
- Card declined (use test card 4242...)

**Solution**: Check browser console and server logs for detailed error

### Webhook not firing:

**Possible causes**:
- Webhook endpoint URL incorrect
- Webhook secret mismatch
- Firewall blocking Stripe IPs

**Solution**:
1. Check webhook URL is correct
2. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
3. Check Stripe Dashboard → Webhooks → Event attempts for errors

### Payment succeeded but membership not granted:

**Possible causes**:
- Webhook failed to process
- Database error
- Event not logged in `stripe_webhook_events`

**Solution**:
1. Check `stripe_webhook_events` table for event
2. Check server logs for errors
3. Manually verify payment in Stripe Dashboard
4. Check `payments` and `subscriptions` tables

### Double-granting membership:

**Should not happen** - Idempotency is built-in via:
- `stripe_webhook_events.stripe_event_id` (unique constraint)
- `payments.stripe_checkout_session_id` (unique constraint)

If it does occur, check for duplicate events in `stripe_webhook_events`

---

## Security Best Practices

1. ✅ **Never** expose `STRIPE_SECRET_KEY` to client
2. ✅ **Never** accept price IDs from client (server selects)
3. ✅ **Always** verify webhook signatures
4. ✅ **Never** commit API keys to git
5. ✅ Use different keys for test vs live
6. ✅ Rotate keys if compromised
7. ✅ Enable Stripe Radar (fraud detection)
8. ✅ Set up alerts for failed payments

---

## Support

### Stripe Support:
- Dashboard: [https://dashboard.stripe.com/](https://dashboard.stripe.com/)
- Docs: [https://stripe.com/docs](https://stripe.com/docs)
- Support: [https://support.stripe.com/](https://support.stripe.com/)

### VoiceoverStudioFinder:
- Check `docs/STRIPE_AUDIT.md` for implementation details
- Review webhook logs in `stripe_webhook_events` table
- Test locally with Stripe CLI

---

**Last Updated**: January 6, 2026  
**Stripe API Version**: 2025-10-29.clover  
**Implementation Status**: ✅ Complete

