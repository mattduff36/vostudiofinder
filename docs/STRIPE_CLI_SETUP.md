# Stripe CLI Setup for Local Development

## Why Stripe CLI is Required

When testing payments locally, Stripe webhooks need to be forwarded to your local development server. Without the Stripe CLI running, payment records won't be created in your database, which will cause the signup flow to fail.

## Setup Instructions

### 1. Install Stripe CLI

**Windows (using Scoop):**
```bash
scoop install stripe
```

**macOS (using Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Download from https://github.com/stripe/stripe-cli/releases
# Or use package manager
```

### 2. Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate with Stripe.

### 3. Forward Webhooks to Local Server

In a separate terminal, run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will:
- Forward webhook events from Stripe to your local server
- Display the webhook signing secret (you'll need this)

### 4. Set Webhook Secret in `.env.local`

Copy the webhook signing secret from the Stripe CLI output and add it to your `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 5. Verify It's Working

When you create a test payment, you should see webhook events in the Stripe CLI terminal:

```
2024-01-01 12:00:00   --> checkout.session.completed [evt_xxxxx]
2024-01-01 12:00:00  <--  [200] POST http://localhost:3000/api/stripe/webhook [evt_xxxxx]
```

## Troubleshooting

### Payment Not Found Error

If you see `error=payment_not_found` on the signup page:

1. **Check Stripe CLI is running:**
   ```bash
   # Check if port 4242 is listening
   netstat -ano | findstr ":4242"  # Windows
   lsof -i :4242                   # macOS/Linux
   ```

2. **Check webhook secret is set:**
   ```bash
   # In your .env.local
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. **Check webhook endpoint is accessible:**
   - Visit `http://localhost:3000/api/stripe/webhook` (should return 405 Method Not Allowed, not 404)

4. **Check Stripe CLI logs:**
   - Look for webhook events being received
   - Check for any error messages

### Webhook Not Received

If webhooks aren't being received:

1. **Restart Stripe CLI:**
   ```bash
   # Stop current process (Ctrl+C)
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

2. **Check firewall/antivirus:**
   - Ensure port 4242 isn't blocked
   - Check Windows Firewall settings

3. **Verify webhook secret:**
   - Make sure the secret in `.env.local` matches what Stripe CLI shows

### Payment Record Not Created

If webhooks are received but payment records aren't created:

1. **Check database connection:**
   - Verify `DATABASE_URL` in `.env.local` is correct
   - Test database connection

2. **Check webhook handler logs:**
   - Look for errors in the terminal running the dev server
   - Check for Prisma errors

3. **Check webhook event processing:**
   - Verify `checkout.session.completed` events are being handled
   - Check for idempotency issues (duplicate events)

## Quick Start Checklist

- [ ] Stripe CLI installed
- [ ] Logged in to Stripe CLI (`stripe login`)
- [ ] Stripe CLI forwarding webhooks (`stripe listen --forward-to localhost:3000/api/stripe/webhook`)
- [ ] Webhook secret copied to `.env.local`
- [ ] Dev server running (`npm run dev`)
- [ ] Test payment creates payment record in database

## Production

In production, Stripe webhooks are configured in the Stripe Dashboard:
1. Go to Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `payment_intent.payment_failed`, etc.
4. Copy the webhook signing secret to your production environment variables

