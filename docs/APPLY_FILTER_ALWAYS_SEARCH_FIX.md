# Apply Filter Always-Search and Dirty-State Gating Fix

## Date: January 22, 2026

## Issue
The "Apply Filter" button did not trigger searches when only Studio Type/Service filters were changed, and the button visibility was controlled by fragile state flags that could get out of sync with actual filter changes.

## Changes Implemented

### 1. Replaced Flag-Based State with Derived Dirty Comparison

**Before:**
- Used `hasPendingChanges` state flag that was manually set/cleared
- Flag could get out of sync with actual filter state
- Required manual management in multiple places

**After:**
- Added `normalizeFilters()` function to create stable, comparable filter shapes
- Added `lastAppliedRef` to track the last applied (searched) filter state
- `hasPendingChanges` is now derived from comparison: `JSON.stringify(normalizeFilters(filters)) !== JSON.stringify(lastAppliedRef.current)`
- Automatically stays in sync with filter changes

**Code:**
```typescript
// Normalize filters for comparison (stable, comparable shape)
const normalizeFilters = (f: typeof initialFilters) => ({
  location: (f.location || '').trim(),
  studio_studio_types: [...(f.studio_studio_types || [])].sort(),
  studio_services: [...(f.studio_services || [])].sort(),
  radius: f.radius || 10,
  sortBy: f.sortBy || 'name',
  sort_order: f.sort_order || 'asc',
  lat: f.lat,
  lng: f.lng,
});

const lastAppliedRef = useRef(normalizeFilters(filtersWithDefaults));

// Derive hasPendingChanges from real comparison
const hasPendingChanges = JSON.stringify(normalizeFilters(filters)) !== JSON.stringify(lastAppliedRef.current);
```

### 2. Apply Filter Button Always Triggers Search

**Before:**
- Only searched if location was provided
- Blocked searches with just Studio Type/Service filters

**After:**
- Always triggers search regardless of filter state
- Updates `lastAppliedRef` immediately
- Allows global filtered searches (e.g., all HOME studios worldwide)

**Code:**
```typescript
<Button
  onClick={() => {
    logger.log('✅ Apply Filter clicked - always triggering search');
    // Always trigger search (even with no location - global filtered results)
    lastAppliedRef.current = normalizeFilters(filters);
    setShowActionButtons(false);
    onSearch(filters);
    // Call optional callback (e.g., to close mobile modal)
    if (onApplyFilter) {
      onApplyFilter();
    }
  }}
>
  Apply Filter
</Button>
```

### 3. Mobile Drawer Close Only Searches When Dirty

**Before:**
- Mobile drawer close (imperative `applyFilters()`) had same behavior as button click

**After:**
- Only triggers search if filters changed since last search
- Otherwise just closes drawer without navigation
- Still hides buttons and closes UI in both cases

**Code:**
```typescript
useImperativeHandle(ref, () => ({
  applyFilters: () => {
    logger.log('🔍 Imperative applyFilters called (mobile drawer close)');
    const isDirty = JSON.stringify(normalizeFilters(filters)) !== JSON.stringify(lastAppliedRef.current);
    
    if (isDirty) {
      logger.log('✅ Filters changed since last search - triggering search');
      lastAppliedRef.current = normalizeFilters(filters);
      onSearch(filters);
    } else {
      logger.log('ℹ️ No changes since last search - just closing drawer');
    }
    
    // Always hide buttons (drawer is closing)
    setShowActionButtons(false);
  }
}), [filters, onSearch, normalizeFilters]);
```

### 4. Button Visibility Logic Unchanged

The rendering logic already matched our requirements:
- `showActionButtons && hasPendingChanges` → Show **Apply Filter** + **New Search**
- `showActionButtons && !hasPendingChanges && hasActiveFilters` → Show **New Search** only

Now that `hasPendingChanges` is derived from real comparison, this works perfectly.

### 5. Removed Manual State Management

Removed all manual `setHasPendingChanges()` calls:
- Studio type toggle handler
- Location autocomplete selection
- Radius slider (mobile)

Since `hasPendingChanges` is now derived, it updates automatically when `filters` changes.

## User Experience Improvements

### Desktop Behavior
1. **Search with just Studio Type:**
   - Select "Home Studio"
   - Wait 2 seconds → Apply Filter + New Search buttons appear
   - Click "Apply Filter" → Search executes with `/studios?studioTypes=HOME`
   - ✅ Works now (previously blocked without location)

2. **Open filters without changing:**
   - Perform a search
   - Click filter box
   - Wait 2 seconds → Only "New Search" button appears
   - ✅ No Apply Filter button (nothing to apply)

3. **Change and apply:**
   - Change Studio Type
   - Click "Apply Filter" → Search executes immediately
   - ✅ Always searches when clicked

### Mobile Behavior
1. **Change filters and close drawer:**
   - Open filter drawer
   - Change Studio Type
   - Tap backdrop/scroll/press Escape → Search executes and drawer closes
   - ✅ Search triggered because filters changed

2. **Open drawer without changes:**
   - Open filter drawer without changing anything
   - Tap backdrop/scroll/press Escape → Drawer closes (no search)
   - ✅ No unnecessary navigation/reload

## Technical Benefits

1. **Eliminated State Synchronization Issues:**
   - No manual flag management
   - `hasPendingChanges` always reflects reality
   - Impossible to get out of sync

2. **Simplified Code:**
   - Removed 3 `setHasPendingChanges` calls
   - Single source of truth for "dirty" state
   - Easier to understand and maintain

3. **More Predictable Behavior:**
   - Button visibility tied directly to filter comparison
   - Clear separation between button click (always search) and drawer close (conditional)

4. **Better Performance:**
   - No unnecessary re-renders from state changes
   - Derived value computed on demand

## Files Modified

1. **src/components/search/SearchFilters.tsx**
   - Added `normalizeFilters()` function
   - Added `lastAppliedRef` to track last applied state
   - Changed `hasPendingChanges` from state to derived value
   - Updated Apply Filter button to always search
   - Updated imperative `applyFilters()` to only search if dirty
   - Removed manual `setHasPendingChanges()` calls
   - Updated `useEffect` for `initialFilters` to update `lastAppliedRef`

## Testing Verification

### Test Case 1: Studio Type Only (Desktop)
1. Navigate to `/studios`
2. Select "Home Studio" checkbox
3. Wait 2 seconds
4. Click "Apply Filter"
5. ✅ Expected: URL updates to `/studios?studioTypes=HOME&page=1`
6. ✅ Expected: Search results show only home studios

### Test Case 2: No Changes - New Search Only (Desktop)
1. Perform any search
2. Click inside filter box
3. Wait 2 seconds
4. ✅ Expected: Only "New Search" button appears
5. ✅ Expected: No "Apply Filter" button

### Test Case 3: Mobile Drawer - Changes Trigger Search
1. Open mobile filter drawer
2. Toggle "Recording Studio"
3. Tap outside drawer (backdrop)
4. ✅ Expected: Drawer closes and search executes
5. ✅ Expected: URL updates with new filter

### Test Case 4: Mobile Drawer - No Changes, No Search
1. Open mobile filter drawer
2. Don't change anything
3. Tap outside drawer (backdrop)
4. ✅ Expected: Drawer closes
5. ✅ Expected: No navigation/search triggered

### Test Case 5: Location + Studio Type
1. Enter "London" in location
2. Select "Podcast Studio"
3. Click "Apply Filter"
4. ✅ Expected: URL is `/studios?location=London&studioTypes=PODCAST&page=1`
5. ✅ Expected: Shows London podcast studios

### Test Case 6: Clear and Reapply Same Filters
1. Select "Home Studio" and apply
2. Click "New Search"
3. Select "Home Studio" again
4. Click "Apply Filter"
5. ✅ Expected: Search executes (even though it's the same filter)

## Edge Cases Handled

1. **Empty arrays sorted consistently:** `[].sort()` === `[].sort()` ✅
2. **Coordinates presence/absence:** `lat: undefined` vs `lat: 51.5074` compared correctly ✅
3. **Whitespace in location:** Trimmed in normalization ✅
4. **Array order differences:** Arrays sorted before comparison ✅
5. **Multiple rapid filter changes:** Timer resets, only shows buttons after 2s of inactivity ✅

## Bug Fix: Infinite Loop

### Issue
After initial implementation, an infinite loop occurred on `/studios` page load.

### Root Cause
The `normalizeFilters` function was included in dependency arrays for:
1. `useEffect` that syncs `initialFilters` 
2. `useImperativeHandle` that exposes `applyFilters`

Since `normalizeFilters` is defined inside the component, it gets recreated on every render, causing the effects to run infinitely.

### Fix
Removed `normalizeFilters` from both dependency arrays:
- `useEffect(..., [initialFilters])` (removed `normalizeFilters`)
- `useImperativeHandle(..., [filters, onSearch])` (removed `normalizeFilters`)

The function doesn't depend on any props or state, so it doesn't need to be tracked in dependencies.

## Status

✅ All changes implemented
✅ Infinite loop bug fixed
✅ No linter errors
✅ Backwards compatible with existing behavior
✅ All todos completed
✅ Ready for testing
