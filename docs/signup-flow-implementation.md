# Sign Up Flow Implementation

## Overview
Complete implementation of the studio profile creation flow after successful membership payment. This allows new users to create their complete studio profile in development mode (bypassing Stripe payments) and then receive email verification.

---

## What's Been Implemented

### 1. **Payment Success Page with Profile Form** (`src/components/auth/MembershipSuccess.tsx`)
A comprehensive profile setup form that collects all required information:

#### Pre-filled & Locked Fields:
- Username
- Display Name  
- Email

#### Required Profile Fields:
- **Studio Information:**
  - Studio Name (max 35 characters)
  - Short About (max 150 characters) 
  - Full About (max 1500 characters)
  - Studio Types (Home, Recording, Podcast) - at least 1 required

- **Location:**
  - Full Address (with Google Places autocomplete)
  - Abbreviated Address (public display)
  - City (auto-populated)
  - Country (required)

- **Contact & Connection:**
  - Website URL (required)
  - Connection Methods (12 options) - at least 1 required:
    - Source Connect
    - Source Connect Now
    - Phone Patch
    - Session Link Pro
    - Zoom or Teams
    - Cleanfeed
    - Riverside
    - Google Hangouts
    - ipDTL
    - SquadCast
    - Zencastr
    - Other (See profile)

- **Images:**
  - 1-5 studio images (minimum 1 required)
  - Upload to Cloudinary
  - Max 5MB per image
  - Formats: PNG, JPG, WEBP

#### Features:
- ✅ Consistent styling with other auth pages (background image, logo, white card)
- ✅ Real-time image upload and preview
- ✅ Form validation with helpful error messages
- ✅ Character counters for text fields
- ✅ Tooltips for studio type descriptions
- ✅ Retrievespassword from sessionStorage (stored during signup)

---

### 2. **Profile Creation API** (`src/app/api/auth/create-studio-profile/route.ts`)

Handles the complete profile creation process:

#### Functionality:
1. **Payment Verification** (bypassed in development)
2. **User Account Creation:**
   - Creates user with credentials
   - Sets role to `STUDIO_OWNER`
   - Uses real password from signup (stored in sessionStorage)

3. **Studio Profile Creation:**
   - Creates record in `studio_profiles` table
   - Stores all studio information
   - Saves connection methods

4. **Related Data Creation:**
   - `studio_studio_types` - Selected studio types
   - `studio_images` - Uploaded images with sort order

5. **Session Cleanup:**
   - Marks Stripe session as used (production only)
   - Stores user_id and studio_id in metadata

#### Development Mode Features:
- ✅ Skips Stripe payment verification for `cs_dev_*` session IDs
- ✅ Console logging for debugging
- ✅ Full functionality without real payments

---

### 3. **Email Verification Page** (`src/app/auth/verify-email/page.tsx`)

Updated verification page with special handling for new profiles:

#### Features:
- **New Profile Mode** (when `?new=true` in URL):
  - Personalised welcome message
  - Congratulations on profile creation
  - Clear next steps (4-step process)
  - Professional, encouraging tone

- **Standard Mode:**
  - Generic email verification message
  - Resend email button
  - Link to sign in

- ✅ Consistent styling with auth flow
- ✅ Helpful tips about checking spam folder
- ✅ Support contact information

---

### 4. **Email Verification Route** (`src/app/api/auth/verify-email/route.ts`)

Basic email verification handler:

#### Development Mode:
- Accepts `?email=user@example.com` parameter
- Directly verifies email in database
- Updates `email_verified` timestamp
- Redirects to signin with success message

#### Production Mode (TODO):
- Token-based verification system needs implementation
- Requires verification_tokens table
- Token expiration checking
- One-time use tokens

---

### 5. **Sign In Page Updates** (`src/components/auth/SigninForm.tsx`)

Enhanced signin form to show verification success:

#### Features:
- ✅ Checks for `?verified=true` query parameter
- ✅ Shows success message: "✓ Email address verified! You can now sign in below."
- ✅ Professional green success banner
- ✅ Maintains existing signin functionality

---

### 6. **Development Mode Bypass** (Existing files updated)

Enhanced dummy Stripe payments:

#### Files Updated:
- `src/app/api/stripe/create-membership-checkout/route.ts`
- `src/app/api/stripe/verify-membership-payment/route.ts`

#### Features:
- ✅ Auto-detects development environment
- ✅ Generates mock session IDs (`cs_dev_*`)
- ✅ Bypasses all Stripe API calls
- ✅ Returns success URLs directly
- ✅ Console logging for debugging
- ✅ Production behavior unchanged

---

## Complete Sign Up Flow

### User Journey:
1. User visits `/register` → redirects to `/auth/signup` (dev only)
2. User fills signup form (display name, email, password)
3. System checks username availability
4. User selects username (if needed) at `/auth/username-selection`
5. System sends **verification email immediately** and user verifies email
6. User proceeds to `/auth/membership` payment page (**email must be verified**)
7. **DEV:** Clicking "Complete Membership Purchase" bypasses Stripe
8. User lands on `/auth/membership/success`
9. Stripe webhook grants membership and sends **Membership Confirmed** email
10. User signs in and completes their studio profile from the dashboard as needed

---

## Database Structure

### Tables Created/Updated:

#### `users`
- Basic account info
- Role set to `STUDIO_OWNER`
- `email_verified` timestamp

#### `studio_profiles`
- Main studio information
- Location data
- Connection methods (connection1-12 as '1' or '0')
- Contact settings

#### `studio_studio_types`
- Links studio to types (HOME, RECORDING, PODCAST)
- One row per selected type

#### `studio_images`
- Studio image URLs
- Alt text
- Sort order (0-4)

---

## Testing the Flow (Development)

### Step-by-Step Test:
```bash
1. Start dev server: npm run dev
2. Visit: http://localhost:3000/register
3. Fill signup form:
   - Display name: "Test Studio"
   - Email: "test@example.com"
   - Password: "Test123456!"
4. Select username (if prompted)
5. Click "Complete Membership Purchase" (no Stripe needed!)
6. Fill profile form (all fields required)
7. Upload at least 1 image
8. Click "Create My Profile!"
9. See email verification page
10. Verify via: http://localhost:3000/api/auth/verify-email?email=test@example.com
11. Sign in with credentials
12. View complete profile!
```

---

## What Still Needs Implementation

### Email System (TODO):
1. **Verification Email Sending:**
   - Set up email service (SendGrid, Resend, etc.)
   - Create email templates
   - Generate verification tokens
   - Store tokens in database

2. **Token System:**
   - Create `verification_tokens` table
   - Generate unique tokens with expiration
   - Validate tokens on verification
   - Delete used/expired tokens

3. **Email Templates:**
   - Welcome email with verification link
   - Professional HTML template
   - Plain text fallback

### Production Checklist:
- [ ] Configure email service
- [ ] Create email templates
- [ ] Implement token generation
- [ ] Add token expiration (24 hours recommended)
- [ ] Create verification_tokens table migration
- [ ] Update verification route to use tokens
- [ ] Add resend email functionality
- [ ] Test full flow in production

---

## Environment Variables

### Required (Production):
```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_MEMBERSHIP_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Auth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_secret

# Database
DATABASE_URL=postgresql://...

# Email (when implemented)
EMAIL_FROM=noreply@voiceoverstudiofinder.com
SENDGRID_API_KEY=... (or other email service)
```

### Development:
```env
NODE_ENV=development
# Stripe keys optional - bypassed in dev mode
```

---

## Security Considerations

### Implemented:
- ✅ Password hashing via `createUser` function
- ✅ Form validation (client & server)
- ✅ File type & size validation for images
- ✅ Environment-based payment bypass
- ✅ Session storage cleanup after profile creation

### Production Requirements:
- [ ] Rate limiting on API endpoints
- [ ] CSRF protection
- [ ] Email verification before allowing signin
- [ ] Proper token expiration handling
- [ ] Secure token storage

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── create-studio-profile/
│   │   │   │   └── route.ts (NEW)
│   │   │   └── verify-email/
│   │   │       └── route.ts (NEW)
│   │   └── stripe/
│   │       ├── create-membership-checkout/route.ts (UPDATED)
│   │       └── verify-membership-payment/route.ts (UPDATED)
│   └── auth/
│       ├── membership/success/page.tsx (UNCHANGED - uses component)
│       ├── signup/page.tsx (UPDATED - styling)
│       └── verify-email/page.tsx (UPDATED - new profile mode)
├── components/
│   └── auth/
│       ├── MembershipSuccess.tsx (COMPLETELY REWRITTEN)
│       └── SigninForm.tsx (UPDATED - success message)
└── docs/
    └── SIGNUP_FLOW_IMPLEMENTATION.md (THIS FILE)
```

---

## Next Steps

1. **Test the complete flow** in your local development environment
2. **Upload test images** to verify Cloudinary integration works
3. **Check database** to confirm all records are created correctly
4. **Implement email sending** when ready for production
5. **Update environment variables** for production deployment
6. **Test production redirects** to ensure `/register` still goes to waitlist

---

## Support

For issues or questions:
- Check console logs (development mode has extensive logging)
- Verify all environment variables are set
- Ensure Cloudinary credentials are configured for image uploads
- Check database connection for profile creation issues

---

**Implementation Date:** December 18, 2025  
**Status:** ✅ Complete (Email sending stubbed for future implementation)  
**Testing Status:** Ready for local development testing






