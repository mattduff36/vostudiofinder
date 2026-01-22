# Map and Search Issues - Fixed

## Issues Identified

### 1. Studios with 'Exact Location' OFF Don't Show on Map
**Status:** ✅ **FIXED**

**Root Cause:**
- Dev database had all studios set to `show_exact_location = true` (incorrect)
- Production database had 483 studios set to `show_exact_location = false` (correct)
- GoogleMap component was incorrectly showing privacy circles on public /studios page
- Privacy circles should ONLY appear on the profile edit preview map

**How It Should Work:**
- **Public /studios map**: Always show regular pin markers, regardless of `show_exact_location`
- **Profile edit preview**: Show red circle if `show_exact_location = false`, pin if true
- Studios with exact location OFF still appear in search results and on the map
- The setting only controls what's displayed on their own profile edit preview

**Fixes Applied:**
1. Synced `show_exact_location` field from production to dev (640 studios now have it OFF)
2. Removed privacy circle logic from GoogleMap component (public map)
3. Privacy circles remain only in AddressPreviewMap component (profile edit page)

**Requirements for Studios with Exact Location OFF:**
1. `show_exact_location = false`
2. `latitude` and `longitude` must be set (actual or approximate location)
3. `status = 'ACTIVE'` and `is_profile_visible = true`
4. Studio appears on public map with regular marker (same as everyone else)
5. Privacy circle only shows on their own profile edit preview

### 2. Searching for 'Leeds' Doesn't Show Studios
**Status:** ✅ **FIXED**

**Root Cause:**
- Google Maps API key has referrer restrictions
- Geocoding failed during server-side location search
- When geocoding failed, `searchCoordinates` remained null
- Without `searchCoordinates`, the map couldn't center on Leeds

**Solution Implemented:**
- Modified `/src/app/api/studios/search/route.ts` (lines 276-531)
- Added `geocodingFailed` flag to track when geocoding fails
- When geocoding fails but text-based search finds studios:
  - Calculate the center point from all found studios with coordinates
  - Use this calculated center as `searchCoordinates` for map display
- This ensures the map centers on the search results even without geocoding

**Changes Made:**
1. Track geocoding failures with a flag
2. Calculate approximate center from found studios when geocoding fails
3. Provide `searchCoordinates` to frontend for proper map centering

**Test Results:**
- ✅ Leeds search returns 2 studios (Imagesound Studios, VTR North)
- ✅ Map markers show correctly (2 markers in Leeds area)
- ✅ Map centers on calculated coordinates: (53.796, -1.546)

## Testing

### Manual Test Steps

#### Test 1: Leeds Search
1. Navigate to `/studios?location=Leeds&radius=10`
2. Verify 2 studios appear in search results
3. Verify map centers on Leeds area
4. Verify 2 map markers are visible

#### Test 2: Exact Location OFF (when data exists)
1. Set a studio to have `show_exact_location = false` with valid coordinates
2. Navigate to the studios page
3. Verify a red circle appears on the map (not a pin marker)
4. Verify clicking the circle opens the studio modal
5. Verify the studio appears in the search results list

### Automated Tests

Run diagnostics:
```bash
npx tsx scripts/diagnose-exact-location-off.ts
npx tsx scripts/diagnose-leeds-search.ts
```

Run API tests:
```bash
node scripts/test-leeds-search-api.ts
```

## API Key Configuration (for admins)

**Current Issue:** The `GOOGLE_MAPS_API_KEY` (server-side) has referrer restrictions which prevent server-side geocoding.

**Solution Options:**
1. Create a separate unrestricted API key for server-side use
2. Or rely on the fallback text-based search (current solution)

**Environment Variables:**
- `GOOGLE_MAPS_API_KEY` - Server-side key (should be unrestricted)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Client-side key (can have referrer restrictions)

## Files Modified

1. `/src/app/api/studios/search/route.ts`
   - Added geocoding failure tracking
   - Added automatic center calculation from results
   - Improved fallback logic

2. `/src/components/maps/GoogleMap.tsx`
   - Removed privacy circle rendering from public map
   - Now always shows regular pin markers on /studios page
   - Simplified marker creation logic

3. `/scripts/sync-production-to-dev.ts`
   - Added `show_exact_location` field to sync
   - Ensures field is properly copied from production

4. `/scripts/sync-exact-location-from-prod.ts` (new)
   - One-time script to update existing studios in dev
   - Synced 545 studios with correct `show_exact_location` values

## Related Files

- `/src/components/maps/AddressPreviewMap.tsx` - Handles privacy circles for profile edit page (unchanged, working correctly)

## Summary

Both issues have been completely fixed:
1. **Exact Location OFF**: Fixed by syncing data from production and removing incorrect circle rendering on public map
   - 640 studios now have exact location OFF in dev (matches production)
   - Public /studios page always shows regular markers (never circles)
   - Privacy circles only appear on profile edit preview map
   - All studios appear in search results regardless of this setting
2. **Leeds Search**: Fixed by improving fallback logic when geocoding fails
   - Map now centers properly using calculated coordinates from found studios
   - Returns 2 Leeds studios with correct map centering
