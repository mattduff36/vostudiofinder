# Profile Completion Bugs Found

## Bug #1: ProfileCompletionProgress passes website_url to wrong object

**File**: `src/components/profile/ProfileCompletionProgress.tsx` line 63
**Issue**: Passes `website_url` to `profile` object instead of `studio` object
**Current**:
```typescript
profile: {
  ...
  website_url: profileData.website_url || null,  // ❌ WRONG
  ...
}
```
**Should be**:
```typescript
studio: {
  ...
  website_url: profileData.website_url || null,  // ✅ CORRECT
}
```

## Bug #2: ProfileCompletionProgress doesn't pass website_url to studio at all

**File**: `src/components/profile/ProfileCompletionProgress.tsx` line 83-87
**Issue**: studio object doesn't include website_url field
**Current**:
```typescript
studio: {
  name: profileData.studio_name || null,
  studio_types: profileData.studio_types_count ? Array(profileData.studio_types_count).fill('type') : [],
  images: profileData.images_count ? Array(profileData.images_count).fill({}) : [],
  // ❌ MISSING: website_url
}
```

## Impact

This causes website_url required field to always be incomplete on Dashboard, resulting in:
- Dashboard showing lower completion % than other pages
- Required field count showing X/11 instead of 11/11

## Fix Required

1. Remove `website_url` from `profile` object (line 63)
2. Add `website_url` to `studio` object (line 87)
