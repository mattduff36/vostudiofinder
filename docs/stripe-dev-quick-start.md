# Stripe Development - Quick Start Guide

## 🚀 One-Time Setup

### 1. Install Stripe CLI

**macOS/Linux:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
```bash
scoop install stripe
```

### 2. Authenticate (One-Time)
```bash
stripe login
```

## ⚡ Daily Usage

### Option 1: Full Stack (Recommended)
Starts everything: Stripe + Docker + Dev Server
```bash
npm run dev:full
```

### Option 2: Stripe + Dev Server Only
```bash
npm run stripe:setup:dev
```

### Option 3: Stripe Setup Only (Manual Dev Start)
```bash
npm run stripe:setup
# Then manually:
npm run dev
```

## 🛑 Stopping Services

### Stop Stripe Listener
```bash
npm run stripe:stop
```

### Stop Everything
```bash
# Stop Stripe
npm run stripe:stop

# Stop Docker (if running)
npm run docker:down

# Stop Dev Server
# Press Ctrl+C in the terminal running npm run dev
```

## 📊 Monitoring

### View Webhook Events
```bash
tail -f stripe-listener.log
```

### Check Listener Status
```bash
ps aux | grep "stripe listen"
```

### View Docker Logs
```bash
npm run docker:logs
```

## 🧪 Testing Payments

Use these test cards:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **Auth Required:** 4000 0025 0000 3155

More: https://stripe.com/docs/testing#cards

## 🔍 Useful Links

- Local App: http://localhost:4000
- Stripe Dashboard: https://dashboard.stripe.com/test
- Stripe Docs: https://stripe.com/docs

## 🆘 Troubleshooting

### "Stripe CLI not authenticated"
```bash
stripe login
```

### "Port 3000 already in use"
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9
# Or use a different port
PORT=4000 npm run dev
```

### Multiple listeners running
```bash
npm run stripe:stop:clean
npm run stripe:setup
```

### Can't retrieve API keys automatically
The script will prompt you to manually enter them from:
https://dashboard.stripe.com/test/apikeys

## 📚 Full Documentation

See [docs/STRIPE_DEV_AUTOMATION.md](docs/STRIPE_DEV_AUTOMATION.md) for complete documentation.

## 💡 Tips

- The Stripe listener runs in the background
- It continues even if you close the terminal
- Stop it with `npm run stripe:stop` when done
- .env.local is auto-backed up before updates
- The script checks for existing products to avoid duplicates

## 🎯 Recommended Workflow

### Morning:
```bash
npm run dev:full
```

### During Development:
- Code and test normally
- Monitor webhook events if needed: `tail -f stripe-listener.log`

### Evening:
```bash
npm run stripe:stop
npm run docker:down
```

### Next Day:
```bash
npm run dev:full  # Everything starts fresh
```

---

**That's it!** You've eliminated 15+ manual steps down to a single command. 🎉

