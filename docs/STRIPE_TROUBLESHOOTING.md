# Stripe Payments Not Showing in Admin Panel

## Issue
After completing test payments, the `/admin/payments` page shows no payment records.

## Root Causes

### 1. **Webhooks Not Being Received** (Most Common)

**Symptoms**:
- No payments in admin panel
- No webhook logs in terminal
- Database has no `stripe_webhook_events` records

**Solution**:
```bash
# Start Stripe CLI in a separate terminal
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Important**: 
- Copy the webhook secret (`whsec_...`) from the Stripe CLI output
- Add it to `.env.local`: `STRIPE_WEBHOOK_SECRET="whsec_..."`
- **Restart your dev server** after updating `.env.local`

### 2. **Webhook Secret Mismatch**

**Symptoms**:
- Terminal shows: `❌ Webhook signature verification failed`
- Webhooks are being sent but rejected

**Solution**:
- Check Stripe CLI output for the webhook secret
- Ensure `.env.local` has the EXACT secret
- Restart dev server

### 3. **Failed Payments Not Being Tracked** (Fixed)

Previously, only successful payments were recorded. Now fixed to track:
- ✅ Successful payments (`SUCCEEDED`)
- ❌ Declined cards (`FAILED`)
- ❌ Insufficient funds (`FAILED`)
- ❌ Any payment errors (`FAILED`)

### 4. **User Account Timing**

**Symptoms**:
- Terminal shows: `⏳ User not yet created, deferring payment processing`
- Webhook events exist but no payment records

**Cause**: Webhook arrived before user account creation completed

**Solution**: This is expected and handled automatically. User signs up → payment processes.

## Diagnostic Checklist

### Step 1: Check If Webhooks Are Running

In your dev server terminal, look for these logs when you attempt a payment:

```
🎣 Webhook received
✅ Webhook verified: checkout.session.completed (evt_...)
💳 Processing membership payment for user@example.com
✅ Payment recorded: pay_xxx
```

**If you DON'T see these**:
- ❌ Webhooks are not being received
- ➡️ Start Stripe CLI (see solution #1 above)

### Step 2: Check Stripe CLI Terminal

Look for webhook events being sent:

```
[200] POST /api/stripe/webhook [evt_xxx]
```

**If you see [400] or [401]**:
- ❌ Webhook secret is wrong
- ➡️ Update `.env.local` and restart

### Step 3: Test Payment Flow

1. Go to `http://localhost:3000/auth/signup`
2. Fill in details
3. Use test card: `4242 4242 4242 4242`
4. Watch BOTH terminals:
   - Dev server: Should show webhook logs
   - Stripe CLI: Should show event sent

### Step 4: Test Failed Payments

Use these test cards to generate failures:

```
Declined: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
Processing error: 4000 0000 0000 0119
```

These should NOW appear in `/admin/payments` with status `FAILED`.

## What Should Happen

### Successful Payment Flow

1. User submits payment → Stripe processes
2. Stripe sends `checkout.session.completed` webhook
3. Webhook handler receives and verifies
4. Payment record created in database with `SUCCEEDED` status
5. User granted membership (12 months)
6. Payment appears in `/admin/payments`

### Failed Payment Flow (NEW)

1. User submits payment → Stripe declines
2. Stripe sends `payment_intent.payment_failed` webhook
3. Webhook handler receives and verifies
4. Payment record created with `FAILED` status and error details
5. Payment appears in `/admin/payments` with error message

## Quick Test Script

Run in your browser console on `/admin/payments`:

```javascript
// Check if any payments exist
fetch('/api/admin/payments')
  .then(r => r.json())
  .then(d => console.log('Payments:', d.payments.length, d))
```

## Environment Variables Check

Verify these in `.env.local`:

```env
# Must be TEST keys for development
STRIPE_SECRET_KEY="sk_test_..." 
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# From Stripe CLI output
STRIPE_WEBHOOK_SECRET="whsec_..."

# From Stripe Dashboard → Products (in TEST mode)
STRIPE_MEMBERSHIP_PRICE_ID="price_..."
```

## Common Mistakes

### ❌ Mistake 1: Stripe CLI Not Running
**Error**: No webhooks received, no terminal output
**Fix**: Open a new terminal and run `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### ❌ Mistake 2: Not Restarting Dev Server
**Error**: Old webhook secret still in use
**Fix**: After updating `.env.local`, always restart with `Ctrl+C` then `npm run dev`

### ❌ Mistake 3: Using LIVE Keys
**Error**: Test cards rejected  
**Fix**: Use `sk_test_...` and `pk_test_...` keys from Stripe Dashboard TEST mode

### ❌ Mistake 4: Wrong Webhook Secret
**Error**: Signature verification fails
**Fix**: Copy EXACT secret from Stripe CLI output, including `whsec_` prefix

## Files Updated

Recent changes to fix failed payment tracking:

1. **`src/app/api/stripe/webhook/route.ts`**:
   - Added `handlePaymentFailed()` function
   - Added handlers for `payment_intent.payment_failed`
   - Added comprehensive logging

2. **`src/app/api/stripe/create-membership-checkout/route.ts`**:
   - Added `payment_intent_data` to propagate metadata
   - Ensures failed payments have user info

## Still Having Issues?

1. **Check your terminal logs** carefully during payment
2. **Check Stripe CLI terminal** for webhook delivery
3. **Try with a successful test card first** (4242...)
4. **Then try with a declined card** (4000 0000 0000 0002)
5. **Check Network tab** in browser DevTools for API errors

## Expected Behavior After Fix

- ✅ Successful payments appear in admin panel
- ✅ Declined payments appear with FAILED status
- ✅ Comprehensive webhook logging in terminal
- ✅ Clear error messages for troubleshooting
- ✅ Failed payments show error details in metadata

If payments still don't appear after following these steps, the issue is most likely **Stripe CLI not running** or **webhook secret mismatch**.


