# Email Template URL Audit

## Current State

Email templates have hardcoded URLs to `https://voiceoverstudiofinder.com`. This affects preview/staging environments.

## URLs in Templates

### Static Assets (OK to hardcode)
All email templates use:
```
https://voiceoverstudiofinder.com/images/voiceover-studio-finder-logo-email-white-bg.png
```

**Status**: ✅ Correct - Static assets should always load from production

### Dynamic Links (Should be environment-aware)

| Template | Links | Impact |
|----------|-------|--------|
| `payment-success.ts` | `/dashboard`, `/billing` | Low - emails link to production even in preview |
| `refund-processed.ts` | `/dashboard` | Low - emails link to production even in preview |
| `username-reservation.ts` | None (uses dynamic signupUrl param) | ✅ Already correct |
| `email-verification.ts` | None (uses dynamic verificationUrl param) | ✅ Already correct |
| `password-reset.ts` | None (uses dynamic resetUrl param) | ✅ Already correct |
| `welcome.ts` | None | ✅ No links |
| `legacy-user-announcement.ts` | Uses `baseUrl` param | ✅ Already correct |

## Recommendation

### Priority: Low
Email template URLs don't affect webhook functionality or payment processing. They only affect where email links point in preview builds.

### Future Enhancement
To make email templates fully environment-aware:

1. Add `baseUrl` parameter to all template functions
2. Pass `getBaseUrl()` when calling templates
3. Replace hardcoded URLs with `${baseUrl}/dashboard` etc.

### Example Fix
```typescript
// Before
export const paymentSuccessTemplate = (data: { ... }) => {
  // template with hardcoded https://voiceoverstudiofinder.com/dashboard
}

// After
export const paymentSuccessTemplate = (data: { 
  ...
  baseUrl: string; // Add this
}) => {
  // template with ${data.baseUrl}/dashboard
}

// Usage
const html = paymentSuccessTemplate({
  ...data,
  baseUrl: getBaseUrl(request), // Pass environment-aware URL
});
```

## Current Workaround

For preview build testing:
- Emails sent from preview builds will link to production
- This is acceptable for testing as production is the real environment
- Test users can still complete flows by navigating to preview URL manually

## Conclusion

Email template URLs are **not blocking** and don't need immediate fixes. Document and defer to future enhancement.
