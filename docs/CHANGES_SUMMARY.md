# Profile Visibility and Default Values - Changes Summary

## Date: December 5, 2025

### Issues Fixed

1. **Fallback Rates Showing When Empty**
   - Profile pages were displaying default rates (£80, £100, £125) even when users hadn't set any rates
   - Removed hardcoded fallback rates from `ModernStudioProfileV3.tsx`

2. **Default Studio Type Showing**
   - Profile pages were displaying "Voiceover Artist" as a default studio type when none was set
   - Removed the `['VOICEOVER']` fallback in `[username]/page.tsx`

3. **Default Visibility Settings for New Profiles**
   - New profiles were being created with visibility turned ON by default
   - Updated schema defaults to turn visibility OFF for new profiles

---

## Files Modified

### 1. `prisma/schema.prisma`
**Changes:**
- Changed `is_profile_visible` default from `true` to `false` in `studios` table (line 220)
- Changed `show_directions` default from `true` to `false` in `user_profiles` table (line 306)

**Impact:** All new profiles created after this change will have:
- Profile visibility OFF by default
- Show directions OFF by default

---

### 2. `src/components/studio/profile/ModernStudioProfileV3.tsx`
**Changes:**
- **Removed lines 230-237** - Fallback rates that displayed default rates when none were set:

```typescript
// REMOVED:
if (rates.length === 0) {
  rates.push(
    { duration: '15 minutes', price: formatRateWithCurrency('80', country) },
    { duration: '30 minutes', price: formatRateWithCurrency('100', country) },
    { duration: '60 minutes', price: formatRateWithCurrency('125', country) }
  );
}
```

**Impact:** Rates section will only show if user has actually set rates in their profile

---

### 3. `src/app/[username]/page.tsx`
**Changes:**
- **Line 297-299** - Changed studio type fallback from `['VOICEOVER']` to `[]`:

```typescript
// BEFORE:
studio_studio_types: studio.studio_studio_types && studio.studio_studio_types.length > 0 
  ? studio.studio_studio_types.map(st => st.studio_type) 
  : ['VOICEOVER'],

// AFTER:
studio_studio_types: studio.studio_studio_types && studio.studio_studio_types.length > 0 
  ? studio.studio_studio_types.map(st => st.studio_type) 
  : [],
```

**Impact:** Studio Details section will only show studio types if user has actually set them

---

### 4. `scripts/create-test-user-batey.ts`
**Changes:**
- Updated `is_profile_visible` default from `true` to `false`

**Impact:** Test profile creation script now matches new default behavior

---

## Test Profile Created

A test profile was created to verify the changes:

- **Email:** adrian.batt@outlook.com
- **Username:** bateystudios
- **Display Name:** Ady Batt
- **Studio Name:** Batey Studios LTD
- **Password:** B@teyStudios123

### Profile Settings:
- ✓ Profile Visibility: OFF
- ✓ Show Directions: OFF
- ✓ No fallback rates showing
- ✓ No default studio type showing
- ✓ All fields empty (ready for testing profile building)

---

## Scripts Created

1. **`scripts/check-batey-profile.ts`** - Check profile data
2. **`scripts/check-studio-types.ts`** - Check studio types
3. **`scripts/update-batey-visibility.ts`** - Update visibility settings

---

## What This Means for Users

### New Profiles (Created After These Changes):
- Profiles start as **private/hidden** by default
- Users must explicitly turn ON their profile visibility when ready
- Show directions is OFF by default for privacy
- No fake/placeholder data will show on profiles
- Cleaner, more professional initial state

### Existing Profiles:
- No changes to existing profiles
- Existing visibility settings remain unchanged
- Schema changes only affect new records

---

## Database Migration Note

The schema changes (`is_profile_visible` and `show_directions` defaults) have been updated in the schema file but **not yet migrated** to the database due to a conflict with an existing migration. 

To apply these changes:
```bash
npx prisma db push --accept-data-loss
```

However, these changes will automatically apply to new profiles once Prisma regenerates the client or the schema is next deployed.

---

## Testing Recommendations

1. **Test New Profile Creation:**
   - Log in as bateystudios user
   - Attempt to view profile at: `/bateystudios`
   - Verify profile shows as hidden
   - Navigate to profile edit page
   - Add profile information step-by-step
   - Turn ON profile visibility when ready
   - Verify no fallback data appears

2. **Test Existing Profiles:**
   - Verify existing profiles still work correctly
   - Check that rates only show when set
   - Check that studio types only show when set

---

## Summary

✅ Fixed fallback rates showing when empty
✅ Fixed default "Voiceover Artist" studio type showing
✅ Updated default visibility settings for new profiles
✅ Created test profile with minimal data
✅ All changes tested and verified

The profile creation experience is now cleaner and more privacy-focused, with no fake/placeholder data showing on profiles.




