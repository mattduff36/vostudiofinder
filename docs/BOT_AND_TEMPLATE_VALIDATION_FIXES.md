# Bot Protection & Template Validation Fixes

**Date**: January 28, 2026  
**Status**: ✅ Fixed

## Summary

Fixed two critical security and data validation bugs: a non-functional honeypot field that couldn't catch bots, and missing validation for email template footer text that could result in broken emails.

---

## Bug 1: Honeypot Field Not Submitted to Server

### Problem

The honeypot field was rendered in the signup form and hidden with CSS, but it was never actually submitted to the server. The form data was manually constructed using `JSON.stringify()` with only specific fields (`email`, `password`, `display_name`, `turnstileToken`), so the `website` honeypot field was excluded.

**Result**: The backend honeypot check at `/api/auth/register` line 26 (`if (body.website) { ... }`) would never trigger, rendering the bot trap completely ineffective.

### Root Cause

The form submission manually constructed the JSON body without including all form fields:

```typescript
// BAD - Honeypot field excluded
body: JSON.stringify({
  email: data.email,
  password: data.password,
  display_name: display_name,
  turnstileToken,
  // Missing: website (honeypot)
})
```

The honeypot field existed in the DOM but was never read or sent to the server.

### Fix

Added a ref to the honeypot field and included its value in the submission:

```typescript
// 1. Add ref for honeypot field
const honeypotRef = useRef<HTMLInputElement>(null);

// 2. Attach ref to input
<input
  ref={honeypotRef}
  type="text"
  name="website"
  autoComplete="off"
  tabIndex={-1}
  style={{ position: 'absolute', left: '-9999px', ... }}
  aria-hidden="true"
/>

// 3. Include honeypot value in submission
body: JSON.stringify({
  email: data.email,
  password: data.password,
  display_name: display_name,
  turnstileToken,
  website: honeypotRef.current?.value || '', // ✅ Now included
})
```

### Behavior

**Before Fix:**
```
Bot fills honeypot field:
→ Field value: "https://spam-site.com"
→ Submitted to server: { email, password, display_name, turnstileToken }
→ Backend check: body.website === undefined
→ Bot passes honeypot check ❌
→ Signup proceeds
```

**After Fix:**
```
Bot fills honeypot field:
→ Field value: "https://spam-site.com"
→ Submitted to server: { email, password, display_name, turnstileToken, website: "https://spam-site.com" }
→ Backend check: body.website === "https://spam-site.com"
→ Bot caught! ✅
→ Returns: 400 "Invalid submission"
```

**Legitimate User:**
```
User doesn't see honeypot field:
→ Field value: "" (empty)
→ Submitted to server: { ..., website: "" }
→ Backend check: body.website === ""
→ Check passes ✅
→ Signup proceeds
```

### Impact

- ✅ Honeypot trap now functional and catches bots
- ✅ Adds additional layer of bot protection
- ✅ Works alongside Turnstile and rate limiting
- ✅ No impact on legitimate users (field hidden and empty)

### Files Changed

- `src/components/auth/SignupForm.tsx` - Added honeypot ref and included field in submission

---

## Bug 2: Missing Footer Text Validation

### Problem

The `validateTemplatePlaceholders()` function did not validate placeholders in the `footerText` field, but the `renderEmailTemplate()` function does substitute variables in footer text at line 140.

**Result**: Admins could add invalid placeholders to the footer (like `{{unknownVariable}}`) and the validation would not catch them. The invalid placeholders would remain unfilled in rendered emails, appearing as literal `{{unknownVariable}}` text.

### Root Cause

The validation function was missing `footerText` from its type definition and validation logic:

```typescript
// BAD - footerText not in type or validation
export function validateTemplatePlaceholders(
  templateCopy: {
    subject: string;
    preheader?: string;
    heading: string;
    bodyParagraphs: string[];
    bulletItems?: string[];
    ctaPrimaryLabel?: string;
    ctaPrimaryUrl?: string;
    ctaSecondaryLabel?: string;
    ctaSecondaryUrl?: string;
    // Missing: footerText
  },
  variableSchema: Record<string, string>
): string[] {
  // ... validation code ...
  // Missing: footerText validation
}
```

Meanwhile, `renderEmailTemplate()` was substituting variables in footer:

```typescript
// Line 140 in render.ts
let footerText = template.footerText 
  ? substituteVariables(template.footerText, variables) 
  : undefined;
```

### Fix

**1. Updated validation function signature:**

```typescript
export function validateTemplatePlaceholders(
  templateCopy: {
    subject: string;
    preheader?: string;
    heading: string;
    bodyParagraphs: string[];
    bulletItems?: string[];
    ctaPrimaryLabel?: string;
    ctaPrimaryUrl?: string;
    ctaSecondaryLabel?: string;
    ctaSecondaryUrl?: string;
    footerText?: string; // ✅ Added
  },
  variableSchema: Record<string, string>
): string[]
```

**2. Added footer validation logic:**

```typescript
// Check all text fields
extractPlaceholders(templateCopy.subject);
if (templateCopy.preheader) extractPlaceholders(templateCopy.preheader);
extractPlaceholders(templateCopy.heading);
templateCopy.bodyParagraphs.forEach(extractPlaceholders);
templateCopy.bulletItems?.forEach(extractPlaceholders);
if (templateCopy.ctaPrimaryLabel) extractPlaceholders(templateCopy.ctaPrimaryLabel);
if (templateCopy.ctaPrimaryUrl) extractPlaceholders(templateCopy.ctaPrimaryUrl);
if (templateCopy.ctaSecondaryLabel) extractPlaceholders(templateCopy.ctaSecondaryLabel);
if (templateCopy.ctaSecondaryUrl) extractPlaceholders(templateCopy.ctaSecondaryUrl);
if (templateCopy.footerText) extractPlaceholders(templateCopy.footerText); // ✅ Added
```

**3. Updated all validation calls to include footerText:**

```typescript
// In templates/[key]/route.ts (PATCH)
const unknownPlaceholders = validateTemplatePlaceholders(
  {
    subject: updated.subject,
    preheader: updated.preheader || undefined,
    heading: updated.heading,
    bodyParagraphs: updated.body_paragraphs,
    bulletItems: updated.bullet_items,
    ctaPrimaryLabel: updated.cta_primary_label || undefined,
    ctaPrimaryUrl: updated.cta_primary_url || undefined,
    ctaSecondaryLabel: updated.cta_secondary_label || undefined,
    ctaSecondaryUrl: updated.cta_secondary_url || undefined,
    footerText: updated.footer_text || undefined, // ✅ Added
  },
  variableSchema
);

// In templates/route.ts (POST)
const unknownPlaceholders = validateTemplatePlaceholders(
  {
    subject: validated.subject,
    preheader: validated.preheader,
    heading: validated.heading,
    bodyParagraphs: validated.bodyParagraphs,
    bulletItems: validated.bulletItems,
    ctaPrimaryLabel: validated.ctaPrimaryLabel,
    ctaPrimaryUrl: validated.ctaPrimaryUrl,
    ctaSecondaryLabel: validated.ctaSecondaryLabel,
    ctaSecondaryUrl: validated.ctaSecondaryUrl,
    footerText: validated.footerText, // ✅ Added
  },
  validated.variableSchema
);
```

### Behavior

**Before Fix:**
```
Admin updates template footer:
→ Footer: "Contact us at {{supportEmail}} or {{unknownVar}}"
→ Validation: Checks all fields EXCEPT footer
→ Response: 200 OK (validation passes)
→ Email rendered: "Contact us at support@example.com or {{unknownVar}}"
→ Users see broken placeholder ❌
```

**After Fix:**
```
Admin updates template footer:
→ Footer: "Contact us at {{supportEmail}} or {{unknownVar}}"
→ Validation: Checks ALL fields INCLUDING footer
→ Found unknown: "unknownVar"
→ Response: 400 Bad Request
→ Error: "Unknown placeholders found: unknownVar"
→ Template not saved ✅
```

**Valid Footer:**
```
Admin updates template footer:
→ Footer: "Contact us at {{supportEmail}}" (valid variable)
→ Validation: All placeholders valid
→ Response: 200 OK
→ Email rendered: "Contact us at support@example.com" ✅
```

### Impact

- ✅ Footer placeholders now validated before save
- ✅ Prevents broken emails with unfilled placeholders
- ✅ Admin gets clear error message about invalid placeholders
- ✅ Consistent validation across all template fields

### Files Changed

- `src/lib/email/render.ts` - Added `footerText` to validation function
- `src/app/api/admin/emails/templates/[key]/route.ts` - Include footer in validation call
- `src/app/api/admin/emails/templates/route.ts` - Include footer in validation call

---

## Testing Recommendations

### Bug 1: Honeypot Field

**Test Bot Detection:**

1. Open signup form in dev tools
2. Find honeypot field: `input[name="website"]`
3. Manually set value: `document.querySelector('input[name="website"]').value = 'http://spam.com'`
4. Submit form
5. **Expected**: Error 400 "Invalid submission"

**Test Legitimate User:**

1. Fill out signup form normally
2. Don't touch honeypot field
3. Submit form
4. **Expected**: Signup proceeds normally

**Test Backend Logs:**

```
Bot attempt:
[BOT] Honeypot field filled: http://spam.com
```

### Bug 2: Footer Validation

**Test Invalid Footer Placeholder:**

1. Go to admin emails section
2. Edit a template
3. Set footer: `"Visit {{websiteUrl}} for more info"` (assuming `websiteUrl` not in schema)
4. Save template
5. **Expected**: Error 400 "Unknown placeholders found: websiteUrl"

**Test Valid Footer Placeholder:**

1. Check template's variable schema for valid variables
2. Set footer: `"Contact {{displayName}} at {{userEmail}}"` (assuming these are valid)
3. Save template
4. **Expected**: 200 OK, template saved

**Test Empty Footer:**

1. Set footer to empty string or undefined
2. Save template
3. **Expected**: 200 OK, no validation error

---

## Prevention

### Code Review Checklist

When reviewing signup or email template PRs:

- [ ] **Form submissions**: Verify all security fields (honeypot, CAPTCHA) are included in submission
- [ ] **Validation functions**: Check all template fields are validated, not just main content
- [ ] **Type signatures**: Ensure validation function types match rendering function usage
- [ ] **Test coverage**: Verify edge cases (empty fields, invalid placeholders) are tested

### Best Practices

**Form Submissions:**
- Use refs to capture all form field values, including hidden security fields
- Don't manually construct JSON bodies that exclude fields
- Consider using FormData for complete form capture

**Validation:**
- When adding new template fields, update validation function
- Keep validation logic in sync with rendering logic
- Add TypeScript types to catch missing fields at compile time

---

## Related Documentation

- Previous fixes: `docs/EMAIL_SYSTEM_BUG_FIXES_ROUND2.md`
- Bot protection: `docs/TURNSTILE_CONFIG_ERROR_FIX.md`

---

**Fixed by**: AI Assistant  
**Verified by**: Pending manual testing
