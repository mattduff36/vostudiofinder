# Email System Bug Fixes

**Date**: January 28, 2026  
**Status**: ✅ Fixed

## Summary

Fixed three critical bugs in the email campaign system that would have caused complete system failures in production.

---

## Bug 1: Missing Cron Job Registration

### Problem

The `/api/cron/process-email-campaigns` endpoint was created but not registered in `vercel.json`'s crons configuration. This meant:

- The cron job would never execute in production
- Email campaigns would remain in `SENDING` status indefinitely
- Campaigns would never complete or send emails
- Email campaign functionality would be completely broken in production

### Root Cause

When the email campaign processing endpoint was created, the developer forgot to add it to the Vercel cron configuration.

### Fix

Added the missing cron job to `vercel.json`:

```json
{
  "path": "/api/cron/process-email-campaigns",
  "schedule": "*/5 * * * *"
}
```

**Schedule**: Runs every 5 minutes to process pending campaign deliveries in batches.

### Impact

- ✅ Email campaigns will now process automatically in production
- ✅ Deliveries will be sent in batches every 5 minutes
- ✅ Campaigns will progress from `SENDING` to `SENT` when complete
- ✅ System remains responsive during large campaigns

### Files Changed

- `vercel.json` - Added cron job entry

---

## Bug 2: Mutually Exclusive Prisma Filter Conditions

### Problem

The code spread `studio_profiles` filter conditions without properly handling mutually exclusive constraints:

```typescript
// BAD - Creates invalid Prisma syntax
if (filters.hasStudio) {
  where.studio_profiles = { isNot: null };
} else {
  where.studio_profiles = { is: null };
}

// This spread operation is the problem
if (filters.studioVerified) {
  where.studio_profiles = {
    ...where.studio_profiles,  // Could be { is: null }
    verified: true,             // Trying to add verified: true
  };
}
// Results in: { is: null, verified: true } ❌ INVALID
```

When `hasStudio` is false (setting `{ is: null }`), and `studioVerified` or `studioFeatured` filters are also set, the spread operation creates invalid Prisma syntax like `{ is: null, verified: true }`.

**These conditions are mutually exclusive:**
- `{ is: null }` means "user has NO studio"
- `{ verified: true }` means "user's studio is verified"
- You can't check if a non-existent studio is verified!

### Root Cause

The code used a naive spread operation approach without considering the logical impossibility of checking properties on a null relationship.

### Fix

Replaced the spread operation with proper conditional logic:

```typescript
if (filters.hasStudio !== undefined) {
  if (filters.hasStudio) {
    // User HAS a studio - can apply additional filters
    const studioFilter: any = { isNot: null };
    
    if (filters.studioVerified !== undefined) {
      studioFilter.verified = filters.studioVerified;
    }
    
    if (filters.studioFeatured !== undefined) {
      studioFilter.is_featured = filters.studioFeatured;
    }
    
    where.studio_profiles = studioFilter;
  } else {
    // User has NO studio - ignore studioVerified/studioFeatured filters
    where.studio_profiles = { is: null };
  }
} else {
  // hasStudio not specified - can still filter by verified/featured
  const studioFilter: any = {};
  
  if (filters.studioVerified !== undefined) {
    studioFilter.verified = filters.studioVerified;
  }
  
  if (filters.studioFeatured !== undefined) {
    studioFilter.is_featured = filters.studioFeatured;
  }
  
  if (Object.keys(studioFilter).length > 0) {
    where.studio_profiles = studioFilter;
  }
}
```

### Behavior

**Before Fix:**
```
hasStudio: false + studioVerified: true
→ Runtime error: Invalid Prisma query
```

**After Fix:**
```
hasStudio: false + studioVerified: true
→ Only applies hasStudio: false filter
→ Ignores studioVerified (logically impossible)
→ Returns users without studios
```

**Valid Combinations:**
- `hasStudio: true` + `studioVerified: true` → Users with verified studios ✅
- `hasStudio: true` + `studioFeatured: true` → Users with featured studios ✅
- `hasStudio: false` → Users without studios (ignores verified/featured filters) ✅
- `studioVerified: true` (no hasStudio) → Users with verified studios ✅

### Impact

- ✅ No more runtime errors when filtering users
- ✅ Filters behave logically and intuitively
- ✅ Admin can select recipients without worrying about filter combinations
- ✅ Campaign creation and user listing work correctly

### Files Changed

- `src/app/api/admin/emails/users/route.ts` - Fixed filter logic in GET handler
- `src/app/api/admin/emails/campaigns/route.ts` - Fixed filter logic in `buildUserWhereClause()`
- `src/app/api/admin/emails/campaigns/[id]/start/route.ts` - Fixed filter logic in `buildUserWhereClause()`

---

## Bug 3: Missing Required Template Variable

### Problem

The preview and test-send pages provided sample variables for email templates but were missing `resetPasswordUrl`, which is required by the `legacy-user-announcement` template.

**Template requires:**
```typescript
variableSchema: {
  displayName: 'string',
  userEmail: 'email',
  resetPasswordUrl: 'url',  // ← Required
}
```

**Pages provided:**
```typescript
{
  displayName: '...',
  userEmail: '...',
  resetUrl: '...',  // ← Wrong variable name
  // Missing: resetPasswordUrl
}
```

This caused:
- Template rendering to fail with "missing required variable" error
- Preview page to show error instead of email
- Test-send page to fail when trying to send legacy announcement
- Unable to test or preview the legacy user announcement template

### Root Cause

The pages provided `resetUrl` (used by password-reset template) but not `resetPasswordUrl` (used by legacy-user-announcement template).

### Fix

Added the missing variable to both pages:

```typescript
const sampleVariables = {
  // ... existing variables ...
  resetUrl: 'https://voiceoverstudiofinder.com/reset/sample',
  resetPasswordUrl: 'https://voiceoverstudiofinder.com/reset/sample', // Added
  // ... rest of variables ...
};
```

### Impact

- ✅ All templates can now be previewed without errors
- ✅ Legacy user announcement template renders correctly
- ✅ Test emails can be sent for all templates
- ✅ Admin can verify email appearance before sending campaigns

### Files Changed

- `src/app/admin/emails/template/[key]/preview/page.tsx` - Added `resetPasswordUrl` variable
- `src/app/admin/emails/template/[key]/test/page.tsx` - Added `resetPasswordUrl` variable

---

## Testing Recommendations

### Bug 1: Cron Job Registration

**Manual Test:**
1. Deploy to Vercel
2. Create a draft campaign with a few recipients
3. Start the campaign
4. Check Vercel logs for cron execution every 5 minutes
5. Verify deliveries are processed and campaign completes

**Expected:**
- Cron job appears in Vercel dashboard
- Runs every 5 minutes
- Processes deliveries in batches
- Campaign status changes from `SENDING` to `SENT`

### Bug 2: Filter Combinations

**Test Cases:**

1. **Users with verified studios:**
   ```
   hasStudio: true
   studioVerified: true
   → Should return only users with verified studios
   ```

2. **Users without studios:**
   ```
   hasStudio: false
   → Should return only users without studios
   → Should ignore any studioVerified/studioFeatured filters
   ```

3. **Invalid combination (now handled gracefully):**
   ```
   hasStudio: false
   studioVerified: true
   → Should return users without studios
   → Should ignore studioVerified filter
   ```

4. **Multiple studio filters:**
   ```
   hasStudio: true
   studioVerified: true
   studioFeatured: true
   → Should return only users with verified AND featured studios
   ```

**Test in:**
- User listing page (`/admin/emails/users`)
- Campaign creation (recipient count)
- Campaign start (actual recipient selection)

### Bug 3: Template Variables

**Test All Templates:**

1. Go to `/admin/emails`
2. For each template:
   - Click "Preview" → Should show email without errors
   - Click "Test Send" → Should send email successfully
3. Pay special attention to:
   - `legacy-user-announcement` (uses `resetPasswordUrl`)
   - `password-reset` (uses `resetUrl`)
   - Both should work without errors

---

## Prevention

### For Future Development

1. **Cron Jobs:**
   - Create a checklist for new cron endpoints
   - Add comment in route file: `// Cron: Add to vercel.json`
   - Consider automated tests that check vercel.json completeness

2. **Prisma Filters:**
   - Never spread relation filters blindly
   - Check for mutually exclusive conditions
   - Add TypeScript types that prevent invalid combinations
   - Consider creating a filter builder utility

3. **Template Variables:**
   - Generate sample variables from template schema automatically
   - Add validation that checks template requirements
   - Create a shared sample variable generator
   - Add tests that verify all templates can render

### Code Review Checklist

When reviewing email system PRs, check:

- [ ] New cron endpoints added to `vercel.json`
- [ ] Filter logic handles mutually exclusive conditions
- [ ] Sample variables include all required template variables
- [ ] Tests cover filter combinations
- [ ] Templates validated against schema

---

## Related Files

### Bug 1
- `vercel.json`
- `src/app/api/cron/process-email-campaigns/route.ts`

### Bug 2
- `src/app/api/admin/emails/users/route.ts`
- `src/app/api/admin/emails/campaigns/route.ts`
- `src/app/api/admin/emails/campaigns/[id]/start/route.ts`

### Bug 3
- `src/app/admin/emails/template/[key]/preview/page.tsx`
- `src/app/admin/emails/template/[key]/test/page.tsx`
- `src/lib/email/template-registry.ts` (template definitions)

---

**Fixed by**: AI Assistant  
**Verified by**: Pending manual testing
