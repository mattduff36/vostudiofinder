# Future Development & Deferred Items

This document tracks features, enhancements, and improvements that have been identified but deferred for future implementation.

**Last Updated**: January 19, 2025

---

## 📧 Email Notifications & Communications

### Payment & Membership Emails
**Priority**: Low  
**Status**: Deferred  
**Location**: `src/app/api/stripe/webhook/route.ts`

- [ ] **Admin Alert - Verification Bypass** (Line 314)
  - Send alert email to admin when a user pays without email verification
  - Helps monitor potential abuse or workflow issues

- [ ] **User Instruction - Email Verification** (Line 315)
  - Send email to user instructing them to verify email before accessing membership
  - Currently, users can pay without verifying, but can't access membership features

- [ ] **Failed Payment Notification** (Line 734)
  - Send email with retry link when payment fails
  - Marked as "Phase 4" feature
  - Helps users recover from failed payments more easily

### Account Management Emails
**Priority**: Medium  
**Status**: Deferred  
**Location**: `src/app/api/user/close-account/route.ts`

- [ ] **Account Deletion Notification** (Line 92)
  - Send confirmation email when user schedules account deletion
  - Should include deletion date and cancellation instructions

- [ ] **Subscription Cancellation** (Line 93)
  - Automatically cancel any active Stripe subscriptions when account is deleted
  - Currently requires manual intervention

---

## 🔐 Security Enhancements

### Secure Token System for Email Links
**Priority**: Medium  
**Status**: Deferred  
**Location**: `src/app/api/auth/retry-payment/route.ts`

- [ ] **Implement Secure Token System** (Line 81)
  - Replace current email retry link system with secure, time-limited tokens
  - Prevents unauthorized access to retry payment functionality
  - Should expire after X hours and be single-use

**Suggested Implementation**:
- Generate JWT or UUID tokens with expiry
- Store in database with user_id and payment_intent_id
- Validate and consume token on use
- Add cleanup job for expired tokens

---

## ✅ Testing & Verification

### Renewal System Testing
**Priority**: High (Ready for Testing)  
**Status**: Code Complete, Awaiting Verification  
**Reference**: `RENEWAL_SYSTEM_UPDATE.md`

The renewal system code is fully implemented and production-built. Requires real-world testing:

- [ ] **Development Environment Testing**
  - Test early renewal flow (≥180 days remaining)
  - Test standard renewal flow (0-179 days remaining)
  - Test 5-year renewal flow
  - Verify all date calculations are correct

- [ ] **Stripe Integration Testing**
  - Verify Stripe checkout works for 'early' renewal type
  - Verify Stripe checkout works for 'standard' renewal type
  - Verify correct pricing for each renewal type

- [ ] **Webhook Processing**
  - Confirm webhook correctly processes 'early' renewals
  - Confirm webhook correctly processes 'standard' renewals
  - Verify expiry dates are calculated correctly after payment

- [ ] **Email Template Review**
  - Check confirmation emails mention correct renewal type
  - Verify bonus language appears only for early renewals
  - Ensure dates are formatted correctly in emails

---

## 📝 Future Enhancements (Aspirational)

### User Profile & Dashboard
- Profile completion wizard improvements
- Enhanced image gallery manager
- Self-service profile audit tools

### Admin Tools
- Advanced user analytics
- Automated profile quality scoring
- Bulk user management improvements

### Mobile Experience
- Mobile-specific code-splitting
- Progressive Web App (PWA) features
- Improved offline functionality

### Adaptive Glass Navigation - Per-Button Background Detection
**Priority**: Low  
**Status**: Partially Implemented, Deferred  
**Location**: `src/components/navigation/AdaptiveGlassBubblesNav.tsx`

**Current Status**:
- Two-phase rendering system implemented (position at 150ms, show at 500ms)
- Per-button background detection logic in place
- System detects largest image at sensor location
- Ignores navigation bar elements for accurate detection

**Remaining Work**:
- [ ] Investigate why detection picks up studio card thumbnails instead of larger background images on `/studios` page
- [ ] Clarify where user's test images should appear in studio listings vs profile pages
- [ ] Consider if CSS `background-image` detection is needed (currently only detects `<img>` elements and `backgroundColor`)
- [ ] Optimize detection performance if multiple images exist at same location
- [ ] Add fallback for CORS-blocked images

**Technical Notes**:
- JavaScript cannot directly read screen pixels for security reasons
- Current approach uses `document.elementsFromPoint(x, y)` to find elements
- Images are sampled via canvas pixel sampling
- Background colors are read from computed styles
- System successfully "looks through" fixed navigation bar to content below

---

## 📋 How to Use This Document

### Adding New Items
When deferring work, add it to the appropriate section with:
- Clear description
- Priority level (Low/Medium/High)
- File location and line number (if applicable)
- Any relevant context or dependencies

### Prioritization Guidelines
- **High**: Should be completed in next sprint/release
- **Medium**: Important but not urgent, schedule within 1-3 months
- **Low**: Nice-to-have, schedule when time permits

### Completion Process
When implementing items from this list:
1. Move item to a dedicated implementation plan/ticket
2. Mark as "In Progress" here
3. When complete, remove from this document and note in commit message

---

## 🗂️ Archive

Items that have been completed will be noted here with completion date:

*No items archived yet*
