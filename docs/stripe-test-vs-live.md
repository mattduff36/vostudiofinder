# ⚠️ CRITICAL: Stripe Test vs Live Mode

## Current Issue

Your `.env.local` is using **LIVE mode keys** which is why:
- ❌ Test cards (4242 4242...) are rejected
- ❌ The error says "Your request was in live mode, but used a known test card"

## How to Fix for Development

### Check Your Current Keys

Look at your `.env.local`:

```env
STRIPE_SECRET_KEY="sk_live_..."  # ❌ LIVE mode - will charge real money!
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."  # ❌ LIVE mode
```

### Get TEST Mode Keys

1. Go to Stripe Dashboard: https://dashboard.stripe.com
2. **Toggle to TEST MODE** (switch in top-right corner - should show "Viewing test data")
3. Go to **Developers** → **API keys**
4. Copy the TEST keys:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...` (click "Reveal test key")

### Update `.env.local` for Development:

```env
# Use TEST keys for development
STRIPE_SECRET_KEY="sk_test_YOUR_TEST_KEY_HERE"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_TEST_KEY_HERE"
STRIPE_MEMBERSHIP_PRICE_ID="price_YOUR_TEST_PRICE_ID"  # Must also be from test mode!
STRIPE_WEBHOOK_SECRET="whsec_YOUR_TEST_WEBHOOK_SECRET"
```

### Create Test Mode Product

You also need to create the membership product in TEST mode:

1. **Ensure you're in TEST mode** (toggle top-right)
2. Go to **Products** → **Add product**
3. Fill in:
   - Name: "Annual Membership"
   - Price: £25.00 GBP
   - Billing: **One time** (NOT recurring)
4. **Copy the TEST Price ID** (starts with `price_...`)
5. Put it in `STRIPE_MEMBERSHIP_PRICE_ID`

---

## Test Mode vs Live Mode

### TEST Mode (Development)
- ✅ Use test card numbers (4242 4242...)
- ✅ No real money charged
- ✅ Safe for development
- ✅ Can simulate different scenarios
- Keys start with: `sk_test_...` / `pk_test_...`

### LIVE Mode (Production Only!)
- ❌ Charges REAL money
- ❌ Test cards rejected
- ❌ Should NEVER be used for development
- Keys start with: `sk_live_...` / `pk_live_...`

---

## After Switching to Test Mode

### Restart Your Server:

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Test with Test Card:

Now you can use:
```
Card: 4242 4242 4242 4242
Expiry: 12/34 (any future date)
CVC: 123 (any 3 digits)
```

### The checkout will now:
1. ✅ Stay on your site (embedded)
2. ✅ Accept test cards
3. ✅ Complete without charging real money
4. ✅ Trigger webhooks (if Stripe CLI running)

---

## Common Mistakes

### Mistake 1: Test Keys with Live Product
❌ Using `sk_test_...` but `STRIPE_MEMBERSHIP_PRICE_ID="price_LIVE_..."`
✅ Both must be from the same mode

### Mistake 2: Live Keys in Development
❌ Testing with `sk_live_...` keys
✅ Always use test keys for development

### Mistake 3: No Product in Test Mode
❌ Created product only in LIVE mode
✅ Need separate products for test and live

---

## When to Use Live Mode

**ONLY use LIVE mode keys when:**
- ✅ Deploying to production
- ✅ Ready to accept real payments
- ✅ All testing completed
- ✅ Business account verified in Stripe

**NEVER use LIVE mode for:**
- ❌ Local development
- ❌ Testing
- ❌ Debugging
- ❌ Learning/experimenting

---

## Quick Checklist

Before testing embedded checkout:

- [ ] Switched Stripe Dashboard to TEST mode (top-right)
- [ ] Got TEST API keys (sk_test_... and pk_test_...)
- [ ] Created product in TEST mode
- [ ] Got TEST Price ID (price_...)
- [ ] Updated `.env.local` with all TEST values
- [ ] Restarted dev server
- [ ] Have test card ready (4242 4242...)

---

**Once you switch to TEST mode, the embedded checkout will work perfectly!** 🎉

