# Stripe Renewal Setup Guide

**Quick setup guide for membership renewal feature**

---

## Overview

This feature allows users to renew their membership with two options:
1. **Early Renewal** (£25): Get 1 year + 1 month bonus (requires 30+ days remaining)
2. **5-Year Membership** (£80): Get 5 years, save £45 vs annual renewals

---

## Prerequisites

- Existing Stripe account configured
- `STRIPE_MEMBERSHIP_PRICE_ID` already set up for £25 annual membership
- Access to Stripe Dashboard

---

## Setup Steps

### 1. Create 5-Year Product in Stripe

#### Test Mode (for development/preview):
1. Log into Stripe Dashboard
2. Switch to **Test mode** (toggle in top-right)
3. Navigate to **Products** → **Create product**
4. Fill in details:
   - **Name**: `Five-Year Membership`
   - **Description**: `VoiceoverStudioFinder five-year membership - save £45`
5. **Pricing**:
   - **Price**: `80.00`
   - **Currency**: `GBP`
   - **Billing period**: **One time** (NOT recurring)
6. Click **Save product**
7. **Copy the Price ID** (starts with `price_test_...`)

#### Live Mode (for production):
1. Switch to **Live mode**
2. Repeat steps 3-7 above
3. **Copy the Live Price ID** (starts with `price_live_...`)

---

### 2. Update Environment Variables

#### Local Development (`.env.local`):
```env
# Existing (should already be set)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..." 
STRIPE_MEMBERSHIP_PRICE_ID="price_test_..." # £25 annual

# New - Add this
STRIPE_5YEAR_MEMBERSHIP_PRICE_ID="price_test_..." # £80 five-year
```

#### Vercel Development Environment:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Name**: `STRIPE_5YEAR_MEMBERSHIP_PRICE_ID`
   - **Value**: `price_test_...` (from Test Mode)
   - **Environment**: Check "Development"
3. Click **Save**

#### Vercel Preview Environment:
1. Add same variable as above
2. **Environment**: Check "Preview"
3. Use Test Mode price ID

#### Vercel Production Environment:
1. Add same variable
2. **Value**: Use **Live Mode** price ID (`price_live_...`)
3. **Environment**: Check "Production"
4. Click **Save**
5. **Redeploy** production for changes to take effect

---

### 3. Test the Feature

#### Local Testing:
1. Start Stripe webhook forwarding:
   ```bash
   stripe listen --forward-to localhost:4000/api/stripe/webhook
   ```

2. Copy the webhook secret (`whsec_...`) to `.env.local`

3. Start dev server:
   ```bash
   npm run dev
   ```

4. Log in as admin or test user with active membership

5. Navigate to Dashboard → Settings → Membership tab

6. Test both buttons:
   - **Early Renewal**: Should be enabled if 30+ days remaining
   - **5-Year Membership**: Should always be enabled

7. Complete test payment using test card: `4242 4242 4242 4242`

8. Verify in database that `subscriptions.current_period_end` was updated correctly

---

### 4. Webhook Configuration

The webhook already handles renewal events automatically. No additional webhook endpoints needed.

**Events processed**:
- `checkout.session.completed` - Handles both initial signup and renewals
- Distinguishes by `metadata.purpose`: `membership` vs `membership_renewal`
- Distinguishes by `metadata.renewal_type`: `early` vs `5year`

---

## Verification Checklist

- [ ] 5-year product created in Stripe Test mode
- [ ] 5-year product created in Stripe Live mode
- [ ] `STRIPE_5YEAR_MEMBERSHIP_PRICE_ID` added to local `.env.local`
- [ ] Environment variable added to Vercel Development
- [ ] Environment variable added to Vercel Preview
- [ ] Environment variable added to Vercel Production
- [ ] Local test completed successfully
- [ ] Database expiry date extended correctly
- [ ] Early renewal bonus calculated correctly (30 extra days)
- [ ] 5-year renewal calculated correctly (1825 extra days)

---

## Expected Behavior

### Early Renewal:
- **Available**: When user has >= 30 days remaining
- **Calculation**: Current remaining + 365 days + 30 bonus days
- **Example**: 45 days remaining → 440 days total (45 + 365 + 30)
- **Price**: £25

### 5-Year Renewal:
- **Available**: Always (even if expired)
- **Calculation**: Current remaining (or now if expired) + 1825 days
- **Example**: 100 days remaining → 1925 days total
- **Price**: £80
- **Savings**: £45 (vs 5 × £25 = £125)

---

## Troubleshooting

### "Payment system not configured" error
- Check that `STRIPE_5YEAR_MEMBERSHIP_PRICE_ID` is set in environment
- Verify price ID starts with `price_` (not `prod_`)
- Redeploy after adding environment variables

### Early renewal button disabled
- Check user has >= 30 days remaining on membership
- This is intentional - bonus not available when < 30 days
- User can still use 5-year option

### Expiry date not updating
- Check webhook is receiving events (use Stripe CLI logs)
- Verify `metadata.renewal_type` is present in session
- Check database logs for renewal processing

### Duplicate charges
- Webhook handles idempotency automatically
- Check `stripe_webhook_events` table for duplicate processing
- Stripe prevents duplicate checkout sessions

---

## API Endpoints

### POST `/api/membership/renew-early`
Creates checkout session for early renewal (£25 + bonus)

**Authentication**: Required (session)  
**Returns**: `{ clientSecret: string }`  
**Errors**:
- 401: Unauthorized
- 400: No membership found / < 30 days remaining
- 500: Stripe configuration error

### POST `/api/membership/renew-5year`
Creates checkout session for 5-year renewal (£80)

**Authentication**: Required (session)  
**Returns**: `{ clientSecret: string }`  
**Errors**:
- 401: Unauthorized
- 404: User not found
- 500: Stripe configuration error

---

## Security Notes

- Price IDs are server-side only (not exposed to client)
- User authentication required for all renewal endpoints
- Webhook signature verification ensures request authenticity
- Idempotency prevents duplicate processing
- Admin accounts can test but renewals work normally

---

## Support

If you encounter issues:
1. Check Stripe Dashboard → Developers → Logs for errors
2. Check application logs for webhook processing
3. Verify environment variables are set correctly
4. Test with Stripe test cards before using live mode
5. Check `docs/stripe-environment-variables.md` for full configuration

---

**Last Updated**: 2026-01-14  
**Feature Version**: 1.0
