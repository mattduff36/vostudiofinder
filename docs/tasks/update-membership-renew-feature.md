# Membership Renewal Feature Implementation Plan

**Branch**: `dev-membership-renew-workflow`  
**Status**: Planning Phase  
**Date Created**: 2026-01-14

---

## Overview

Implement two membership renewal options in the dashboard settings page, allowing users to extend their membership with incentives for early renewal and bulk purchase.

---

## Business Requirements

### 1. Early Renewal Option - £25
- **Price**: £25 (same as annual membership)
- **Bonus**: 1 month (30 days) extra when renewing early
- **Calculation**: Current remaining time + 365 days + 30 bonus days
- **Example**: User has 30 days left → 30 + 365 + 30 = 425 days total
- **Availability**: 
  - Available at any time
  - **Exception**: Disabled when less than 30 days until current expiry
  - Rationale: Prevents users from getting free month when nearly expired

### 2. Five-Year Membership - £80
- **Price**: £80 (save £45 vs 5 annual payments)
- **Duration**: Adds 5 years (1,825 days) to current expiry
- **Value Proposition**: £80 vs £125 (5 × £25) = £45 savings
- **Availability**: Available at any time (no restrictions)

### 3. Admin Testing
- Both buttons should be **enabled** for admin accounts
- Allows testing in all environments (dev, preview, production)
- Admin warning banner remains visible (red warning from previous task)

---

## Technical Specifications

### Database Schema
**No changes required** - using existing `subscriptions` table:
- `current_period_end`: DateTime - membership expiry date
- `status`: SubscriptionStatus - ACTIVE/EXPIRED/etc.
- `user_id`: String - user identifier

### Stripe Products Required

#### Product 1: Early Renewal (Existing)
- **Name**: Annual Membership Renewal
- **Price ID**: Use existing `STRIPE_MEMBERSHIP_PRICE_ID`
- **Amount**: £25.00 GBP
- **Type**: One-time payment

#### Product 2: Five-Year Membership (NEW)
- **Name**: Five-Year Membership
- **Price ID**: New environment variable `STRIPE_5YEAR_MEMBERSHIP_PRICE_ID`
- **Amount**: £80.00 GBP
- **Type**: One-time payment

### Environment Variables

Add to `.env`, `.env.local`, and Vercel:
```env
# Existing (already configured)
STRIPE_SECRET_KEY="sk_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_MEMBERSHIP_PRICE_ID="price_..."  # £25 annual

# New (to be added)
STRIPE_5YEAR_MEMBERSHIP_PRICE_ID="price_..."  # £80 five-year
```

---

## Implementation Plan

### Phase 1: Stripe Product Setup
**Estimated Time**: 15 minutes

1. **Create 5-Year Product in Stripe Dashboard**:
   - Navigate to Products → Create product
   - Name: "Five-Year Membership"
   - Description: "VoiceoverStudioFinder five-year membership - save £45"
   - Price: £80.00 GBP
   - Billing: One-time payment
   - Copy Price ID (starts with `price_`)

2. **Update Environment Variables**:
   - Add `STRIPE_5YEAR_MEMBERSHIP_PRICE_ID` to:
     - Local `.env.local`
     - Vercel development environment
     - Vercel preview environment
     - Vercel production environment

### Phase 2: API Endpoints
**Estimated Time**: 2-3 hours

#### Endpoint 1: `/api/membership/renew-early` (POST)
**Purpose**: Create checkout session for early renewal (£25)

**Request Body**:
```typescript
{
  userId: string;
}
```

**Logic**:
1. Fetch user's current subscription from database
2. Check `current_period_end` date
3. Calculate days remaining: `daysRemaining = (current_period_end - now) / (1000 * 60 * 60 * 24)`
4. **Validate eligibility**: `daysRemaining >= 30` (throw error if < 30 days)
5. Create Stripe checkout session:
   - Price ID: `STRIPE_MEMBERSHIP_PRICE_ID` (£25)
   - Mode: `payment` (one-time)
   - UI Mode: `embedded`
   - Metadata: `{ user_id, renewal_type: 'early', days_remaining: daysRemaining }`
   - Return URL: `/dashboard/settings?renewal=success`
6. Return `clientSecret` for embedded checkout

**Response**:
```typescript
{
  clientSecret: string;
}
```

**Error Cases**:
- User not found → 404
- No active subscription → 400 "No active membership to renew"
- Less than 30 days remaining → 400 "Cannot renew with bonus - less than 30 days remaining"
- Stripe error → 500

#### Endpoint 2: `/api/membership/renew-5year` (POST)
**Purpose**: Create checkout session for 5-year renewal (£80)

**Request Body**:
```typescript
{
  userId: string;
}
```

**Logic**:
1. Fetch user's current subscription
2. Validate user has active subscription (can be expired, just needs to exist)
3. Create Stripe checkout session:
   - Price ID: `STRIPE_5YEAR_MEMBERSHIP_PRICE_ID` (£80)
   - Mode: `payment`
   - UI Mode: `embedded`
   - Metadata: `{ user_id, renewal_type: '5year' }`
   - Return URL: `/dashboard/settings?renewal=success`
4. Return `clientSecret`

**Response**:
```typescript
{
  clientSecret: string;
}
```

#### Endpoint 3: Update `/api/stripe/webhook`
**Purpose**: Handle renewal payment completion

**Changes Required**:
1. In `checkout.session.completed` handler:
   - Check metadata for `renewal_type`
   - If `renewal_type === 'early'`:
     - Fetch current `current_period_end`
     - Calculate new expiry: `current_period_end + 365 days + 30 days`
     - Update subscription record
   - If `renewal_type === '5year'`:
     - Fetch current `current_period_end` (or use now if expired)
     - Calculate new expiry: `current_period_end + 1825 days`
     - Update subscription record
   - Update payment status to SUCCEEDED
   - Send confirmation notification

2. Create payment record in `payments` table
3. Update subscription status to ACTIVE if was expired

### Phase 3: UI Components
**Estimated Time**: 3-4 hours

#### Component 1: `RenewalModal.tsx`
**Location**: `src/components/dashboard/RenewalModal.tsx`

**Purpose**: Display embedded Stripe checkout for renewals

**Props**:
```typescript
interface RenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  renewalType: 'early' | '5year';
  userId: string;
  currentExpiry?: Date;
  daysRemaining?: number;
}
```

**Features**:
- Minimal layout (no large headers/features like signup payment)
- Show renewal type and price at top
- Embedded Stripe checkout
- For early renewal: Show calculation breakdown
  - "Current days remaining: X"
  - "New subscription period: 365 days"
  - "Bonus days: 30"
  - "Total new period: X days"
- Loading states
- Error handling
- Success redirect on completion

**Layout**:
```
┌─────────────────────────────────────┐
│  Early Renewal - £25                │
│  (or Five-Year - £80)               │
├─────────────────────────────────────┤
│  Calculation Breakdown              │
│  • Current: 45 days                 │
│  • New period: 365 days             │
│  • Bonus: 30 days                   │
│  • Total: 440 days                  │
├─────────────────────────────────────┤
│                                     │
│   [Embedded Stripe Checkout]        │
│                                     │
└─────────────────────────────────────┘
```

#### Component 2: Update `Settings.tsx`
**Location**: `src/components/dashboard/Settings.tsx`

**Changes**:
1. Add state for renewal modal:
   ```typescript
   const [renewalModalOpen, setRenewalModalOpen] = useState(false);
   const [renewalType, setRenewalType] = useState<'early' | '5year'>('early');
   ```

2. Update "Renew Early" button (line ~507):
   - Remove `disabled` attribute
   - Add click handler:
     ```typescript
     onClick={() => {
       // Check if < 30 days remaining
       if (membership.daysUntilExpiry < 30) {
         toast.error('Early renewal bonus not available - less than 30 days remaining');
         return;
       }
       setRenewalType('early');
       setRenewalModalOpen(true);
     }}
     ```
   - Update styling to active state
   - Show conditional tooltip if < 30 days

3. Update "5-Year Membership" button (line ~515):
   - Remove `disabled` attribute
   - Add click handler:
     ```typescript
     onClick={() => {
       setRenewalType('5year');
       setRenewalModalOpen(true);
     }}
     ```
   - Update styling to active state

4. Add `<RenewalModal>` component at bottom:
   ```typescript
   <RenewalModal
     isOpen={renewalModalOpen}
     onClose={() => setRenewalModalOpen(false)}
     renewalType={renewalType}
     userId={data.user.id}
     currentExpiry={profileData?.membership?.expiresAt}
     daysRemaining={profileData?.membership?.daysUntilExpiry}
   />
   ```

5. Update button text and styling:
   - Early Renewal: "Renew Early (1 month bonus!)" - active green state
   - 5-Year: "5-Year Membership - £80 (Save £45!)" - active blue state

### Phase 4: Utility Functions
**Estimated Time**: 1 hour

**File**: `src/lib/membership-renewal.ts` (new file)

```typescript
/**
 * Calculate new expiry date for early renewal
 * @param currentExpiry Current membership expiry date
 * @returns New expiry date (current + 365 days + 30 bonus days)
 */
export function calculateEarlyRenewalExpiry(currentExpiry: Date): Date {
  const newExpiry = new Date(currentExpiry);
  newExpiry.setDate(newExpiry.getDate() + 365 + 30);
  return newExpiry;
}

/**
 * Calculate new expiry date for 5-year renewal
 * @param currentExpiry Current membership expiry date (or now if expired)
 * @returns New expiry date (current/now + 1825 days)
 */
export function calculate5YearRenewalExpiry(currentExpiry: Date | null): Date {
  const baseDate = currentExpiry && currentExpiry > new Date() 
    ? currentExpiry 
    : new Date();
  const newExpiry = new Date(baseDate);
  newExpiry.setDate(newExpiry.getDate() + 1825);
  return newExpiry;
}

/**
 * Check if user is eligible for early renewal bonus
 * @param daysRemaining Days until current expiry
 * @returns true if >= 30 days remaining
 */
export function isEligibleForEarlyRenewal(daysRemaining: number): boolean {
  return daysRemaining >= 30;
}

/**
 * Format renewal period breakdown for display
 */
export function formatRenewalBreakdown(
  daysRemaining: number,
  renewalType: 'early' | '5year'
): {
  current: number;
  added: number;
  bonus: number;
  total: number;
} {
  if (renewalType === 'early') {
    return {
      current: daysRemaining,
      added: 365,
      bonus: 30,
      total: daysRemaining + 365 + 30,
    };
  } else {
    return {
      current: daysRemaining,
      added: 1825,
      bonus: 0,
      total: daysRemaining + 1825,
    };
  }
}
```

### Phase 5: Testing Checklist
**Estimated Time**: 2-3 hours

#### Local Testing (Development)
- [ ] Stripe webhook forwarding works: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- [ ] Early renewal API endpoint returns clientSecret
- [ ] 5-year renewal API endpoint returns clientSecret
- [ ] Buttons are clickable in dashboard
- [ ] Modal opens with correct renewal type
- [ ] Embedded checkout loads
- [ ] Test payment completion (use test card: 4242 4242 4242 4242)
- [ ] Webhook receives event and extends membership correctly
- [ ] Database `subscriptions.current_period_end` updates correctly
- [ ] Success toast appears after payment

#### Edge Cases
- [ ] Test early renewal when < 30 days remaining (should show error)
- [ ] Test early renewal when = 30 days remaining (should work)
- [ ] Test 5-year renewal when membership expired (should use today as base)
- [ ] Test as admin user (should work for testing)
- [ ] Test when no active subscription (should error gracefully)
- [ ] Test Stripe payment failure (card decline)
- [ ] Test duplicate webhook events (idempotency)

#### Preview/Production Testing
- [ ] Create preview deployment
- [ ] Configure preview webhook in Stripe
- [ ] Test end-to-end flow in preview
- [ ] Verify calculations are correct
- [ ] Verify payment records created
- [ ] Monitor Sentry for errors

---

## Files to Create/Modify

### New Files
1. `src/app/api/membership/renew-early/route.ts` - Early renewal API
2. `src/app/api/membership/renew-5year/route.ts` - 5-year renewal API
3. `src/components/dashboard/RenewalModal.tsx` - Renewal checkout modal
4. `src/lib/membership-renewal.ts` - Renewal utility functions
5. `docs/stripe-renewal-setup.md` - Setup guide for renewals

### Modified Files
1. `src/components/dashboard/Settings.tsx` - Enable buttons, add handlers
2. `src/app/api/stripe/webhook/route.ts` - Handle renewal payment events
3. `.env.local` - Add 5-year price ID
4. `docs/stripe-environment-variables.md` - Document new variable

---

## Rollout Strategy

### Phase A: Stripe Setup (Dev Environment)
1. Create 5-year product in Stripe test mode
2. Update local environment variables
3. Test product creation successful

### Phase B: Backend Development
1. Create API endpoints
2. Implement renewal logic
3. Update webhook handler
4. Add utility functions
5. Write unit tests

### Phase C: Frontend Development
1. Create RenewalModal component
2. Update Settings.tsx with handlers
3. Add loading/error states
4. Implement success notifications

### Phase D: Integration Testing
1. Test full flow locally
2. Test edge cases
3. Verify database updates
4. Check payment records

### Phase E: Preview Deployment
1. Push to branch
2. Deploy to Vercel preview
3. Create 5-year product in Stripe test mode for preview URL
4. Configure webhook for preview URL
5. End-to-end testing in preview

### Phase F: Production Preparation
1. Create 5-year product in Stripe **live mode**
2. Add production price ID to Vercel production environment
3. Update production webhook configuration
4. Merge to main after testing complete

### Phase G: Production Deployment
1. Merge dev branch to main
2. Deploy to production
3. Monitor for errors
4. Test with real admin account (small payment)
5. Announce feature to users

---

## Success Metrics

### Functional Requirements
- [ ] Users can successfully renew early and receive 30-day bonus
- [ ] Users can successfully purchase 5-year membership
- [ ] Calculations are accurate (verified in database)
- [ ] Payment records created correctly
- [ ] Webhook processing is reliable (no duplicate charges)
- [ ] Error handling works gracefully

### User Experience
- [ ] Button states are clear (disabled vs enabled)
- [ ] Modal loads quickly (< 2 seconds)
- [ ] Stripe checkout loads without errors
- [ ] Success/error messages are clear
- [ ] Users understand the value proposition

### Business Goals
- [ ] Incentivize early renewals (30-day bonus)
- [ ] Increase revenue through 5-year option
- [ ] Reduce renewal friction
- [ ] Track renewal conversion rates

---

## Risk Assessment & Mitigation

### Risk 1: Incorrect Expiry Calculation
**Severity**: HIGH  
**Mitigation**: 
- Comprehensive unit tests for date calculations
- Manual verification in preview environment
- Database checks after test payments

### Risk 2: Duplicate Payment Processing
**Severity**: MEDIUM  
**Mitigation**:
- Stripe webhook idempotency (already implemented)
- Check for existing payment_intent_id before processing
- Transaction locks on subscription updates

### Risk 3: User Confusion About Bonus Eligibility
**Severity**: LOW  
**Mitigation**:
- Clear error message when < 30 days remaining
- Tooltip explaining bonus requirement
- FAQ entry about renewal options

### Risk 4: Stripe Webhook Failures
**Severity**: MEDIUM  
**Mitigation**:
- Comprehensive error logging
- Sentry monitoring
- Manual reconciliation process for failed webhooks
- Stripe Dashboard for payment verification

---

## Documentation Updates Required

1. **Stripe Setup Guide**: Add 5-year product creation steps
2. **Environment Variables Doc**: Document `STRIPE_5YEAR_MEMBERSHIP_PRICE_ID`
3. **User FAQ**: Add "How do membership renewals work?"
4. **Admin Docs**: Testing procedures for renewals
5. **API Documentation**: Document new renewal endpoints

---

## Future Enhancements (Out of Scope)

- Automatic renewal reminders (email notifications)
- Discount codes for renewals
- 10-year lifetime membership option
- Gift memberships
- Renewal analytics dashboard
- A/B testing different bonus periods
- Referral bonuses for renewals

---

## Notes

- This feature reuses existing Stripe infrastructure (embedded checkout, webhook handling)
- No database migrations required
- Minimal changes to existing code
- Admin testing capability ensures quality assurance
- Clear separation of concerns (API → Logic → UI)

---

## Approval Checklist

Before starting implementation:
- [ ] Business requirements reviewed and approved
- [ ] Pricing confirmed (£25 early, £80 five-year)
- [ ] Bonus structure confirmed (30 days early bonus)
- [ ] Eligibility rules confirmed (>= 30 days for early renewal)
- [ ] Admin testing approach approved
- [ ] Stripe products ready in test mode
- [ ] Environment variables documented

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-14  
**Status**: Ready for Implementation
