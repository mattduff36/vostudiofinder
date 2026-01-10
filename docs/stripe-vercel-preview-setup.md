# Stripe Setup for Vercel Preview Deployments

**Complete guide for setting up Stripe test mode on Vercel preview branches so clients can test the payment system**

---

## Understanding Stripe Test Mode

### ⚠️ Important: Stripe Test Mode Does NOT Start Fresh

**Stripe Test Mode is persistent** - it does NOT reset or start fresh each time. Here's what you need to know:

1. **Products persist**: Once you create a product in Stripe Test Mode, it stays there until you delete it
2. **Webhooks persist**: Webhook endpoints you create remain active
3. **API keys persist**: Your test API keys (`sk_test_...` and `pk_test_...`) don't change unless you rotate them
4. **Data persists**: All test payments, customers, and events remain in your Stripe Dashboard

**This means**: You only need to set up products and webhooks ONCE in Stripe Test Mode, and they'll work for all preview deployments.

---

## Local Development vs Vercel Preview: Key Differences

### Local Development (What You're Using Now)

**Setup Method**: Stripe CLI
- Run `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Stripe CLI generates a temporary webhook secret (`whsec_...`)
- Webhooks are forwarded through Stripe CLI to your local server
- **No webhook endpoint needed in Stripe Dashboard**

**Environment Variables**:
```env
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."  # From Stripe CLI output
STRIPE_MEMBERSHIP_PRICE_ID="price_..."
```

### Vercel Preview Deployment (What You Need for Client Testing)

**Setup Method**: Stripe Dashboard Webhook Endpoint
- Create a webhook endpoint in Stripe Dashboard pointing to your preview URL
- Stripe sends webhooks directly to your Vercel preview URL
- **Requires a publicly accessible URL** (Vercel preview URLs work perfectly)

**Environment Variables** (Set in Vercel Dashboard):
```env
STRIPE_SECRET_KEY="sk_test_..."  # Same test keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."  # Same test keys
STRIPE_WEBHOOK_SECRET="whsec_..."  # Different - from Stripe Dashboard webhook
STRIPE_MEMBERSHIP_PRICE_ID="price_..."  # Same test price ID
```

---

## Step-by-Step Setup for Vercel Preview

### Step 1: Get Your Stripe Test Mode Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **Toggle to TEST MODE** (switch in top-right - must show "Viewing test data")
3. Navigate to **Developers** → **API keys**
4. Copy both keys:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...` (click "Reveal test key")

### Step 2: Create Test Mode Product (If Not Already Created)

1. **Ensure you're in TEST MODE** (top-right toggle)
2. Go to **Products** → **Add product**
3. Fill in:
   - **Name**: `Annual Membership`
   - **Description**: `VoiceoverStudioFinder annual membership - full site access for 12 months`
   - **Price**: `25.00`
   - **Currency**: `GBP` (or your currency)
   - **Billing period**: **One time** (NOT recurring/subscription)
4. Click **Save product**
5. **Copy the Price ID** (starts with `price_...`)

**Note**: If you already created this product during local development, you can reuse the same Price ID!

### Step 3: Deploy Preview Branch to Vercel

1. Push your preview branch to GitHub:
   ```bash
   git checkout -b preview-signup-payment
   git push origin preview-signup-payment
   ```

2. Vercel will automatically create a preview deployment
3. **Copy the preview URL** (e.g., `https://vostudiofinder-git-preview-signup-payment-yourteam.vercel.app`)

### Step 4: Create Webhook Endpoint in Stripe Dashboard

1. In Stripe Dashboard (TEST MODE), go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your preview webhook URL:
   ```
   https://your-preview-url.vercel.app/api/stripe/webhook
   ```
   **Example**: `https://vostudiofinder-git-preview-signup-payment-yourteam.vercel.app/api/stripe/webhook`
4. Select **API version**: `Latest version` (or match your Stripe SDK version)
5. **Select events to listen to**:
   - ✅ `checkout.session.completed`
   - ✅ `charge.refunded`
   - ✅ `refund.updated`
   - ✅ `payment_intent.payment_failed`
   - ✅ `payment_intent.succeeded`
6. Click **Add endpoint**
7. **Copy the Signing secret** (starts with `whsec_...`)
   - This is displayed immediately after creating the endpoint
   - You can also find it later: Click the endpoint → **Signing secret** → **Reveal**

### Step 5: Set Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. **IMPORTANT**: Select **Preview** environment (not Production!)
5. Add these variables:

```env
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_FROM_DASHBOARD
STRIPE_MEMBERSHIP_PRICE_ID=price_YOUR_TEST_PRICE_ID
```

**Critical Notes**:
- ✅ Use **TEST mode** keys (`sk_test_...` and `pk_test_...`)
- ✅ Use the **webhook secret from Stripe Dashboard** (not from Stripe CLI)
- ✅ Use the **TEST mode Price ID** (same one you use locally)
- ✅ **Do NOT add quotes** around values in Vercel
- ✅ Select **Preview** environment (so it applies to preview deployments)

### Step 6: Redeploy Preview Branch

After adding environment variables:

1. Go to **Deployments** tab in Vercel
2. Find your preview deployment
3. Click **⋯** → **Redeploy**
4. Or push a new commit to trigger a new deployment

---

## Updating Signup Page for Preview Deployments

Currently, your signup page redirects to `/join-waitlist` when `NODE_ENV === 'production'`. Vercel preview deployments also have `NODE_ENV=production`, so we need to detect preview deployments differently.

### Solution: Use Vercel Environment Variables

**Important**: `VERCEL_ENV` is automatically set by Vercel - you do NOT need to set it manually!

Vercel automatically sets `VERCEL_ENV` which can be:
- `development` (local dev with `vercel dev`)
- `preview` (preview deployments)
- `production` (production deployments)

**Note**: When running locally with `npm run dev` (not `vercel dev`), `VERCEL_ENV` will be `undefined`, which is why the code defaults to showing the signup form.

Update your signup page to check `VERCEL_ENV` instead of `NODE_ENV`:

```typescript
// Only redirect to join-waitlist in production (not preview)
if (process.env.VERCEL_ENV === 'production') {
  redirect('/join-waitlist');
}
```

This way:
- ✅ Production site → redirects to `/join-waitlist`
- ✅ Preview deployments → shows signup form
- ✅ Local development → shows signup form

---

## Testing the Preview Deployment

### 1. Test Signup Flow

1. Visit your preview URL: `https://your-preview-url.vercel.app`
2. Navigate to `/auth/signup` (should show signup form, not redirect)
3. Complete signup form
4. Proceed to membership payment page

### 2. Test Payment Flow

1. On the membership page, click "Complete Membership Purchase"
2. Use Stripe test card: `4242 4242 4242 4242`
   - **Expiry**: Any future date (e.g., `12/34`)
   - **CVC**: Any 3 digits (e.g., `123`)
   - **ZIP**: Any 5 digits (e.g., `12345`)
3. Complete payment
4. Verify:
   - ✅ Redirected to success page
   - ✅ User account is ACTIVE
   - ✅ Membership granted (12 months)

### 3. Verify Webhook Delivery

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click your preview webhook endpoint
3. Check **Attempted events** tab
4. You should see `checkout.session.completed` event with status **Succeeded**

### 4. Test Cards for Different Scenarios

| Card Number | Scenario |
|------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Payment declined |
| `4000 0025 0000 3155` | Requires authentication (3DS) |

More test cards: https://stripe.com/docs/testing#cards

---

## Common Issues & Solutions

### Issue 1: Webhook Not Receiving Events

**Symptoms**: Payment succeeds but membership not granted

**Solutions**:
1. ✅ Verify webhook URL is correct in Stripe Dashboard
2. ✅ Check `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
3. ✅ Check Vercel deployment logs for webhook errors
4. ✅ Verify webhook endpoint is active in Stripe Dashboard

### Issue 2: "No such price" Error

**Symptoms**: API returns error about price not found

**Solutions**:
1. ✅ Ensure `STRIPE_MEMBERSHIP_PRICE_ID` is from TEST mode
2. ✅ Verify Price ID exists in Stripe Dashboard (TEST mode)
3. ✅ Check Price ID format: should start with `price_`

### Issue 3: Signup Page Still Redirects

**Symptoms**: Preview deployment redirects to `/join-waitlist`

**Solutions**:
1. ✅ Update signup page to check `VERCEL_ENV` instead of `NODE_ENV`
2. ✅ Redeploy preview branch after code change
3. ✅ **No need to set `VERCEL_ENV` manually** - Vercel sets it automatically to `preview` for preview deployments

### Issue 4: Test Cards Rejected

**Symptoms**: Stripe says "Your request was in live mode, but used a known test card"

**Solutions**:
1. ✅ Verify you're using TEST keys (`sk_test_...` and `pk_test_...`)
2. ✅ Check Stripe Dashboard is in TEST mode
3. ✅ Ensure environment variables are set correctly in Vercel

---

## Environment Variables Summary

### For Vercel Preview Deployments:

```env
# Stripe Test Mode (for client testing)
STRIPE_SECRET_KEY=sk_test_51ABC...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...
STRIPE_WEBHOOK_SECRET=whsec_123...  # From Stripe Dashboard webhook
STRIPE_MEMBERSHIP_PRICE_ID=price_1ABC...  # Test mode price ID
```

### Comparison Table:

| Variable | Local Dev | Vercel Preview | Production |
|----------|-----------|----------------|------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_test_...` | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_test_...` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | From Stripe CLI | From Dashboard | From Dashboard |
| `STRIPE_MEMBERSHIP_PRICE_ID` | Test mode | Test mode | Live mode |
| Webhook Method | Stripe CLI forwarding | Dashboard endpoint | Dashboard endpoint |

---

## Security Best Practices

1. ✅ **Never use live keys** in preview deployments
2. ✅ **Use test mode** for all client testing
3. ✅ **Keep webhook secrets secure** (never commit to git)
4. ✅ **Use different webhook endpoints** for preview vs production
5. ✅ **Monitor webhook events** in Stripe Dashboard

---

## Quick Checklist

Before sharing preview URL with client:

- [ ] Stripe Dashboard in TEST mode
- [ ] Test product created (`Annual Membership`)
- [ ] Test Price ID copied
- [ ] Preview branch deployed to Vercel
- [ ] Webhook endpoint created in Stripe Dashboard (pointing to preview URL)
- [ ] Webhook secret copied from Stripe Dashboard
- [ ] Environment variables set in Vercel (Preview environment)
- [ ] Signup page updated to check `VERCEL_ENV` instead of `NODE_ENV`
- [ ] Preview deployment redeployed
- [ ] Test payment completed successfully
- [ ] Webhook events received in Stripe Dashboard
- [ ] Membership granted correctly

---

## Additional Resources

- **Stripe Dashboard**: https://dashboard.stripe.com/test
- **Stripe Test Cards**: https://stripe.com/docs/testing#cards
- **Stripe Webhooks Guide**: https://stripe.com/docs/webhooks
- **Vercel Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables

---

**Last Updated**: January 2026  
**Status**: ✅ Ready for client testing

