# Stripe Development Automation Guide

This guide explains how to use the automated Stripe setup scripts for local development, eliminating the manual configuration steps.

## Overview

The Stripe development automation scripts handle:
- ✅ Starting the Stripe CLI listener
- ✅ Capturing webhook secrets
- ✅ Retrieving API keys
- ✅ Creating test products and prices
- ✅ Updating `.env.local` automatically
- ✅ Managing listener processes

## Prerequisites

### 1. Install Stripe CLI

**macOS/Linux:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
```bash
scoop install stripe
```

**Manual Installation:**
Download from: https://github.com/stripe/stripe-cli/releases

### 2. One-Time Authentication

Before using the automation scripts, authenticate once:

```bash
stripe login
```

This will open your browser for authentication. You only need to do this once.

## Quick Start

### Option 1: Setup Only

Run the setup script without starting the dev server:

```bash
npm run stripe:setup
```

Or directly:

```bash
bash scripts/setup-stripe-dev.sh
```

### Option 2: Setup + Start Dev Server

Run setup and automatically start the Next.js dev server:

```bash
npm run stripe:setup:dev
```

Or directly:

```bash
bash scripts/setup-stripe-dev.sh --start-dev
```

## What the Script Does

### 1. Environment Check
- Verifies Stripe CLI is installed
- Confirms you're authenticated
- Checks project structure

### 2. Environment File Setup
- Creates `.env.local` from `env.example` if it doesn't exist
- Creates a timestamped backup of existing `.env.local`
- Updates/adds Stripe variables

### 3. Process Management
- Stops any existing Stripe listeners
- Cleans up old processes

### 4. API Key Retrieval
- Fetches your test secret key (`sk_test_...`)
- Fetches your test publishable key (`pk_test_...`)
- Falls back to manual input if automatic retrieval fails

### 5. Product Creation
- Creates an "Annual Membership" product
- Sets up a one-time payment price (£25.00)
- Checks for existing products to avoid duplicates
- Generates a price ID (`price_...`)

### 6. Webhook Listener
- Starts `stripe listen` in the background
- Forwards events to `localhost:3000/api/stripe/webhook`
- Captures the webhook secret (`whsec_...`)
- Logs output to `stripe-listener.log`

### 7. Environment Update
The script updates your `.env.local` with:
```bash
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_MEMBERSHIP_PRICE_ID="price_..."
```

## Stopping the Stripe Listener

### Stop Listener Only

```bash
npm run stripe:stop
```

Or:

```bash
bash scripts/stop-stripe-dev.sh
```

### Stop and Clean Logs

```bash
npm run stripe:stop:clean
```

Or:

```bash
bash scripts/stop-stripe-dev.sh --clean
```

## Monitoring Webhook Events

View real-time webhook events:

```bash
tail -f stripe-listener.log
```

Or check the Stripe Dashboard:
https://dashboard.stripe.com/test/webhooks

## Common Workflows

### Starting Fresh Each Day

```bash
# Stop yesterday's listener
npm run stripe:stop

# Start new setup + dev server
npm run stripe:setup:dev
```

### Quick Restart

```bash
# Stop everything
npm run stripe:stop

# Restart (reuses existing product/price)
npm run stripe:setup:dev
```

### Checking Listener Status

```bash
# Check if listener is running
ps aux | grep "stripe listen"

# View recent webhook events
tail -n 50 stripe-listener.log
```

## Troubleshooting

### Issue: "Stripe CLI is not installed"

**Solution:** Install Stripe CLI using the methods above

### Issue: "You are not logged in to Stripe CLI"

**Solution:** Run `stripe login` and authenticate in your browser

### Issue: "Failed to create product"

**Solution:** 
- Check your Stripe account is active
- Verify you're in test mode
- Try creating a product manually in the dashboard first

### Issue: "Failed to retrieve webhook secret"

**Solution:**
- Check if port 3000 is available
- Look at `stripe-listener.log` for errors
- Try manually: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Issue: Listener stops unexpectedly

**Solution:**
```bash
# Check for errors
cat stripe-listener.log

# Restart just the listener
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Issue: Multiple listeners running

**Solution:**
```bash
# Stop all listeners
npm run stripe:stop

# Verify they're stopped
ps aux | grep "stripe listen"

# Start fresh
npm run stripe:setup
```

## Manual Setup (If Automation Fails)

If the automated scripts don't work for your environment, fall back to manual setup:

### 1. Get API Keys
Visit: https://dashboard.stripe.com/test/apikeys

Copy:
- Secret key → `STRIPE_SECRET_KEY`
- Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 2. Create Product
Visit: https://dashboard.stripe.com/test/products

Create:
- Name: "Annual Membership"
- Price: £25.00 GBP
- Type: One-time payment

Copy the Price ID → `STRIPE_MEMBERSHIP_PRICE_ID`

### 3. Start Listener
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook secret → `STRIPE_WEBHOOK_SECRET`

### 4. Update .env.local
Paste all variables into `.env.local`

## Script Architecture

### `setup-stripe-dev.sh`
Main automation script that handles the complete setup process.

**Features:**
- Automated API key retrieval
- Product/price creation
- Background listener management
- Environment file updates
- Backup creation

### `stop-stripe-dev.sh`
Cleanup script for stopping Stripe processes.

**Features:**
- Process detection and termination
- Log file cleanup
- Graceful shutdown handling

## Environment Variables

### Required Variables
```bash
STRIPE_SECRET_KEY                    # Server-side secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY   # Client-side publishable key
STRIPE_WEBHOOK_SECRET                # Webhook signing secret
STRIPE_MEMBERSHIP_PRICE_ID           # Price ID for membership product
```

### Security Notes
- **Never commit `.env.local`** to version control
- Use **test keys** (`sk_test_`, `pk_test_`) for development
- Use **live keys** (`sk_live_`, `pk_live_`) only in production
- The publishable key is safe to expose to the client
- The secret key must never be exposed

## Testing Payments

After setup, test with these cards:

| Scenario | Card Number | CVC | Date |
|----------|-------------|-----|------|
| Success | 4242 4242 4242 4242 | Any | Future |
| Decline | 4000 0000 0000 0002 | Any | Future |
| Auth Required | 4000 0025 0000 3155 | Any | Future |
| Insufficient Funds | 4000 0000 0000 9995 | Any | Future |

More test cards: https://stripe.com/docs/testing#cards

## Webhook Events

The listener automatically forwards these events:
- `checkout.session.completed` - Payment succeeded
- `charge.refunded` - Refund processed
- `refund.updated` - Refund status changed
- `payment_intent.succeeded` - Payment confirmed
- `payment_intent.payment_failed` - Payment failed

## Best Practices

### 1. Daily Workflow
```bash
# Morning: Start everything
npm run stripe:setup:dev

# Work...

# Evening: Stop listener
npm run stripe:stop
```

### 2. Before Committing Code
```bash
# Ensure .env.local is in .gitignore
git status

# Should NOT see .env.local listed
```

### 3. Switching Between Projects
```bash
# Always stop listeners when switching projects
npm run stripe:stop

# Start fresh in new project
cd other-project
npm run stripe:setup
```

### 4. Backup Strategy
The setup script automatically creates backups:
```
.env.local.backup.20260107_143022
```

Keep recent backups for rollback if needed.

## Integration with Development Workflow

### With Docker
```bash
# Start Stripe first
npm run stripe:setup

# Then start Docker services
npm run docker:up

# Start Next.js
npm run dev
```

### With Database Setup
```bash
# Setup database
npm run db:push

# Setup Stripe
npm run stripe:setup

# Start dev server
npm run dev
```

### Full Development Stack
Create a convenience script (`scripts/dev-full.sh`):
```bash
#!/bin/bash
npm run stripe:setup
npm run docker:up
npm run dev
```

## Advanced Usage

### Custom Port
```bash
PORT=4000 bash scripts/setup-stripe-dev.sh
```

### Custom Product Name
Edit `scripts/setup-stripe-dev.sh`:
```bash
PRODUCT_NAME="Your Product Name"
PRICE_AMOUNT="5000"  # £50.00
PRICE_CURRENCY="usd"
```

### Multiple Environments
Use different env files:
```bash
# Development
npm run stripe:setup

# Staging
ENV_FILE=.env.staging bash scripts/setup-stripe-dev.sh

# Local production testing
ENV_FILE=.env.production.local bash scripts/setup-stripe-dev.sh
```

## Continuous Integration

For CI/CD pipelines, skip the Stripe setup:
```yaml
# .github/workflows/ci.yml
env:
  SKIP_STRIPE: true
```

The application gracefully handles missing Stripe configuration in non-production environments.

## Further Reading

- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Project Stripe Setup Guide](./STRIPE_SETUP_GUIDE.md)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review `stripe-listener.log` for errors
3. Consult [STRIPE_TROUBLESHOOTING.md](./STRIPE_TROUBLESHOOTING.md)
4. Check Stripe Dashboard for account issues
5. Verify your Stripe account has test mode enabled

## Summary

**Before Automation:**
- 15+ manual steps
- 10-15 minutes setup time
- Easy to make mistakes
- Need to redo daily

**With Automation:**
- 1 command: `npm run stripe:setup:dev`
- 30-60 seconds setup time
- Automatic and consistent
- Handles cleanup and restarts

This automation significantly improves the developer experience and reduces setup friction for Stripe integration testing.

