# Verified Badge Request + Admin Test Sandbox - Testing Guide

## Overview
This guide provides step-by-step testing instructions for the "Request Verified Badge" feature and the "ADMIN TEST" sandbox functionality.

## Prerequisites
- A test studio account (non-admin)
- An admin account
- Access to the dashboard settings page

---

## Part 1: Admin Test Sandbox (Admin Only)

### Test 1.1: Access ADMIN TEST Tab
**Expected Result**: Only admin users can see and access the ADMIN TEST tab.

**Steps**:
1. Log in with an **admin** account
2. Navigate to `/dashboard/settings`
3. On **desktop**: Click the "ADMIN TEST" tab in the section navigation
4. On **mobile**: Expand the "ADMIN TEST" accordion section
5. ✅ Verify the sandbox controls are visible

**Non-Admin Test**:
1. Log in with a **non-admin** account
2. Navigate to `/dashboard/settings`
3. ✅ Verify the "ADMIN TEST" tab/section is **NOT visible**

### Test 1.2: Sandbox Toggle
**Steps**:
1. In ADMIN TEST tab, toggle "Enable sandbox overrides" **ON**
2. ✅ Verify the sandbox control inputs become enabled (no longer dimmed)
3. Toggle "Enable sandbox overrides" **OFF**
4. ✅ Verify the sandbox controls become disabled/dimmed

### Test 1.3: Verified Badge Card Simulation
**Steps** (with sandbox enabled):
1. Set **Profile completion** to `70%`
2. Navigate to the **Membership** section
3. ✅ Verify "Request Verified Badge" card shows:
   - Disabled state (grayed out)
   - Message: "Complete your profile to at least **85%**... You're currently at **70%**"

4. Set **Profile completion** to `90%`
5. Toggle **Membership active** to **ON**
6. ✅ Verify card shows:
   - Enabled state (green gradient)
   - Message: "Apply for a verified badge to stand out..."
   - Badge: "✓ Ready to apply"

7. Toggle **Already verified** to **ON**
8. ✅ Verify card shows:
   - Verified state
   - Message: "Your studio is verified!..."
   - Badge: "✓ Verified"

9. Toggle **Membership active** to **OFF**
10. Toggle **Already verified** to **OFF**
11. ✅ Verify card shows disabled state with membership requirement message

### Test 1.4: Featured Studio Card Simulation
**Steps** (with sandbox enabled):
1. Toggle **Studio is currently featured** to **ON**
2. Navigate to the **Membership** section
3. ✅ Verify "Featured Studio Upgrade" card shows:
   - Disabled state
   - Message showing current featured status and expiry date

4. Toggle **Studio is currently featured** to **OFF**
5. Set **Featured slots remaining** to `3`
6. ✅ Verify card shows:
   - Enabled state
   - Badge: "3 OF 6 LEFT"
   - Message: "Only 3 out of 6 Featured slots available..."

7. Set **Featured slots remaining** to `0`
8. Set **Next available date** to a future date (e.g., 2026-03-01)
9. ✅ Verify card shows:
   - Disabled state
   - Message: "All Featured slots are taken. Next slot available on [date]"
   - Waitlist checkbox appears

### Test 1.5: Reset Sandbox
**Steps**:
1. Change multiple sandbox values
2. Click **"Reset sandbox"** button
3. ✅ Verify all sandbox values reset to defaults:
   - Sandbox disabled
   - Profile completion: 100%
   - Already verified: OFF
   - Membership active: ON
   - Studio is featured: OFF
   - Featured slots remaining: 6
   - Next available date: (empty)

### Test 1.6: Email Preview (Admin Only)
**Steps**:
1. In ADMIN TEST tab, scroll to "Email Preview (Admin Only)" section
2. Click **"Send Verification Email Preview"** button
3. ✅ Verify success toast appears
4. Check **admin@mpdee.co.uk** inbox
5. ✅ Verify email received with:
   - Subject: "[TEST PREVIEW] Verification Request - Premium Voice Studio (@johnsmith)"
   - Sample studio data (John Smith, Premium Voice Studio, etc.)
   - Proper formatting and links

---

## Part 2: Verified Badge Request (Non-Admin)

### Test 2.1: Ineligible - Profile Incomplete (<85%)
**Setup**: Create a test studio with profile completion < 85%

**Steps**:
1. Log in with test studio account
2. Navigate to `/dashboard/settings` → Membership section
3. ✅ Verify "Request Verified Badge" card shows:
   - Disabled state (grayed out)
   - Message: "Complete your profile to at least **85%**... You're currently at **[X]%**"

### Test 2.2: Ineligible - No Active Membership
**Setup**: Create a test studio with:
- Profile completion >= 85%
- **No active membership** or expired membership

**Steps**:
1. Log in with test studio account
2. Navigate to `/dashboard/settings` → Membership section
3. ✅ Verify "Request Verified Badge" card shows:
   - Disabled state
   - Message mentioning active membership requirement

### Test 2.3: Eligible - Can Request Verification
**Setup**: Create a test studio with:
- Profile completion >= 85%
- Active membership (current_period_end > now)
- NOT already verified

**Steps**:
1. Log in with test studio account
2. Navigate to `/dashboard/settings` → Membership section
3. ✅ Verify "Request Verified Badge" card shows:
   - Enabled state (green gradient)
   - Message: "Apply for a verified badge to stand out..."
   - Badge: "✓ Ready to apply"
4. Click the card
5. ✅ Verify:
   - Loading spinner appears briefly
   - Success toast: "Verification request submitted! Our team will review..."

### Test 2.4: Verification Email Sent
**Continuation of Test 2.3**:

**Steps**:
1. After clicking "Request Verified Badge"
2. Check the following inboxes:
   - All admin user emails (from `users` table where `role='ADMIN'`)
   - `support@voiceoverstudiofinder.com`
3. ✅ Verify each recipient receives an email with:
   - Subject: "Verification Request - [Studio Name] (@[username])"
   - Studio owner name and studio name
   - Username and email
   - Profile completion percentage
   - Links to:
     - View studio profile (public)
     - Review in admin dashboard
   - Reply-To set to studio owner's email

4. ✅ Verify **NO email** sent to `admin@mpdee.co.uk` (this is only via manual preview)

### Test 2.5: Already Verified
**Setup**: Manually set `is_verified = true` in the database for the test studio

**Steps**:
1. Log in with the verified studio account
2. Navigate to `/dashboard/settings` → Membership section
3. ✅ Verify "Request Verified Badge" card shows:
   - Verified state (green gradient, but not clickable)
   - Message: "Your studio is verified!..."
   - Badge: "✓ Verified"
4. Try clicking the card
5. ✅ Verify nothing happens (card is not clickable)

### Test 2.6: API Validation - Duplicate Request
**Steps**:
1. Complete Test 2.3 (submit verification request)
2. Immediately submit another verification request (click card again)
3. ✅ Verify second request succeeds (API should allow multiple requests)

### Test 2.7: API Validation - Completion Check
**Steps**:
1. Use a studio with 84% completion
2. Manually call API: `POST /api/membership/request-verification`
3. ✅ Verify API returns:
   - Status: 403
   - Error: "Profile must be at least 85% complete..."
   - `currentCompletion: 84` in response

### Test 2.8: API Validation - Membership Check
**Steps**:
1. Use a studio with no active membership
2. Manually call API: `POST /api/membership/request-verification`
3. ✅ Verify API returns:
   - Status: 403
   - Error: "Active membership required to request verification"

### Test 2.9: API Validation - Already Verified
**Steps**:
1. Use a studio that is already verified
2. Manually call API: `POST /api/membership/request-verification`
3. ✅ Verify API returns:
   - Status: 400
   - Error: "Studio is already verified"

---

## Part 3: Desktop & Mobile Responsiveness

### Test 3.1: Desktop Layout
**Steps**:
1. View `/dashboard/settings` on desktop (>= 768px width)
2. ✅ Verify:
   - Horizontal tab navigation shows all sections including "ADMIN TEST" (if admin)
   - Content renders correctly below tabs
   - Membership cards display in 2-column grid
   - ADMIN TEST sandbox controls display in 2-column grid

### Test 3.2: Mobile Layout
**Steps**:
1. View `/dashboard/settings` on mobile (< 768px width)
2. ✅ Verify:
   - Accordion-style sections
   - Each section expands/collapses individually
   - Membership cards stack vertically
   - ADMIN TEST sandbox controls stack vertically
   - All buttons and text are readable

---

## Part 4: Edge Cases

### Test 4.1: Sandbox Doesn't Affect Production API
**Steps**:
1. Enable sandbox and set profile completion to 50%
2. Click "Request Verified Badge" (card should be disabled by UI)
3. ✅ Verify card is not clickable
4. Manually call API: `POST /api/membership/request-verification`
5. ✅ Verify API uses **real data**, not sandbox values

### Test 4.2: Sandbox Persists During Session
**Steps**:
1. Enable sandbox and configure settings
2. Navigate to a different section (e.g., Support)
3. Return to Membership section
4. ✅ Verify sandbox values persist

### Test 4.3: Multiple Email Recipients
**Setup**: Ensure database has multiple ADMIN users

**Steps**:
1. Submit a verification request
2. ✅ Verify **all** admin users receive the email
3. ✅ Verify `support@voiceoverstudiofinder.com` also receives the email

---

## Checklist Summary

### Admin Test Sandbox
- [ ] ADMIN TEST tab visible only to admins
- [ ] Sandbox toggle enables/disables controls
- [ ] Profile completion simulation works
- [ ] Verified status simulation works
- [ ] Membership active simulation works
- [ ] Featured studio simulation works
- [ ] Featured slots simulation works
- [ ] Next available date simulation works
- [ ] Reset sandbox works
- [ ] Email preview button sends to admin@mpdee.co.uk
- [ ] Desktop rendering works
- [ ] Mobile rendering works

### Verified Badge Request
- [ ] Card disabled when profile < 85%
- [ ] Card disabled when no active membership
- [ ] Card enabled when eligible (≥85%, active membership, not verified)
- [ ] Card shows verified state when already verified
- [ ] Clicking card submits request
- [ ] Success toast appears
- [ ] Email sent to all admins
- [ ] Email sent to support@voiceoverstudiofinder.com
- [ ] Email NOT sent to admin@mpdee.co.uk (unless via preview)
- [ ] Email contains correct studio info
- [ ] Reply-To set to studio owner email
- [ ] API validates profile completion (≥85%)
- [ ] API validates active membership
- [ ] API validates not already verified
- [ ] Proper error messages returned

### General
- [ ] Desktop layout works correctly
- [ ] Mobile layout works correctly
- [ ] Sandbox values don't affect production API
- [ ] All buttons and links work
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No lint errors

---

## Quick Test Commands

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Test email preview (requires Resend API key)
npx tsx scripts/test-verification-email.ts
```

---

## Notes
- The sandbox is **client-side only** and does not mutate any database records
- The API always uses real data from the database, regardless of sandbox state
- Email preview is admin-only and sends a sample email to admin@mpdee.co.uk for review
- Production verification requests are sent to admins + support, NOT to admin@mpdee.co.uk
