# Current Signup Flow Verification

**Date**: January 11, 2026  
**Status**: ✅ Verified

---

## Current Signup Flow (Verified → Pay)

### User journey
1. **Signup** (`/auth/signup`)
   - Creates a **PENDING** user and sends a **verification email** immediately.
2. **Email verification**
   - User clicks the verification link.
   - Backend sets `email_verified = true`.
3. **Membership payment** (`/auth/membership`)
   - Payment checkout is only allowed if the user is email-verified (enforced server-side).
4. **Payment success** (`/auth/membership/success`)
   - Webhook processes `checkout.session.completed` and grants membership.
   - **Membership confirmation email** (“Membership Confirmed”) is sent from the Stripe webhook handler.

---

## Notes / cleanup

- This repo previously contained a UI component that presented multiple post-payment “options” (`src/components/auth/MembershipSuccess.tsx`) and corresponding API routes. Those were identified as obsolete (not referenced) and removed.
