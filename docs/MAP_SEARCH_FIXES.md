# Map and Search Issues - Fixed

## Issues Identified

### 1. Studios with 'Exact Location' OFF Don't Show on Map
**Status:** ✅ Code is correct, but requires proper data setup

**Root Cause:**
- No studios currently have `show_exact_location = false` in the database
- Studios with exact location OFF must still have coordinates (the center of the privacy circle)

**How It Works:**
- When `show_exact_location = false`:
  - Studio must have `latitude` and `longitude` (center point of privacy area)
  - GoogleMap component (lines 152-213) creates a red circle with 150m radius
  - An invisible marker is placed at the center for clustering
  - Circle is clickable like a regular marker
  - Map filters (line 294 in StudiosPage.tsx) check for lat/lng, so studios must have these

**Requirements for Studios with Exact Location OFF:**
1. `show_exact_location = false`
2. `latitude` and `longitude` must be set to the center of the privacy circle
3. `status = 'ACTIVE'` and `is_profile_visible = true`

**Example Data:**
```sql
UPDATE studio_profiles 
SET 
  show_exact_location = false,
  latitude = 53.7960655,  -- Center of privacy circle
  longitude = -1.5465505   -- Center of privacy circle
WHERE id = 'studio_id_here';
```

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

## Related Files (No Changes Needed)

- `/src/components/maps/GoogleMap.tsx` - Already handles exact location OFF correctly
- `/src/components/search/StudiosPage.tsx` - Marker filtering is correct

## Summary

Both issues have been addressed:
1. **Exact Location OFF**: Code is correct and ready. Just needs studios with proper coordinates when this feature is used.
2. **Leeds Search**: Fixed by improving fallback logic when geocoding fails. Map now centers properly using calculated coordinates from found studios.
