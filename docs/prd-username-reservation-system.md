# PRD: Username Reservation & Payment Capture System

**Status:** Draft  
**Priority:** High  
**Created:** 2026-01-06  
**Owner:** Development Team  
**Target Release:** Q1 2026

---

## 1. Executive Summary

### Problem Statement
Currently, when a user's payment fails during signup, we lose all opportunity to re-engage them. We capture no information about failed payment attempts, cannot track conversion funnel dropoff, and have no mechanism to remind users to complete their signup. Additionally, the deferred payment processing system is complex and prone to edge cases.

### Solution Overview
Implement a username reservation system that creates a placeholder user account **before** payment processing. This captures user information immediately, reserves their chosen username for 7 days, and enables automated re-engagement emails for failed or abandoned payments.

### Business Impact
- **Increase conversion rate** by 15-25% through re-engagement emails
- **Reduce username conflicts** by reserving usernames immediately
- **Improve analytics** by tracking complete conversion funnel
- **Simplify codebase** by eliminating deferred payment processing
- **Generate leads** even from failed payment attempts

---

## 2. Goals & Success Metrics

### Primary Goals
1. Capture user information before payment processing
2. Reserve usernames for 7 days to create urgency
3. Track all payment attempts (success, failure, abandonment)
4. Enable automated re-engagement email campaigns
5. Simplify webhook processing (user always exists)

### Success Metrics
| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Payment completion rate | Unknown | 75% | 3 months |
| Re-engagement email open rate | N/A | 35% | 3 months |
| Failed payment retry rate | 0% | 15-20% | 3 months |
| Username reservation conflicts | Unknown | <1% | 1 month |
| Webhook processing errors | 5-10% | <1% | 1 month |

---

## 3. User Stories

### As a New User
- **I want** my username reserved immediately after I choose it
- **So that** I don't lose it if my payment fails temporarily
- **Acceptance Criteria:**
  - Username is reserved when I click "Continue to Membership"
  - I see confirmation: "Username @johndoe reserved for you for 7 days"
  - Nobody else can claim this username during reservation period

### As a User with Failed Payment
- **I want** to receive an email notification when my payment fails
- **So that** I can retry with a different payment method
- **Acceptance Criteria:**
  - Email sent within 5 minutes of payment failure
  - Email includes specific error (e.g., "Card declined")
  - Email contains direct link to retry payment
  - Username reservation status clearly shown

### As a User Who Abandoned Signup
- **I want** reminder emails about my reserved username
- **So that** I'm reminded to complete my signup
- **Acceptance Criteria:**
  - Reminder on Day 2: "Complete your signup"
  - Reminder on Day 5: "2 days left to claim @johndoe"
  - No emails after reservation expires

### As an Admin
- **I want** to see all payment attempts (including failures)
- **So that** I can understand conversion funnel and payment issues
- **Acceptance Criteria:**
  - `/admin/payments` shows ALL payment records
  - Filter by status: SUCCEEDED, FAILED, PENDING, ABANDONED
  - Can see failed payment error messages
  - Can manually retry or cancel reservations

---

## 4. User Flow

### Current Flow (BEFORE)
```
1. User fills signup form
2. User selects username
3. User redirected to Stripe checkout
4. User enters payment info
   ├─ Success: Webhooks fire → Defer → User signs in → Account created → Process deferred payments
   └─ Failure: Webhooks fire → User doesn't exist → Payment dropped → No record
```

### New Flow (AFTER)
```
1. User fills signup form
2. User selects username
3. ✅ CREATE PLACEHOLDER USER (status: PENDING, expires: +7 days)
4. User redirected to Stripe checkout (with user_id in metadata)
5. User enters payment info
   ├─ Success: Webhook fires → Update user status: PENDING → ACTIVE → Grant membership
   ├─ Failure: Webhook fires → Record failed payment → Send "retry" email
   └─ Abandoned: No webhook → Cron job sends "reminder" emails → Day 7: Expire/delete
```

---

## 5. Technical Requirements

### 5.1 Database Schema Changes

#### Update `users` Table
```prisma
model users {
  id                      String        @id
  email                   String        @unique
  username                String        @unique
  display_name            String
  password_hash           String
  
  // NEW FIELDS
  status                  UserStatus    @default(PENDING)  // PENDING, ACTIVE, EXPIRED
  reservation_expires_at  DateTime?                        // Username reservation expiry
  payment_attempted_at    DateTime?                        // When they first tried to pay
  payment_retry_count     Int           @default(0)        // Number of payment attempts
  
  // Existing fields
  role                    UserRole      @default(USER)
  avatar_url              String?
  created_at              DateTime      @default(now())
  updated_at              DateTime
  
  // Relations
  studio_profile          studio_profiles?
  payments                payments[]
  subscriptions           subscriptions[]
}

enum UserStatus {
  PENDING   // Created but payment not completed
  ACTIVE    // Payment successful, account active
  EXPIRED   // Reservation expired, account inactive
}
```

#### Update `payments` Table
```prisma
model payments {
  // No changes needed - user_id FK constraint remains
  // But now user_id will ALWAYS be valid (no more deferred processing)
}
```

### 5.2 API Changes

#### `/api/auth/signup` (POST)
**Current Behavior:** Validates form, stores password in sessionStorage, redirects to username selection

**New Behavior:**
1. Validate signup form
2. Check if email already exists (including PENDING users)
3. Hash password
4. **Create placeholder user** with status `PENDING`
5. Set `reservation_expires_at: now() + 7 days`
6. Store user in session
7. Redirect to username selection

**Response:**
```typescript
{
  success: true,
  userId: "abc123",
  message: "Account created! Complete payment to activate."
}
```

#### `/api/auth/username-selection` (POST)
**Current Behavior:** Validates username, redirects to Stripe

**New Behavior:**
1. Validate username availability (exclude EXPIRED reservations)
2. **Update existing user** with chosen username
3. Generate Stripe checkout session with **real user_id** in metadata
4. Redirect to Stripe

**Stripe Metadata:**
```typescript
{
  user_id: "abc123",        // Real user ID (not email!)
  user_email: "user@test.com",
  user_name: "John Doe",
  user_username: "johndoe",
  purpose: "membership"
}
```

#### `/api/stripe/webhook` (POST)
**Current Behavior:** Defers processing if user doesn't exist

**New Behavior:**
1. Verify webhook signature
2. Extract `user_id` from metadata (always exists now)
3. Process payment immediately:
   - **Success:** Update user `status: ACTIVE`, grant membership
   - **Failure:** Record failed payment, increment `payment_retry_count`, send retry email
4. No more deferral logic

#### NEW: `/api/auth/retry-payment` (POST)
**Purpose:** Allow users to retry payment without creating new account

**Request:**
```typescript
{
  userId: string,
  sessionToken: string  // From email link
}
```

**Response:**
```typescript
{
  checkoutUrl: string,  // New Stripe checkout session
  reservationExpires: Date,
  username: string
}
```

### 5.3 Cron Jobs / Background Tasks

#### Job 1: Reservation Expiry (Runs Daily)
```typescript
// Run: Every day at 02:00 UTC
// Purpose: Clean up expired reservations

1. Find users where:
   - status = PENDING
   - reservation_expires_at < now()
   - payment_retry_count = 0 (never attempted payment)

2. For each user:
   - Update status: EXPIRED
   - Send final "reservation expired" email
   - Optional: Delete after 30 days
```

#### Job 2: Re-engagement Emails (Runs Hourly)
```typescript
// Run: Every hour
// Purpose: Send re-engagement emails

1. Find users where:
   - status = PENDING
   - created_at = now() - 2 days → Send "Day 2" reminder
   - created_at = now() - 5 days → Send "Day 5" urgency email

2. Track email sends to avoid duplicates
```

### 5.4 Email Templates

#### Email 1: Payment Failed
**Subject:** Payment Issue - Complete Your Signup to Claim @{{username}}

**Content:**
```
Hi {{displayName}},

We tried to process your payment for VoiceoverStudioFinder, but it didn't go through:

❌ Error: {{errorMessage}}

Your username @{{username}} is reserved for you until {{expirationDate}}.

[Retry Payment Now]

Need help? Reply to this email or contact support@voiceoverstudiofinder.com

Thanks,
The VoiceoverStudioFinder Team
```

#### Email 2: Reminder (Day 2)
**Subject:** Complete Your Signup - @{{username}} is Reserved for You

**Content:**
```
Hi {{displayName}},

You started signing up for VoiceoverStudioFinder, but didn't complete your payment.

Good news: Your username @{{username}} is still available!

You have 5 days left to claim it before it expires.

[Complete Signup Now - Only £25/year]

Questions? Just reply to this email.

Thanks,
The VoiceoverStudioFinder Team
```

#### Email 3: Urgency (Day 5)
**Subject:** ⏰ Only 2 Days Left to Claim @{{username}}

**Content:**
```
Hi {{displayName}},

This is your final reminder - your reserved username @{{username}} expires in 2 days!

After {{expirationDate}}, someone else can claim it.

[Claim @{{username}} Now - £25/year]

Don't miss out on joining the VoiceoverStudioFinder community.

Thanks,
The VoiceoverStudioFinder Team
```

#### Email 4: Expiration (Day 7)
**Subject:** Your @{{username}} Reservation Has Expired

**Content:**
```
Hi {{displayName}},

Your username reservation @{{username}} has expired and is now available for others to claim.

If you'd still like to join VoiceoverStudioFinder, you can sign up again (though the username may no longer be available).

[Sign Up Again]

Thanks,
The VoiceoverStudioFinder Team
```

---

## 6. Implementation Steps

### Phase 1: Database Migration
- [ ] Add `status`, `reservation_expires_at`, `payment_attempted_at`, `payment_retry_count` to `users` table
- [ ] Create `UserStatus` enum (PENDING, ACTIVE, EXPIRED)
- [ ] Create migration script
- [ ] Test migration on dev database
- [ ] Document rollback procedure

### Phase 2: Update Signup Flow
- [ ] Modify `/api/auth/signup` to create placeholder user
- [ ] Update `/api/auth/username-selection` to use real user_id
- [ ] Update Stripe metadata to include `user_id` instead of just email
- [ ] Remove sessionStorage password hack (use real user record)
- [ ] Add username reservation confirmation UI

### Phase 3: Update Webhook Handler
- [ ] Remove all deferred payment processing logic
- [ ] Update `handleMembershipPaymentSuccess` to update existing user
- [ ] Update `handlePaymentFailed` to use user_id from metadata
- [ ] Add `payment_retry_count` increment
- [ ] Trigger failed payment email

### Phase 4: Create Re-engagement System
- [ ] Create email templates (4 templates listed above)
- [ ] Implement `/api/auth/retry-payment` endpoint
- [ ] Create secure token system for email links
- [ ] Build cron job for reservation expiry
- [ ] Build cron job for re-engagement emails
- [ ] Add email tracking/logging

### Phase 5: Admin Dashboard Updates
- [ ] Update `/admin/payments` to show PENDING users
- [ ] Add filter for user status (PENDING, ACTIVE, EXPIRED)
- [ ] Show reservation expiry dates
- [ ] Add "Manual Activation" button for admins
- [ ] Show payment retry count

### Phase 6: Testing & Validation
- [ ] **Re-run payment flow tests:**
  - [ ] Test declined card → Check payment appears in `/admin/payments` with status FAILED
  - [ ] Test insufficient funds card → Check payment appears in `/admin/payments` with status FAILED
  - [ ] Test successful card → Check payment appears in `/admin/payments` with status SUCCEEDED
  - [ ] Verify user status transitions: PENDING → ACTIVE (success) or remains PENDING (failure)
- [ ] Test username reservation conflicts
- [ ] Test reservation expiry cron job
- [ ] Test re-engagement email delivery
- [ ] Test retry payment flow
- [ ] Load test: 1000 simultaneous signups
- [ ] Test edge cases (expired reservations, multiple retries)

### Phase 7: Deployment
- [ ] Deploy to staging environment
- [ ] Run full regression tests
- [ ] Monitor error logs for 48 hours
- [ ] Deploy to production during low-traffic window
- [ ] Monitor Stripe webhooks for failures

### Phase 8: Post-Launch Monitoring
- [ ] Track conversion rate improvements
- [ ] Monitor email open/click rates
- [ ] Track payment retry success rate
- [ ] Review failed payment error patterns
- [ ] Adjust email timing based on data

---

## 7. Edge Cases & Considerations

### Edge Case 1: User Tries to Sign Up with Expired Username
**Scenario:** User A reserves @johndoe, expires. User B tries to claim @johndoe.

**Solution:** 
- Check username availability excludes `EXPIRED` status
- Allow immediate re-use of expired usernames
- Show notification: "@johndoe is now available!"

### Edge Case 2: Multiple Failed Payment Attempts
**Scenario:** User tries 3 different cards, all fail.

**Solution:**
- Increment `payment_retry_count` each time
- Send "need help?" email after 3rd failure
- Extend reservation by 2 days after each attempt (max 14 days total)

### Edge Case 3: User Completes Payment After Reservation Expired
**Scenario:** User receives Day 7 email, clicks link after expiration, someone else claimed username.

**Solution:**
- Show error: "Username @johndoe is no longer available"
- Offer username suggestions
- Create new account with new username
- Process payment normally

### Edge Case 4: Webhook Arrives Before User Creation
**Scenario:** Race condition - webhook fires before database commit.

**Solution:**
- Add retry logic in webhook handler (3 attempts, 1s delay)
- If user still not found after retries, defer as before (fallback)
- Log error for investigation

### Edge Case 5: User Signs In Before Payment
**Scenario:** User creates account, closes browser, tries to sign in without paying.

**Solution:**
- Allow sign-in for PENDING users
- Redirect to payment page: "Complete your payment to activate"
- Show countdown: "X days left to claim @username"

---

## 8. Security & Compliance

### Data Protection (GDPR)
- **Right to erasure:** Delete EXPIRED accounts after 30 days
- **Data minimization:** Only store essential information in PENDING status
- **Consent:** Add checkbox: "I agree to receive signup completion emails"

### PCI Compliance
- Never store card details (Stripe handles this)
- Use secure tokens for payment retry links
- Log all payment-related actions

### Email Anti-Spam
- Include unsubscribe link in all emails
- Respect unsubscribe immediately (stop all reservation emails)
- Track bounces and remove invalid emails

---

## 9. Dependencies & Risks

### Dependencies
- Stripe API (payment processing)
- Email service (currently configured: Resend)
- Cron job system (needs to be set up)
- Session management (NextAuth)

### Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Email delivery failures | High | Medium | Use reliable email service (Resend), monitor bounce rates |
| Cron jobs not running | High | Low | Use managed service (Vercel Cron), add monitoring |
| Database migration issues | High | Low | Test thoroughly on staging, have rollback plan |
| Stripe metadata size limits | Medium | Low | Keep metadata minimal, use user_id not full objects |
| Username squatting | Medium | Medium | Implement rate limiting, require email verification |

---

## 10. Open Questions

1. **Should we allow extending reservations?**
   - User requests more time to complete payment
   - Pro: Better UX, more conversions
   - Con: Username unavailable longer

2. **What happens if user signs up again with same email?**
   - Option A: Show error "Email already registered"
   - Option B: Send "complete existing signup" email
   - Option C: Allow, but warn about existing reservation

3. **Should admins be able to manually activate PENDING users?**
   - Use case: Payment issue resolved offline (bank transfer, etc.)
   - Implementation: Add "Manual Activation" button in admin panel

4. **How do we handle malicious users creating many PENDING accounts?**
   - Rate limiting: Max 3 signups per IP per day
   - Email verification before username reservation
   - CAPTCHA on signup form

---

## 11. Success Criteria

### Must Have (Launch Blockers)
✅ Username reserved immediately after selection  
✅ Failed payments recorded in database with user_id  
✅ Re-engagement email sent on Day 2  
✅ Reservation expires after 7 days  
✅ Webhook processing works 99%+ of time  
✅ `/admin/payments` shows all payment attempts  

### Should Have (Post-Launch)
- Retry payment link in emails
- Admin manual activation
- Day 5 urgency email
- Username expiry extension

### Nice to Have (Future)
- SMS notifications for failed payments
- Customizable reservation period per user
- Abandoned cart tracking in analytics
- A/B test email timing

---

## 12. Rollout Plan

### Week 1: Development
- Database migration
- Update signup flow
- Update webhook handler

### Week 2: Email System
- Create email templates
- Implement cron jobs
- Test email delivery

### Week 3: Testing
- Full payment flow testing (**including re-testing `/admin/payments`**)
- Edge case testing
- Load testing

### Week 4: Deployment
- Deploy to staging
- Monitor for 1 week
- Deploy to production

### Week 5+: Monitoring & Optimization
- Track metrics
- Optimize email timing
- A/B test email content

---

## 13. Appendix

### Related Documents
- [Stripe Setup Guide](./STRIPE_SETUP_GUIDE.md)
- [Database Schema](../prisma/schema.prisma)
- [Email Service Config](../lib/email/)

### Technical Debt to Address
- Remove deferred payment processing logic (3 files, ~150 lines)
- Simplify webhook handler (reduce complexity by 40%)
- Remove sessionStorage password workaround

### Future Enhancements
- Multiple membership tiers (Basic, Pro, Enterprise)
- Annual vs. monthly billing options
- Referral program integration
- Stripe Customer Portal for self-service

---

**END OF PRD**

*This document is a living specification and will be updated as requirements evolve.*

