# Stripe Deferred Payment Processing

## Overview

When a Stripe webhook arrives **before** the user account is created (race condition), the payment cannot be immediately recorded due to foreign key constraints. This document explains how deferred payment processing works.

## The Race Condition

**Scenario**: User completes Stripe payment → Webhook fires → User account not yet created

**Problem**: 
- `payments.user_id` requires a valid foreign key to `users` table
- Cannot store `user_id: 'PENDING'` - violates FK constraint

## How It Works

### 1. Webhook Detects Missing User

When webhook receives `checkout.session.completed`:

```typescript
let user = await db.users.findUnique({
  where: { email: user_email },
});

if (!user) {
  // User doesn't exist yet - defer processing
  logger.log(`⏳ User ${user_email} not yet created, deferring payment processing`);
  
  // Mark webhook event as unprocessed
  await db.stripe_webhook_events.updateMany({
    where: { stripe_event_id: session.id },
    data: { 
      processed: false,
      error: 'User account not yet created - deferred processing',
    },
  });
  
  return; // Exit early
}
```

### 2. Payment Record Deferred

The payment is **NOT** created in the `payments` table yet. Instead:
- Webhook event remains in `stripe_webhook_events` with `processed: false`
- Can be retried later when user exists

### 3. User Signs Up

When user account is created via `/api/auth/signup`:
- User record created in database
- **TODO**: Check for pending Stripe sessions for this email
- **TODO**: Process any deferred payments

## Implementation TODO

### Option A: Check During Signup

Add to signup completion handler:

```typescript
// After user is created
const pendingWebhooks = await db.stripe_webhook_events.findMany({
  where: {
    processed: false,
    type: 'checkout.session.completed',
    // Filter by email in payload
  },
});

for (const event of pendingWebhooks) {
  // Retry webhook processing now that user exists
  await handleMembershipPaymentSuccess(event.payload);
}
```

### Option B: Manual Webhook Replay

Use Stripe CLI to replay the webhook:

```bash
stripe events resend evt_xxx
```

### Option C: Scheduled Job

Create a background job that periodically retries unprocessed webhooks:

```typescript
// Every 5 minutes, check for unprocessed events older than 1 minute
const stuckWebhooks = await db.stripe_webhook_events.findMany({
  where: {
    processed: false,
    created_at: {
      lt: new Date(Date.now() - 60000), // Older than 1 minute
    },
  },
});

// Retry processing
```

## Current Behavior

**Without additional implementation**:
- Payment webhook arrives before signup: Marked as unprocessed
- User signs up: Account created successfully
- **Payment not automatically processed**
- **Manual intervention required**: Admin must replay webhook or process payment manually

## Recommended Implementation

**Implement Option A** for best user experience:
- No manual intervention needed
- Seamless payment-to-account flow
- User gets immediate membership after signup

## Related Files

- `src/app/api/stripe/webhook/route.ts` - Webhook handler with deferred logic
- `src/app/api/auth/signup/route.ts` - TODO: Add deferred payment check
- `prisma/schema.prisma` - Database schema with FK constraints

## Testing

To test the race condition:

1. Start Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
2. Complete payment without creating account
3. Check `stripe_webhook_events` table - should see `processed: false`
4. Create account with same email
5. Verify payment is now processed (if Option A implemented)


