# Stripe Environment Variables - Complete Guide

## Required Variables for All Environments

### 1. Stripe API Keys

#### Development/Preview (Test Mode)
```env
STRIPE_SECRET_KEY="sk_test_..." 
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

#### Production (Live Mode)
```env
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

**Where to get**: Stripe Dashboard → Developers → API keys

⚠️ **CRITICAL**: Never commit these to git. Use Vercel environment variables.

### 2. Webhook Secret

#### Development/Local Testing
```env
STRIPE_WEBHOOK_SECRET="whsec_..." 
```
**Source**: Stripe CLI when running `stripe listen`
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Returns: whsec_...
```

#### Preview Builds (Vercel)
```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```
**Source**: Stripe Dashboard → Webhooks → Add endpoint
- **URL**: `https://your-preview-url.vercel.app/api/stripe/webhook?_vercel_share=YOUR_TOKEN`
- **Events**: Select `checkout.session.completed`, `payment_intent.payment_failed`, `payment_intent.succeeded`, `charge.refunded`, `refund.updated`
- Copy the signing secret

#### Production
```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```
**Source**: Stripe Dashboard → Webhooks → Add endpoint
- **URL**: `https://voiceoverstudiofinder.com/api/stripe/webhook`
- **Events**: Same as preview
- Copy the signing secret

### 3. Membership Price IDs

#### Annual Membership (£25)
```env
STRIPE_MEMBERSHIP_PRICE_ID="price_..."
```

**How to create**:
1. Stripe Dashboard → Products → Create product
2. Name: "Annual Membership"
3. Price: £25.00 GBP
4. Billing: **One-time** (NOT recurring)
5. Copy the Price ID (starts with `price_`)

#### 5-Year Membership (£80) - NEW
```env
STRIPE_5YEAR_MEMBERSHIP_PRICE_ID="price_..."
```

**How to create**:
1. Stripe Dashboard → Products → Create product
2. Name: "Five-Year Membership"
3. Description: "VoiceoverStudioFinder five-year membership - save £45"
4. Price: £80.00 GBP
5. Billing: **One-time** (NOT recurring)
6. Copy the Price ID (starts with `price_`)

⚠️ **IMPORTANT**: Create both price IDs in test mode AND live mode

## Vercel Configuration

### Environment Variable Scopes

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `STRIPE_SECRET_KEY` | ✅ Live key | ✅ Test key | ✅ Test key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ Live key | ✅ Test key | ✅ Test key |
| `STRIPE_WEBHOOK_SECRET` | ✅ Live webhook | ✅ Preview webhook | ✅ CLI webhook |
| `STRIPE_MEMBERSHIP_PRICE_ID` | ✅ Live price | ✅ Test price | ✅ Test price |
| `STRIPE_5YEAR_MEMBERSHIP_PRICE_ID` | ✅ Live price | ✅ Test price | ✅ Test price |

### Setting in Vercel

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add each variable with appropriate scope:
   - **Production**: Live Stripe keys
   - **Preview**: Test Stripe keys
   - **Development**: Test Stripe keys (for local `.env.local`)

## Webhook Configuration per Environment

### Local Development
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start Stripe CLI
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Copy the webhook secret from Terminal 2 output to `.env.local`

### Preview Builds (Vercel)
1. Get your Vercel bypass token (from share link)
   - Example: `?_vercel_share=VKQnIhR12OVwrnW0hPGi9b1wfRryHkrp`

2. In Stripe Dashboard, create webhook:
   - **URL**: `https://vostudiofinder-git-payment-tweaks-dev-mpdees-projects.vercel.app/api/stripe/webhook?_vercel_share=VKQnIhR12OVwrnW0hPGi9b1wfRryHkrp`
   - **Description**: "Preview - payment-tweaks-dev"
   - **Events**: `checkout.session.completed`, `payment_intent.*`, `charge.refunded`, `refund.updated`

3. Copy webhook secret to Vercel env vars (Preview scope)

### Production
1. In Stripe Dashboard (LIVE mode), create webhook:
   - **URL**: `https://voiceoverstudiofinder.com/api/stripe/webhook`
   - **Description**: "Production"
   - **Events**: Same as preview

2. Copy webhook secret to Vercel env vars (Production scope)

## Verification Checklist

### ✅ Development
- [ ] `.env.local` has `STRIPE_SECRET_KEY` (test mode)
- [ ] `.env.local` has `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test mode)
- [ ] `.env.local` has `STRIPE_WEBHOOK_SECRET` (from Stripe CLI)
- [ ] `.env.local` has `STRIPE_MEMBERSHIP_PRICE_ID` (test mode)
- [ ] Stripe CLI is running: `stripe listen`
- [ ] Test payment works and webhook processes

### ✅ Preview (Vercel)
- [ ] Vercel env vars (Preview) have test Stripe keys
- [ ] Vercel env vars (Preview) have preview webhook secret
- [ ] Stripe webhook endpoint configured with `?_vercel_share=...` parameter
- [ ] Test payment on preview URL works
- [ ] Webhook shows 200 responses in Stripe dashboard

### ✅ Production (Vercel)
- [ ] Vercel env vars (Production) have LIVE Stripe keys
- [ ] Vercel env vars (Production) have production webhook secret
- [ ] Stripe webhook endpoint configured (live mode)
- [ ] Test payment with real card works (or use Stripe test mode first)
- [ ] Webhook shows 200 responses in Stripe dashboard

## Common Issues

### Issue: Webhooks return 401 Unauthorized (Preview)
**Cause**: Vercel deployment protection blocking webhooks
**Solution**: Add `?_vercel_share=YOUR_TOKEN` to webhook URL

### Issue: Webhooks return 400 Bad Request
**Cause**: Wrong webhook secret
**Solution**: Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard

### Issue: Payment succeeds but user not activated
**Cause**: Webhook not reaching server OR wrong environment
**Solution**: 
1. Check Stripe dashboard for webhook delivery status
2. Verify webhook URL is correct for environment
3. Check Vercel function logs for errors

### Issue: "Stripe secret key not configured"
**Cause**: Missing `STRIPE_SECRET_KEY` in environment
**Solution**: Add to Vercel env vars or `.env.local`

## Fallback Mechanism

The codebase includes a fallback that handles payments even without webhooks:
- Success page checks Stripe directly if no payment record exists
- Creates payment record manually if Stripe confirms payment
- Grants membership even without webhook processing

This ensures preview builds work even if webhooks aren't configured perfectly.
