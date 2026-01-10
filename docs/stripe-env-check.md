# Stripe Environment Variables Checklist

## Quick Diagnostic

Run this in your browser console on the membership payment page:

```javascript
console.log('Stripe Key:', window.process?.env?.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'MISSING');
```

Or check your `.env.local` file directly.

---

## Required Variables in `.env.local`

For **TEST MODE** (development):

```env
# Stripe Test Mode Keys (get from: https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY="sk_test_51..." 
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51..."

# Test Mode Price ID (get from: https://dashboard.stripe.com/test/products)
STRIPE_MEMBERSHIP_PRICE_ID="price_..."

# Webhook Secret from Stripe CLI (get from: stripe listen command output)
STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

## Common Issues

### Issue 1: Embedded checkout not showing

**Symptom**: Blank page where payment form should be

**Causes**:
1. ❌ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is missing
2. ❌ Using LIVE key (`pk_live_...`) instead of TEST key (`pk_test_...`)
3. ❌ Variable name typo (must be EXACTLY `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)

**Fix**:
- Check `.env.local` has the correct variable name
- Restart dev server after changing `.env.local`

### Issue 2: "No such price" error

**Symptom**: API returns 500 error about price not found

**Causes**:
1. ❌ Using Product ID (`prod_...`) instead of Price ID (`price_...`)
2. ❌ Using TEST price ID with LIVE keys (or vice versa)
3. ❌ Price doesn't exist in Stripe Dashboard

**Fix**:
- Go to Stripe Dashboard → Products
- **Ensure you're in TEST mode** (toggle top-right)
- Create/find your product
- Copy the **Price ID** (starts with `price_`)
- Paste into `STRIPE_MEMBERSHIP_PRICE_ID`

### Issue 3: Server doesn't see new env variables

**Symptom**: Console shows old values after updating `.env.local`

**Fix**:
```bash
# Stop server (Ctrl+C)
npm run dev
```

---

## Verification Steps

1. **Check file exists**: `.env.local` in project root

2. **Check all 4 variables are set**:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_MEMBERSHIP_PRICE_ID`
   - `STRIPE_WEBHOOK_SECRET`

3. **Check format**:
   - No spaces around `=`
   - No quotes needed for values (but OK if you use them)
   - One variable per line

4. **Check values**:
   - SECRET_KEY starts with `sk_test_`
   - PUBLISHABLE_KEY starts with `pk_test_`
   - PRICE_ID starts with `price_`
   - WEBHOOK_SECRET starts with `whsec_`

5. **Restart server** after any changes

---

## How to Get Each Variable

### STRIPE_SECRET_KEY & NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

1. Go to: https://dashboard.stripe.com
2. Toggle to **TEST MODE** (top-right)
3. Click **Developers** → **API keys**
4. Copy both keys

### STRIPE_MEMBERSHIP_PRICE_ID

1. Go to: https://dashboard.stripe.com (in **TEST MODE**)
2. Click **Products**
3. Find/Create "Annual Membership" product
4. Set price to £25.00, billing: **One time**
5. Copy the **Price ID** (in the pricing section)

### STRIPE_WEBHOOK_SECRET

1. Open terminal
2. Run: `stripe login`
3. Run: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copy the `whsec_...` secret from the output
5. Keep this terminal running while testing

---

## Still Not Working?

Check browser console (F12) for:
- `🔧 Stripe Key loaded: Yes (pk_...)` ← Should say "Yes"
- Any red error messages
- Check Network tab for API errors

Check terminal/server logs for:
- API errors
- Prisma errors
- Stripe errors

---

**Remember**: Every time you change `.env.local`, restart your dev server!

