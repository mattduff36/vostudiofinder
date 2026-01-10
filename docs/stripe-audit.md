# Stripe Billing Flow Audit

**Date**: January 6, 2026  
**Branch**: feature/stripe-membership-system  
**Purpose**: Document current Stripe implementation before refactoring to one-time annual membership payments

---

## Current Implementation Overview

### Stripe-Related Files

#### API Routes
1. **`src/app/api/stripe/create-membership-checkout/route.ts`**
   - Creates Stripe checkout session for membership
   - **Current mode**: `subscription` 
   - **Issue**: Should be `payment` for one-time annual fee
   - Accepts `priceId` from client request body
   - **Issue**: Client-controlled pricing is a security risk
   - Dev mode bypass implemented (good)

2. **`src/app/api/stripe/verify-membership-payment/route.ts`**
   - Verifies payment completion
   - Fetches session from Stripe
   - **Issue**: No DB record check for idempotency
   - Dev mode bypass implemented (good)

3. **`src/app/api/stripe/checkout/route.ts`**
   - Generic checkout for premium studio upgrades
   - Uses `SUBSCRIPTION_PLANS` from `lib/stripe.ts`
   - Creates `mode: 'subscription'` sessions
   - **Conflict**: "Premium" concept conflicts with baseline membership

4. **`src/app/api/stripe/webhook/route.ts`**
   - Handles webhook events from Stripe
   - **Events handled**:
     - `checkout.session.completed` (subscription mode)
     - `customer.subscription.created` → writes `subscriptions` table, sets `is_premium: true`
     - `customer.subscription.updated` → updates `subscriptions`
     - `customer.subscription.deleted` → sets `status: CANCELLED`, `is_premium: false`
     - `invoice.payment_succeeded` → sends email
     - `invoice.payment_failed` → sends email
   - **Issues**:
     - Metadata inconsistency: uses both `userId`/`user_id` and `studioId`/`studio_id`
     - No event ID tracking (no idempotency)
     - No durable payment records in DB
     - Focused on subscriptions, not one-time payments

#### Helper Libraries
5. **`src/lib/stripe.ts`**
   - Exports server-side `stripe` instance
   - Exports client-side `getStripe()` promise
   - **`SUBSCRIPTION_PLANS`** constant defines premium yearly plan (£25/year)
   - **`createCheckoutSession()`** - creates subscription checkout
   - **`createBillingPortalSession()`** - for subscription management
   - **`handleSubscriptionSuccess()`** - logs subscription creation
   - **`handleSubscriptionCancellation()`** - logs cancellation
   - **`constructWebhookEvent()`** - verifies webhook signature
   - **Issue**: All functions assume recurring subscriptions

#### Client Components
6. **`src/components/auth/MembershipPayment.tsx`**
   - UI for £25/year membership purchase
   - Sends `priceId` from `NEXT_PUBLIC_STRIPE_MEMBERSHIP_PRICE_ID` to server
   - **Issue**: Client controls price ID (security risk)
   - Redirects to Stripe hosted checkout

7. **`src/components/billing/EnhancedCheckout.tsx`**
   - Premium studio upgrade UI
   - Sends `priceId` from `NEXT_PUBLIC_STRIPE_PRICE_ID` to server
   - **Issue**: Same client-controlled pricing issue
   - Checks `studio.is_premium` to prevent duplicate subscriptions

#### Other Files
8. **`src/app/api/user/invoices/route.ts`**
   - Fetches invoices from Stripe API (live data, not DB)
   - Customer lookup by email
   - **Issue**: No DB invoice records for historical access

9. **`src/app/api/user/invoices/[id]/download/route.ts`**
   - Downloads invoice PDF from Stripe
   - **Issue**: Relies on Stripe API availability

---

## Database Schema (Current)

### Existing Tables

#### `subscriptions`
```prisma
model subscriptions {
  id                     String             @id
  user_id                String
  stripe_subscription_id String?            @unique
  stripe_customer_id     String?
  paypal_subscription_id String?            @unique
  payment_method         PaymentMethod      @default(STRIPE)
  status                 SubscriptionStatus
  current_period_start   DateTime?
  current_period_end     DateTime?
  cancelled_at           DateTime?
  created_at             DateTime           @default(now())
  updated_at             DateTime
  users                  users              @relation(fields: [user_id], references: [id])
}
```

**Current use**: Tracks Stripe subscription IDs and periods  
**New use**: Will become membership entitlement ledger (even without Stripe subscriptions)  
**Issue**: No `payment_id` link; relies on optional `stripe_subscription_id`

#### `refunds`
```prisma
model refunds {
  id                       String       @id
  stripe_refund_id         String       @unique
  stripe_payment_intent_id String
  amount                   Int
  currency                 String
  reason                   String?
  status                   RefundStatus
  processed_by             String
  created_at               DateTime     @default(now())
  updated_at               DateTime
  users                    users        @relation(fields: [processed_by], references: [id])
}
```

**Current use**: Exists but not used (no admin refund UI)  
**Issue**: No link to `user_id` being refunded (only admin who processed it)

#### `studio_profiles`
```prisma
// Relevant fields
is_premium              Boolean                 @default(false)
status                  StudioStatus            @default(ACTIVE)
```

**Current use**: `is_premium` set based on subscription  
**Conflict**: "Premium" concept should not control baseline membership access

---

## Identified Issues & Conflicts

### 1. **Mode Mismatch: Subscription vs Payment**
**Current**: All checkout sessions use `mode: 'subscription'`  
**Required**: `mode: 'payment'` for one-time annual membership  
**Impact**: Webhook handlers expect subscription objects, not payment intents

### 2. **Client-Controlled Pricing**
**Current**: Client sends `priceId` in request body  
**Security Risk**: Client could potentially send wrong price ID  
**Required**: Server selects price ID from env var

### 3. **Metadata Inconsistency**
**Current**: Webhook handlers use mixed naming:
- `metadata.userId` vs `metadata.user_id`
- `metadata.studioId` vs `metadata.studio_id`
**Required**: Standardize on snake_case (`user_id`, `studio_id`, `purpose`)

### 4. **Premium vs Membership Confusion**
**Current**: 
- `is_premium` field set based on subscription status
- Premium subscription grants "enhanced features"
- But baseline membership (£25) should apply to all users
**Required**: 
- Decouple `is_premium` from baseline membership
- Use `subscriptions` table for membership entitlement
- Reserve `is_premium` for future enhanced tiers

### 5. **No Payment Audit Trail**
**Current**: No DB table for payments; relies on Stripe API  
**Issues**:
- Cannot query payment history without Stripe API calls
- No idempotency tracking
- No local audit trail for compliance
**Required**: New `payments` table with full payment records

### 6. **No Webhook Idempotency**
**Current**: Webhook doesn't track processed event IDs  
**Risk**: Replay attacks or Stripe retries could double-grant membership  
**Required**: New `stripe_webhook_events` table to deduplicate

### 7. **No Refund Workflow**
**Current**: `refunds` table exists but no admin UI/API to issue refunds  
**Required**: Admin console to view payments and issue refunds

### 8. **Membership Enforcement Gaps**
**Current**: 
- Studio status enforcement in `src/lib/auth.ts` on sign-in (lazy)
- No proactive gating on studio edit/messaging/reviews
**Required**: 
- Shared membership gate helper
- Apply to all restricted endpoints
- UI paywall when expired

---

## Environment Variables (Current)

### Used in Codebase
```env
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PRICE_ID="price_..."          # Generic premium price
STRIPE_MEMBERSHIP_PRICE_ID="price_..."           # Server-only (good!)
NEXT_PUBLIC_STRIPE_MEMBERSHIP_PRICE_ID="price_..." # Client-exposed (bad!)
```

### Issues
- `NEXT_PUBLIC_STRIPE_MEMBERSHIP_PRICE_ID` exposes price ID to client
- `NEXT_PUBLIC_STRIPE_PRICE_ID` also exposed to client

### Required Changes
- Remove all `NEXT_PUBLIC_*_PRICE_ID` variables
- Keep only `STRIPE_MEMBERSHIP_PRICE_ID` (server-only)
- Server selects price internally

---

## Membership Enforcement (Current State)

### `src/lib/auth.ts` - Sign-In Event Handler
**What it does**:
- On sign-in, checks if user qualifies for legacy membership (studio created before 2026-01-05)
- If eligible and no expiry, grants 6 months from sign-in (capped at 2026-08-31)
- Sets studio `status` to `INACTIVE` if membership expired (lazy enforcement)

**Good**:
- Legacy grace period implemented
- Lazy enforcement prevents frequent DB writes

**Gaps**:
- Only enforces on sign-in (not on each request)
- No enforcement on specific actions (edit studio, send message, etc.)

### Endpoints That Need Membership Gates
Based on plan requirements (restrict when expired):

1. **Studio Profile Actions**:
   - `src/app/api/studio/update/route.ts` - Edit studio
   - `src/app/api/admin/create-studio/route.ts` - Create studio (for admins)
   - Any image upload/reorder endpoints

2. **Messaging** (if exists):
   - Need to audit messaging routes

3. **Reviews** (if exists):
   - Need to audit review routes

4. **Other Member Actions**:
   - Need comprehensive endpoint audit

---

## Refactoring Plan Summary

### Phase 1: Database (No Breaking Changes)
- [x] Add `payments` table
- [x] Add `stripe_webhook_events` table
- [x] Add indexes for performance
- [x] Add `user_id` to `refunds` table for proper linkage

### Phase 2: Checkout & Webhooks (Breaking Changes)
- [ ] Refactor membership checkout to `mode: 'payment'`
- [ ] Remove client-supplied price IDs
- [ ] Update webhook to handle payment events
- [ ] Implement webhook idempotency
- [ ] Standardize metadata naming

### Phase 3: Membership Enforcement
- [ ] Create `src/lib/membership.ts` helper
- [ ] Audit and gate all restricted endpoints
- [ ] Add UI paywall components

### Phase 4: Admin Console
- [ ] Build payments list page
- [ ] Build payment detail page
- [ ] Build refund API and UI

### Phase 5: Documentation
- [ ] Update `env.example`
- [ ] Create Stripe setup guide
- [ ] Update deployment docs

---

## Backward Compatibility Considerations

### What Stays the Same
- `subscriptions` table structure (add fields, don't remove)
- Legacy membership grant logic in `src/lib/auth.ts`
- Existing user data (no migration needed)

### What Changes (Potentially Breaking)
- Webhook event handling (new events, different logic)
- Client components (remove price ID props)
- Metadata format (standardize naming)

### Migration Strategy
- Deploy DB schema changes first (additive only)
- Deploy webhook handler updates
- Deploy client component updates
- Test thoroughly in dev before production

---

## Next Steps

1. ✅ Complete this audit
2. ⏳ Design and implement DB schema changes
3. ⏳ Refactor membership checkout endpoint
4. ⏳ Update webhook handler for one-time payments
5. ⏳ Implement membership gating
6. ⏳ Build admin refunds console
7. ⏳ Update documentation

---

**End of Audit**

