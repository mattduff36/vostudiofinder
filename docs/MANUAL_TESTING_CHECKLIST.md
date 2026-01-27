# Manual Testing Checklist - Featured Studios & Verified Badge

## ✅ Migrations Completed
- ✅ Production database migration applied successfully
- ✅ Waitlist table now has `type` column with `GENERAL`/`FEATURED` enum
- ✅ Composite unique constraint on `(email, type)` added
- ✅ Database check constraint: featured studios MUST have expiry date
- ✅ Prisma client generated
- ✅ Production build completed successfully

## ✅ Automated Tests Created
- `tests/featured-and-verified-badge.test.ts` - API integration tests
- `tests/featured-verified-e2e.spec.ts` - Playwright E2E tests

---

## 📋 Manual Testing Checklist

### 1. Featured Studio Availability API
**Test the availability endpoint directly**

- [ ] Navigate to `/api/featured/availability` in browser
- [ ] Verify response includes: `maxFeatured: 6`, `featuredCount`, `remaining`
- [ ] If `remaining === 0`, verify `nextAvailableAt` is present and is a valid ISO date
- [ ] Confirm `remaining` = `maxFeatured` - `featuredCount`

**Expected Result**: Clean JSON response with all required fields

---

### 2. Featured Studio Upgrade Card (User Dashboard)

#### Test Case 2.1: When Slots Available
**Setup**: Log in as regular studio user (not admin)

- [ ] Navigate to `/dashboard/settings`
- [ ] Click on "Membership" section (or expand on mobile)
- [ ] Locate "Featured Studio Upgrade" card
- [ ] **Verify messaging**: Should say "Only X out of 6 Featured slots available — secure yours before they're gone!"
- [ ] Verify the badge shows "X OF 6 LEFT" in amber/yellow
- [ ] Card should be enabled (not grayed out) if profile is 100% complete and membership active
- [ ] Try clicking the card to open the featured upgrade modal

**Expected Result**: Urgency messaging with available slot count, card is clickable when eligible

#### Test Case 2.2: When All Slots Taken
**Setup**: Ensure 6 studios are featured (use admin panel if needed)

- [ ] Navigate to `/dashboard/settings`
- [ ] Find "Featured Studio Upgrade" card
- [ ] **Verify messaging**: Should say "All Featured slots are taken. Next slot available on [date]."
- [ ] Verify the date shown matches the earliest `featured_until` date from database
- [ ] **Find waitlist checkbox**: "Want to join the Featured Studios waitlist?"
- [ ] Check the waitlist checkbox
- [ ] **Verify toast notification**: "Added to Featured Studios waitlist! We'll notify you..."
- [ ] Try checking the checkbox again
- [ ] **Verify**: Should show success message or "already on waitlist" message
- [ ] Card should be disabled (grayed out)

**Expected Result**: Sold-out messaging, next available date, working waitlist checkbox

#### Test Case 2.3: Studio Already Featured
**Setup**: Feature your test studio via admin panel

- [ ] Navigate to `/dashboard/settings`
- [ ] Find "Featured Studio Upgrade" card
- [ ] **Verify messaging**: Should indicate studio is currently featured
- [ ] Should show expiry date
- [ ] Card should be disabled (grayed out)

**Expected Result**: Shows "currently featured until [date]" messaging

---

### 3. Verified Badge Request Card

#### Test Case 3.1: Profile < 85% Complete
**Setup**: Log in with studio that has < 85% profile completion

- [ ] Navigate to `/dashboard/settings` → Membership section
- [ ] Locate "Request Verified Badge" card
- [ ] **Verify messaging**: "Complete your profile to at least **85%** to request verification. You're currently at **X%**."
- [ ] If membership is also inactive, should mention that too
- [ ] Card should be **disabled** (grayed out, not clickable)
- [ ] Try clicking - nothing should happen

**Expected Result**: Disabled card with clear completion requirement message

#### Test Case 3.2: Profile ≥ 85% Complete (Eligible)
**Setup**: Log in with studio that has:
- Profile completion ≥ 85%
- Active membership
- NOT already verified

- [ ] Navigate to `/dashboard/settings` → Membership section
- [ ] Locate "Request Verified Badge" card
- [ ] **Verify messaging**: "Apply for a verified badge to stand out and build trust. Our team will review..."
- [ ] Card should be **enabled** (green gradient, clickable)
- [ ] Badge should show "✓ Ready to apply"
- [ ] **Click the card**
- [ ] **Verify loading state**: Brief spinner/loading indicator
- [ ] **Verify success toast**: "Verification request submitted! Our team will review..."
- [ ] Wait a few seconds for card to update

**Expected Result**: Clickable card, successful submission, success toast

#### Test Case 3.3: Verify Verification Emails Sent
**After Test Case 3.2**

- [ ] Check **all admin user** email inboxes (users with `role='ADMIN'`)
- [ ] Check `support@voiceoverstudiofinder.com` inbox
- [ ] **Verify email received** with subject: "Verification Request - [Studio Name] (@username)"
- [ ] Open email and verify contents:
  - [ ] Studio owner name correct
  - [ ] Studio name correct
  - [ ] Profile completion percentage shown
  - [ ] "View studio profile" button works
  - [ ] "Review in admin" button works
  - [ ] Reply-To is set to studio owner's email
- [ ] **Verify NO email** sent to `admin@mpdee.co.uk` (only via preview button)

**Expected Result**: All admins + support receive properly formatted email

#### Test Case 3.4: Already Verified Studio
**Setup**: Manually set `is_verified = true` for a studio in database OR use admin panel

- [ ] Log in with the verified studio
- [ ] Navigate to `/dashboard/settings` → Membership section
- [ ] Find "Request Verified Badge" card
- [ ] **Verify messaging**: "Your studio is verified! The verified badge is now visible..."
- [ ] Badge should show "✓ Verified"
- [ ] Card should be **disabled** (not clickable)
- [ ] Try clicking - nothing should happen

**Expected Result**: Shows verified status, card is not clickable

---

### 4. Admin Test Sandbox (Admin Only)

#### Test Case 4.1: Visibility Check
**Test A - Non-Admin User**:
- [ ] Log in as **regular studio user** (NOT admin)
- [ ] Navigate to `/dashboard/settings`
- [ ] **Verify**: "ADMIN TEST" tab/section is **NOT visible**

**Test B - Admin User**:
- [ ] Log in as **admin user**
- [ ] Navigate to `/dashboard/settings`
- [ ] **Verify**: "ADMIN TEST" tab is **visible** (next to Support)
- [ ] On desktop: Tab appears in horizontal navigation
- [ ] On mobile: Accordion section appears in list

**Expected Result**: Only admins see ADMIN TEST tab

#### Test Case 4.2: Sandbox Toggle
**Setup**: Log in as admin, go to ADMIN TEST tab

- [ ] Find "Enable sandbox overrides" toggle
- [ ] Toggle **ON**
- [ ] **Verify**: All sandbox controls become enabled (not dimmed)
- [ ] Toggle **OFF**
- [ ] **Verify**: All sandbox controls become dimmed/disabled

**Expected Result**: Toggle controls the enabled state of sandbox inputs

#### Test Case 4.3: Profile Completion Simulation
**Setup**: Enable sandbox

- [ ] Set "Profile completion %" to `70`
- [ ] Navigate to "Membership" section
- [ ] Find "Request Verified Badge" card
- [ ] **Verify**: Card is disabled, shows "Complete your profile to at least **85%**... You're currently at **70%**"
- [ ] Return to ADMIN TEST, set completion to `90`
- [ ] Return to Membership section
- [ ] **Verify**: Card is now enabled (if membership is active), shows "Ready to apply" messaging

**Expected Result**: Completion percentage override affects card state

#### Test Case 4.4: Verified Status Simulation
**Setup**: Enable sandbox, set completion to 90%

- [ ] Toggle "Already verified" to **ON**
- [ ] Navigate to Membership section
- [ ] **Verify**: "Request Verified Badge" card shows "Your studio is verified!" message
- [ ] Toggle "Already verified" to **OFF**
- [ ] **Verify**: Card returns to "Ready to apply" state (if completion ≥ 85%)

**Expected Result**: Verified toggle changes card messaging

#### Test Case 4.5: Membership Active Simulation
**Setup**: Enable sandbox

- [ ] Toggle "Membership active" to **OFF**
- [ ] Navigate to Membership section
- [ ] **Verify**: Cards that require active membership show appropriate disabled state
- [ ] Toggle back **ON**
- [ ] **Verify**: Cards become enabled (if other requirements met)

**Expected Result**: Membership toggle affects eligibility

#### Test Case 4.6: Featured Slots Simulation
**Setup**: Enable sandbox

- [ ] Set "Featured slots remaining" to `3`
- [ ] Navigate to Membership section
- [ ] Find "Featured Studio Upgrade" card
- [ ] **Verify**: Badge shows "3 OF 6 LEFT", messaging shows urgency
- [ ] Return to ADMIN TEST, set to `0`
- [ ] Set "Next available date" to future date (e.g., 2026-03-01)
- [ ] Return to Membership
- [ ] **Verify**: Card shows "All slots taken. Next slot available on [date]"
- [ ] **Verify**: Waitlist checkbox appears

**Expected Result**: Slot count and next available date override work correctly

#### Test Case 4.7: Studio Already Featured Simulation
**Setup**: Enable sandbox

- [ ] Toggle "Studio is currently featured" to **ON**
- [ ] Navigate to Membership section
- [ ] **Verify**: "Featured Studio Upgrade" card shows "currently featured" messaging
- [ ] Card should be disabled

**Expected Result**: Featured status override works

#### Test Case 4.8: Reset Sandbox
**Setup**: Change multiple sandbox values

- [ ] Click **"Reset sandbox"** button
- [ ] **Verify all values reset** to defaults:
  - Sandbox disabled
  - Profile completion: 100%
  - Already verified: OFF
  - Membership active: ON
  - Studio is featured: OFF
  - Featured slots remaining: 6
  - Next available date: (empty)
- [ ] Navigate to Membership section
- [ ] **Verify**: All cards show real (non-sandbox) values again

**Expected Result**: Reset button restores all defaults

#### Test Case 4.9: Email Preview Button
**Setup**: Log in as admin, ADMIN TEST tab

- [ ] Find "Email Preview (Admin Only)" section
- [ ] Click **"Send Verification Email Preview"** button
- [ ] **Verify**: Button shows loading state
- [ ] **Verify**: Success toast appears: "Preview email sent to admin@mpdee.co.uk!"
- [ ] Check `admin@mpdee.co.uk` inbox
- [ ] **Verify email received** with:
  - Subject: "[TEST PREVIEW] Verification Request - Premium Voice Studio (@johnsmith)"
  - Sample data (John Smith, Premium Voice Studio, etc.)
  - Properly formatted HTML email
  - All buttons and links work

**Expected Result**: Preview email sent to admin@mpdee.co.uk with test data

---

### 5. Waitlist Type Support

#### Test Case 5.1: General Waitlist (Public Page)
- [ ] Navigate to `/join-waitlist` (logged out)
- [ ] Fill in name and email
- [ ] Submit form
- [ ] **Verify**: Success message appears
- [ ] Go to admin panel → `/admin/waitlist`
- [ ] Find the entry you just created
- [ ] **Verify**: Type shows as "General" (or check database `type='GENERAL'`)

**Expected Result**: Public waitlist creates GENERAL type entries

#### Test Case 5.2: Featured Waitlist (Dashboard)
**Already tested in Test Case 2.2 above**

#### Test Case 5.3: Duplicate Prevention
- [ ] Join featured waitlist via dashboard (Test Case 2.2)
- [ ] Note success message
- [ ] Try joining again with same email
- [ ] **Verify**: Should show friendly "already on waitlist" message (not an error)
- [ ] Try joining GENERAL waitlist with same email at `/join-waitlist`
- [ ] **Verify**: Should succeed (different type, so allowed)

**Expected Result**: Can't duplicate within same type, can join both types

---

### 6. Admin Studio Management

#### Test Case 6.1: Featuring a Studio (Expiry Required)
**Setup**: Log in as admin

- [ ] Navigate to `/admin/studios`
- [ ] Find a studio that is NOT featured
- [ ] Click to toggle featured status to **ON**
- [ ] **Verify**: Modal appears asking for expiry date
- [ ] **Try clicking outside modal** or hitting ESC - should stay open
- [ ] Leave date empty and try to confirm
- [ ] **Verify**: Error message or validation prevents submission
- [ ] **Set a past date** (e.g., yesterday)
- [ ] **Verify**: Should reject with "must be future date" error
- [ ] **Set a valid future date** (e.g., 6 months from now)
- [ ] Click confirm
- [ ] **Verify**: Studio becomes featured
- [ ] Check database: `is_featured = true` AND `featured_until` is set to your date

**Expected Result**: Cannot feature without valid future expiry date

#### Test Case 6.2: Six-Slot Limit Enforcement
**Setup**: Feature 6 studios via admin panel (with expiry dates)

- [ ] Try to feature a 7th studio
- [ ] **Verify**: Should show error: "Maximum of 6 featured studios reached"
- [ ] Cannot feature the 7th studio
- [ ] **Unfeature one** of the 6 studios
- [ ] Try again to feature a different studio
- [ ] **Verify**: Should now succeed (slot available)

**Expected Result**: Hard limit of 6 featured studios enforced

#### Test Case 6.3: Unfeaturing Clears Expiry
- [ ] Feature a studio with expiry date
- [ ] Verify it's featured
- [ ] **Unfeature** the studio (toggle OFF)
- [ ] Check database for that studio
- [ ] **Verify**: `is_featured = false` AND `featured_until = null`

**Expected Result**: Expiry is cleared when unfeaturing

---

### 7. Admin Waitlist Page

#### Test Case 7.1: Stats Cards
- [ ] Navigate to `/admin/waitlist`
- [ ] **Verify three stats cards** are displayed:
  - Total Entries
  - Featured Waitlist count
  - General Waitlist count
- [ ] Verify counts match actual data (check database if needed)

**Expected Result**: Three separate stats cards with correct counts

#### Test Case 7.2: Type Filter
- [ ] Find the waitlist table
- [ ] Look for type filter dropdown (if implemented)
- [ ] Filter by "FEATURED"
- [ ] **Verify**: Only featured waitlist entries shown
- [ ] Filter by "GENERAL"
- [ ] **Verify**: Only general waitlist entries shown
- [ ] Filter by "ALL"
- [ ] **Verify**: All entries shown

**Expected Result**: Filter allows viewing by waitlist type

#### Test Case 7.3: Type Badge in Table
- [ ] View the waitlist table
- [ ] **Verify**: Each entry shows a type badge or indicator
  - "⭐ Featured" or similar for featured entries
  - "General" or similar for general entries
- [ ] Badge styling should be distinct (colors, icons, etc.)

**Expected Result**: Type is visible for each entry

---

### 8. Homepage Featured Studios

#### Test Case 8.1: Expired Featured Studios Don't Show
**Setup**: Set one featured studio's `featured_until` to yesterday in database

- [ ] Navigate to homepage `/`
- [ ] **Verify**: The expired studio does NOT appear in featured section
- [ ] **Verify**: Only non-expired featured studios (or null expiry) are shown
- [ ] Check that featured section shows ≤ 6 studios

**Expected Result**: Expired featured studios are automatically filtered out

---

### 9. Desktop & Mobile Responsiveness

#### Test Case 9.1: Desktop Layout
- [ ] View `/dashboard/settings` on desktop (≥768px width)
- [ ] **Verify**: Horizontal tab navigation at top
- [ ] **Verify**: ADMIN TEST tab visible (if admin)
- [ ] **Verify**: Membership cards display in grid layout (2 columns)
- [ ] **Verify**: Sandbox controls in ADMIN TEST display in 2-column grid
- [ ] Test clicking between tabs - content updates correctly

**Expected Result**: Clean desktop layout with tabs

#### Test Case 9.2: Mobile Layout
- [ ] View `/dashboard/settings` on mobile (< 768px width)
- [ ] **Verify**: Accordion-style sections instead of tabs
- [ ] **Verify**: Each section expands/collapses individually
- [ ] **Verify**: Membership cards stack vertically
- [ ] **Verify**: ADMIN TEST section (if admin) works like other sections
- [ ] **Verify**: Sandbox controls stack vertically
- [ ] All text is readable, buttons are tappable

**Expected Result**: Mobile-friendly accordion layout

---

### 10. Database Constraints Validation

#### Test Case 10.1: Featured Requires Expiry Constraint
**This tests the database-level constraint**

- [ ] Open a database client or use Prisma Studio
- [ ] Try to manually set a studio's `is_featured = true` WITHOUT setting `featured_until`
- [ ] **Verify**: Database should reject with constraint violation error
- [ ] **Error should mention**: "featured_requires_expiry" constraint

**Expected Result**: Database prevents featured without expiry at the data layer

#### Test Case 10.2: Waitlist Unique Constraint
- [ ] Try to insert duplicate waitlist entry (same email + type) directly in database
- [ ] **Verify**: Database rejects with unique constraint violation
- [ ] **Error should mention**: `waitlist_email_type_key` constraint

**Expected Result**: Database prevents duplicate email within same waitlist type

---

### 11. Edge Cases & Error Handling

#### Test Case 11.1: Sandbox Doesn't Affect Production API
- [ ] Enable sandbox as admin
- [ ] Set profile completion to 50%
- [ ] Try to call `/api/membership/request-verification` directly (e.g., via Postman, curl, or browser console)
- [ ] **Verify**: API uses REAL data, not sandbox values
- [ ] API should reject if real completion < 85%

**Expected Result**: Sandbox is UI-only, doesn't affect backend

#### Test Case 11.2: Multiple Admin Email Recipients
**Setup**: Ensure database has multiple users with `role='ADMIN'`

- [ ] Submit a verification request (Test Case 3.2)
- [ ] **Verify ALL admin users** receive the email
- [ ] **Verify** `support@voiceoverstudiofinder.com` also receives email
- [ ] Count emails sent in logs

**Expected Result**: All admins + support receive notification

#### Test Case 11.3: Network Error Handling
- [ ] Disconnect internet or block API calls
- [ ] Try clicking "Request Verified Badge" card
- [ ] **Verify**: Error toast appears with appropriate message
- [ ] Try joining waitlist
- [ ] **Verify**: Error toast appears
- [ ] Reconnect internet
- [ ] Try again - should work

**Expected Result**: Graceful error messages for network failures

---

## 🎯 Critical Path Summary (Must Test)

### Priority 1 (Must Pass Before Deploy)
- [ ] Featured availability API returns correct data
- [ ] Featured card shows availability count when slots open
- [ ] Featured card shows waitlist when slots full
- [ ] Waitlist checkbox adds to FEATURED waitlist
- [ ] Verified badge card states (< 85%, ≥ 85%, verified)
- [ ] Verification email sends to all admins + support
- [ ] Admin can only feature studios with expiry date
- [ ] Maximum 6 featured studios enforced
- [ ] ADMIN TEST only visible to admins
- [ ] Sandbox overrides work for all card states
- [ ] Email preview button sends to admin@mpdee.co.uk

### Priority 2 (Important But Not Blocking)
- [ ] Homepage filters out expired featured studios
- [ ] Admin waitlist page shows type breakdown
- [ ] Waitlist table shows type badges
- [ ] Reset sandbox button works
- [ ] Mobile responsive layout works
- [ ] Database constraints prevent invalid data

### Priority 3 (Nice to Have)
- [ ] All toast notifications are well-worded
- [ ] All animations are smooth
- [ ] Error messages are user-friendly
- [ ] Edge cases handled gracefully

---

## 📊 Test Results Summary

**Date**: _________________  
**Tester**: _________________  
**Environment**: ☐ Local  ☐ Staging  ☐ Production

**Overall Status**: ☐ Pass  ☐ Fail  ☐ Needs Review

**Critical Issues Found**: __________

**Notes**:
_________________________________
_________________________________
_________________________________

---

## 🔧 Testing Tools & Access

### Required Access
- [ ] Admin account credentials
- [ ] Regular studio account (< 85% complete)
- [ ] Regular studio account (≥ 85% complete)
- [ ] Database access (for constraint testing)
- [ ] Email inbox access for:
  - Admin accounts
  - support@voiceoverstudiofinder.com
  - admin@mpdee.co.uk

### Testing URLs
- Local: `http://localhost:3000`
- Staging: `[your staging URL]`
- Production: `https://voiceoverstudiofinder.com`

### Useful Database Queries
```sql
-- Check featured studios count
SELECT COUNT(*) FROM studio_profiles 
WHERE is_featured = true 
AND (featured_until IS NULL OR featured_until >= NOW());

-- Check waitlist by type
SELECT type, COUNT(*) FROM waitlist GROUP BY type;

-- View featured studios with expiry
SELECT name, is_featured, featured_until 
FROM studio_profiles 
WHERE is_featured = true;
```

---

## ✅ Sign-off

**Developer**: Implementation complete, all automated tests pass, build successful  
**QA Tester**: Manual testing complete, all critical tests pass  
**Product Owner**: Feature approved for deployment  

**Ready for Production**: ☐ Yes  ☐ No  

**Deployment Date**: _________________
