# User Status & Authentication Flow Analysis

## Date: January 22, 2026
## User: hugh_edwards@offthepage.com (PENDING status)

---

## Executive Summary

**Question:** How can a `PENDING` status user (who hasn't completed payment) sign in and access the profile page?

**Answer:** **This is by design.** The authentication system intentionally allows `PENDING` users to sign in so they can complete their signup process (username selection → payment → profile setup).

---

## User Status Enum

```prisma
enum UserStatus {
  PENDING  // Username reserved, payment incomplete
  ACTIVE   // Payment completed, full access
  EXPIRED  // Reservation expired, account will be deleted
}
```

---

## The Signup Flow (Why PENDING Users Must Sign In)

### Phase 1: Initial Account Creation
**POST /api/auth/register**

```typescript
// User provides: email, password, display_name
// System creates:
const user = {
  status: UserStatus.PENDING,
  reservation_expires_at: new Date() + 7 days,
  username: "temp_xyz123",  // Temporary username
  email_verified: false,
  password: hashedPassword,
}
```

At this point:
- ✅ User account exists in database
- ✅ User has valid credentials (email + password)
- ❌ Username not chosen yet
- ❌ Payment not completed yet
- ❌ Profile not set up yet

### Phase 2: Email Verification
User clicks verification link → email_verified set to `true`

### Phase 3: **Sign In Required** 🔑
**User MUST sign in to continue the signup process:**
1. Sign in with email/password
2. Choose username (username selection page)
3. Complete payment (Stripe checkout)
4. Set up profile (profile page)

**Critical Point:** If PENDING users couldn't sign in, they would be stuck after email verification with no way to complete signup!

---

## Authentication Flow Analysis

### File: `src/lib/auth.ts`

```typescript
async authorize(credentials) {
  const user = await db.users.findUnique({
    where: { email: credentials.email },
  });

  if (!user || !user.password) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(
    credentials.password,
    user.password
  );

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // ⚠️ NO STATUS CHECK HERE
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    // ... other fields
  };
}
```

### What's Checked:
✅ User exists  
✅ Password is valid  

### What's NOT Checked:
❌ user.status === 'ACTIVE'  
❌ user.status !== 'PENDING'  
❌ user.status !== 'EXPIRED'  

### Why This Is Intentional:

The authentication system has **THREE** distinct concerns:

1. **Authentication** - "Who are you?" (Verify identity)
   - Handled by: Email + Password check
   - Status: ✅ Working as intended

2. **Authorization** - "What can you access?" (Verify permissions)
   - Should be handled by: Page-level guards, API middleware
   - Status: ⚠️ **NOT IMPLEMENTED** (potential issue)

3. **User Status** - "What stage of signup are you in?"
   - Should be handled by: UI flow logic, redirects
   - Status: ⚠️ **PARTIALLY IMPLEMENTED**

---

## Case Study: hugh_edwards@offthepage.com

### Account Timeline:
```
Jan 17, 2026 12:09 PM  → Account created (PENDING)
Jan 17, 2026          → Email verified
Jan 17-22, 2026       → User signs in, accesses profile page
Jan 22, 2026 1:18 PM  → Last login (today)
Jan 24, 2026 12:09 PM → Reservation expires (future)
```

### What This User Can Do:
✅ Sign in with email/password  
✅ Access `/dashboard` page  
✅ Access `/dashboard/edit-profile` page  
✅ View their incomplete profile  
✅ Edit profile fields  

### What This User SHOULD Be Restricted From:
❌ Full site visibility (is_profile_visible should be forced to false)  
❌ Featured listing options  
❌ Premium features  
⚠️ May need: Redirect to payment completion flow

---

## Security & UX Implications

### ✅ What Works:
1. **Email verification** - User confirmed their email
2. **Password security** - bcrypt hash, secure storage
3. **Reservation system** - Username held for 7 days
4. **Expiry handling** - Expired reservations are cleaned up

### ⚠️ Potential Issues:

#### Issue 1: Unrestricted Profile Access
**Current State:** PENDING users can access full profile editing functionality

**Implications:**
- They can set up their entire profile without paying
- They can modify visibility settings (though backend should enforce rules)
- They can waste time building a profile they might abandon

**Recommendation:**
```typescript
// Option A: Block profile page entirely for PENDING users
if (session.user.status === 'PENDING') {
  redirect('/complete-signup');
}

// Option B: Show read-only preview with payment prompt
if (session.user.status === 'PENDING') {
  return <CompleteSignupBanner />;
}
```

#### Issue 2: No Centralized Status Guard
**Current State:** Each page must individually check user status

**Recommendation:** Create a reusable middleware/guard
```typescript
// src/middleware.ts (NEW FILE)
export function middleware(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (session?.user.status === 'PENDING') {
    const allowedPaths = [
      '/api/auth',
      '/complete-signup',
      '/auth',
    ];
    
    if (!allowedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
      return NextResponse.redirect(new URL('/complete-signup', request.url));
    }
  }
  
  return NextResponse.next();
}
```

#### Issue 3: Expired User Cleanup
**Current State:** Expired PENDING users can still sign in until they're deleted

**Timeline:**
1. Reservation expires (7 days after signup)
2. Status remains `PENDING` (not auto-updated to `EXPIRED`)
3. User can still sign in (no status check in auth)
4. Cleanup happens on next registration attempt OR via cron job

**Recommendation:** Add status check in auth flow:
```typescript
async authorize(credentials) {
  const user = await db.users.findUnique({
    where: { email: credentials.email },
  });

  // Check if PENDING reservation has expired
  if (user.status === UserStatus.PENDING && 
      user.reservation_expires_at && 
      user.reservation_expires_at < new Date()) {
    throw new Error('Your signup reservation has expired. Please register again.');
  }

  // Continue with password validation...
}
```

---

## Recommended Changes

### Priority 1: High (Security)
1. **Add status check to auth flow** - Reject expired PENDING users
2. **Implement profile visibility enforcement** - Already done in recent changes ✅
3. **Add PENDING user middleware** - Redirect to signup completion flow

### Priority 2: Medium (UX)
1. **Create `/complete-signup` page** - Guide PENDING users through remaining steps
2. **Add status indicators** - Show progress through signup flow
3. **Implement dashboard banner** - Remind PENDING users to complete payment

### Priority 3: Low (Polish)
1. **Add email reminders** - Day 2, Day 5 reminders to complete signup
2. **Add telemetry** - Track signup abandonment rates
3. **Add session warnings** - "Complete signup within X days"

---

## Current Best Practices (Already Implemented) ✅

### Profile Visibility Enforcement
The recent changes (Jan 22, 2026) added proper enforcement:

```typescript
// src/app/api/user/profile/route.ts
const eligibility = await getProfileVisibilityEligibility(userId);

if (!eligibility.allRequiredComplete) {
  // Force visibility OFF
  if (eligibility.currentVisibility) {
    await db.studio_profiles.update({
      data: { is_profile_visible: false }
    });
  }
}
```

This ensures PENDING users (who likely have incomplete profiles) cannot make their profile visible.

---

## Conclusion

**The system is working as designed** - PENDING users can sign in because they NEED to sign in to complete the signup process.

**However**, there are opportunities to improve:
1. Add explicit guards to prevent expired PENDING users from signing in
2. Add middleware to redirect PENDING users to signup completion flow
3. Add UI indicators showing signup progress

**For hugh_edwards@offthepage.com specifically:**
- Account is 5 days old
- Reservation expires in ~2 days (Jan 24, 2026)
- User has verified their email
- User has signed in and accessed the profile page
- **User has NOT completed payment yet**
- User should complete payment or their username "OffThePage" will be released

---

## Files Referenced

- `src/lib/auth.ts` - Authentication configuration (lines 59-92, 164-172)
- `src/app/api/auth/register/route.ts` - User registration flow (lines 166-194)
- `prisma/schema.prisma` - UserStatus enum (lines 744-748)
- `src/app/api/user/profile/route.ts` - Profile visibility enforcement (lines 631-655)
