# Verification Email Preview & Testing

## Quick Preview

A preview of the verification request email has been generated at:
```
verification-email-preview.html
```

**To view:** Simply open this file in your web browser to see exactly how the email will look when sent to admins.

## Email Details

**Subject:** Verification Request - {Studio Name} (@{username})

**Recipients:**
- All users with `role='ADMIN'` in the database
- support@voiceoverstudiofinder.com
- admin@mpdee.co.uk (copy for your review, as requested)

**Reply-To:** Set to the studio owner's email for easy direct communication

## Email Template Features

✅ Responsive HTML design matching site branding  
✅ Plain text version for better deliverability  
✅ Studio information (name, owner, username, email)  
✅ Profile completion percentage with color indicator  
✅ Direct action buttons:
- "View studio profile" - Opens public profile
- "Review in admin" - Opens admin dashboard  

✅ Review checklist for admins:
- Profile is at least 85% complete
- Studio information is accurate and professional
- Contact details are valid
- Images meet quality standards
- No policy violations

## Testing in Production

### Option 1: Via Web Interface (Recommended)
1. Deploy the changes to production
2. Log in with a studio account that:
   - Has an active membership
   - Has profile completion ≥ 85%
   - Is not already verified
3. Go to Settings > Membership tab
4. Click "Request Verified Badge" button
5. Check admin@mpdee.co.uk inbox for the email

### Option 2: Via Test Script
```bash
# Ensure environment variables are set in .env.local:
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL="VoiceoverStudioFinder <support@voiceoverstudiofinder.com>"

# Run test script
npx tsx scripts/test-verification-email.ts
```

This will send a test email with sample data to admin@mpdee.co.uk.

## Production Environment Requirements

The following environment variables must be set in production:

```bash
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL="VoiceoverStudioFinder <support@voiceoverstudiofinder.com>"
RESEND_REPLY_TO_EMAIL="support@voiceoverstudiofinder.com"
```

## Email Flow

1. User clicks "Request Verified Badge" (when eligible)
2. API validates requirements:
   - ✅ User is authenticated
   - ✅ Has a studio
   - ✅ Not already verified
   - ✅ Active membership exists
   - ✅ Profile ≥ 85% complete
3. Email sent to all admins + support
4. Admin reviews studio profile
5. Admin manually approves via admin panel

## Sample Email Data

The preview email uses this sample data:
```json
{
  "studioOwnerName": "John Smith",
  "studioName": "Premium Voice Studio",
  "username": "johnsmith",
  "email": "john@example.com",
  "profileCompletion": 92,
  "studioUrl": "https://voiceoverstudiofinder.com/johnsmith",
  "adminDashboardUrl": "https://voiceoverstudiofinder.com/admin"
}
```

## Files Created

1. **Email Template**
   - Location: `src/lib/email/templates/verification-request.ts`
   - Contains HTML and plain text versions
   - Follows existing email template patterns

2. **API Endpoint**
   - Location: `src/app/api/membership/request-verification/route.ts`
   - Handles validation and email sending
   - Returns detailed success/error responses

3. **UI Component Updates**
   - Location: `src/components/dashboard/Settings.tsx`
   - Three distinct card states (verified, incomplete, ready)
   - Loading states and error handling

4. **Test Script**
   - Location: `scripts/test-verification-email.ts`
   - Sends test email to admin@mpdee.co.uk
   - Requires RESEND_API_KEY environment variable

## Next Steps

1. ✅ Open `verification-email-preview.html` in browser to review design
2. ✅ If design looks good, deploy to production
3. ✅ Test the complete flow with a real studio account
4. ✅ Verify email delivery to all recipients
5. ✅ Confirm admin panel has verification approval functionality

## Questions?

If you need any changes to:
- Email design or content
- Validation requirements (85% threshold, etc.)
- Recipient list
- Button functionality

Let me know and I can make the adjustments!
