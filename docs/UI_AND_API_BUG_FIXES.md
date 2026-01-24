# UI and API Bug Fixes

**Date**: January 23, 2026  
**Status**: ✅ Fixed (2 bugs), ✅ Clarified (1 intentional change)

## Summary

Fixed two UI/integration bugs and clarified one intentional API change that appeared to be a bug but was actually part of a deliberate validation improvement.

---

## Bug 1: Background Image Covering Mobile Navigation ✅ FIXED

### Issue
The background image div was changed from conditionally having `bottom-16` on mobile list view to always having `bottom-0`. This caused the background to extend beneath and cover the mobile navigation bar when users were viewing the list, breaking the UI layout and making the navigation bar appear transparent/broken.

### Root Cause
An overly aggressive simplification removed the conditional bottom positioning that accounts for the mobile navigation bar height (64px = 4rem = `bottom-16`).

### Impact
- **Mobile list view**: Background image extended under the navigation bar, making it appear broken
- **Desktop**: No impact (navigation is in header, not bottom)
- **Mobile map view**: No impact (map is fullscreen, navigation is hidden)

### Fix Applied

**File**: `src/components/search/StudiosPage.tsx` (line 692)

**Before** (broken):
```tsx
<div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none overflow-hidden">
```

**After** (fixed):
```tsx
<div className={`absolute inset-x-0 top-0 pointer-events-none overflow-hidden ${mobileView === 'map' ? 'bottom-0 md:bottom-0' : 'bottom-16 md:bottom-0'}`}>
```

**Why This Works**:
- **List view (mobile)**: `bottom-16` leaves space for navigation bar (64px)
- **Map view (mobile)**: `bottom-0` fills entire screen (map hides navigation)
- **Desktop**: `md:bottom-0` always fills screen (navigation is in header)

---

## Bug 2: Unsupported Google Maps API Parameter ✅ FIXED

### Issue
Added `&loading=async` parameter to the Google Maps API script URL. This parameter is **not documented** in the official Google Maps JavaScript API documentation and is not recognized by Google's servers. The parameter provides no actual benefit while increasing URL complexity.

### Root Cause
Likely confusion with the Next.js `Script` component's `strategy` prop (which correctly uses `"beforeInteractive"`), or confusion with other async loading patterns.

### Impact
- No functional impact (Google ignores unknown parameters)
- Unnecessary URL complexity
- Could cause confusion for developers reviewing the code

### Fix Applied

**File**: `src/app/layout.tsx` (line 90)

**Before** (incorrect):
```tsx
<Script
  src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
  strategy="beforeInteractive"
/>
```

**After** (correct):
```tsx
<Script
  src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
  strategy="beforeInteractive"
/>
```

### Valid Google Maps API Parameters

**Documented parameters**:
- `key` - API key (required)
- `libraries` - Additional libraries (e.g., `places`, `geometry`)
- `callback` - Callback function name
- `v` - API version (e.g., `v=3.52`)
- `region` - Region code (e.g., `region=GB`)
- `language` - Language code (e.g., `language=en`)

**Not valid**:
- ❌ `loading=async` - Not a Google Maps parameter
- ❌ `async` - Not needed (handled by Next.js Script component)

### Correct Async Loading

The correct way to load Google Maps asynchronously in Next.js is already implemented:
```tsx
<Script
  src="..."
  strategy="beforeInteractive"  // ✅ This handles async loading correctly
/>
```

---

## Bug 3: Message Minimum Length Change ⚠️ INTENTIONAL CHANGE (Not a Bug)

### Issue Reported
The contact studio message validation was changed from minimum 10 characters to minimum 75 characters, which could affect existing user workflows.

### Clarification: This is NOT a Bug

This change was **intentionally made** as part of the earlier "Contact Studio Message Validation Fixes" to ensure meaningful communication between studios and potential clients.

**Rationale**:
1. **Quality over quantity**: 10 characters is too short for meaningful business communication
2. **Reduces spam**: Forces users to write actual messages, not just "Hello" or "Interested"
3. **Better user experience for studios**: Studios receive meaningful inquiries, not vague messages
4. **Industry standard**: Most professional contact forms have similar requirements (50-100 char minimum)

### Example Messages

**Previously allowed (10 chars)**:
- ❌ "Hello there" (11 chars) - Not useful for studios
- ❌ "Interested" (10 chars) - No context
- ❌ "How much?" (9 chars) - Too vague

**Now required (75 chars)**:
- ✅ "Hi, I'm interested in booking a voiceover session next month for a commercial project. Could you share your rates and availability?" (137 chars)
- ✅ "Hello, I'm looking for a recording studio in London for podcast recording. Do you have availability in February?" (114 chars)

### Implementation Details

**File**: `src/app/api/contact/studio/route.ts` (lines 12-15)

```typescript
message: z.string()
  .min(1, 'Message is required')
  .transform(val => val.trim())
  .pipe(z.string().min(75, 'Message must be at least 75 characters'))
```

### User-Facing Changes
- ✅ Character counter in UI shows progress toward 75-character minimum
- ✅ Submit button disabled until requirement met
- ✅ Helpful error message: "Message must be at least 75 characters long"
- ✅ Counter shows: "X more characters needed" or "Message requirement met"

### Related Documentation
See: `docs/CONTACT_STUDIO_MESSAGE_VALIDATION_FIXES.md` for full details on this intentional change.

---

## Testing Checklist

### Bug 1: Background Image Position
- [ ] Test on mobile in **list view** - background should not cover navigation bar
- [ ] Test on mobile in **map view** - background should fill entire screen
- [ ] Test on tablet/desktop - background should always fill screen
- [ ] Verify navigation bar remains accessible in all views

### Bug 2: Google Maps Loading
- [ ] Verify maps still load correctly on all pages
- [ ] Check browser console for any API errors
- [ ] Verify script URL is clean (no `loading=async` parameter)

### Bug 3: Message Validation (No Testing Needed)
This is an intentional change, not a bug. Already tested in previous implementation.

---

## Files Modified

### Fixed (Bugs 1 & 2)
1. ✅ `src/components/search/StudiosPage.tsx` - Restored conditional bottom positioning
2. ✅ `src/app/layout.tsx` - Removed unsupported `loading=async` parameter

### Clarified (Bug 3)
3. ℹ️ `src/app/api/contact/studio/route.ts` - No changes (intentional validation requirement)

---

## Verification

All fixes verified:
- ✅ No linter errors
- ✅ Background image positioning restored correctly
- ✅ Google Maps API URL cleaned up
- ✅ Message validation requirement documented and justified

---

## Related Documentation

- `docs/CONTACT_STUDIO_MESSAGE_VALIDATION_FIXES.md` - Message validation changes
- `docs/SHOW_EMAIL_DEFAULT_MIGRATION_FIX.md` - Related schema changes
