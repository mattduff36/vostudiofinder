# Location Filter Enter Key Bug Fix

## Date: January 22, 2026

## Issue: Inconsistent Enter Key Behavior

### Problem
When a user types in the location field and presses Enter while autocomplete suggestions are displayed but no suggestion is selected, the typed value was not passed to the `onEnterKey` callback. This caused the search to execute with the previous location value instead of the newly typed text.

### Root Cause
The `handleKeyDown` function in `EnhancedLocationFilter.tsx` had inconsistent behavior:

**Scenario 1: Dropdown is closed** (lines 414-428)
- User types location
- No suggestions shown (or dropdown closed)
- Presses Enter
- ✅ **Correctly** passes `typedValue` to `onEnterKey(typedValue)`

**Scenario 2: Dropdown is open with no selection** (lines 439-445)
- User types location
- Autocomplete suggestions displayed
- User does NOT select any suggestion
- Presses Enter
- ❌ **Incorrectly** calls `onEnterKey()` without passing the typed value
- Search executes with stale/previous value

### Example User Flow (Before Fix)
1. User searches for "London" → works correctly
2. User changes field to "Manchester" → autocomplete shows suggestions
3. User ignores suggestions and presses Enter
4. **Bug**: Search executes with "London" (previous value) instead of "Manchester"

### Fix Applied

Updated the Enter key handler to pass the typed value when no suggestion is selected:

```typescript
// BEFORE (Bug)
case 'Enter':
  e.preventDefault();
  if (selectedIndex >= 0 && suggestions[selectedIndex]) {
    handleSelect(suggestions[selectedIndex]);
  } else if (onEnterKey) {
    onEnterKey(); // ❌ No typed value passed
  }
  break;

// AFTER (Fixed)
case 'Enter':
  e.preventDefault();
  if (selectedIndex >= 0 && suggestions[selectedIndex]) {
    handleSelect(suggestions[selectedIndex]);
  } else if (onEnterKey) {
    // User pressed Enter without selecting a suggestion - use typed value
    const typedValue = query.trim();
    if (typedValue) {
      onChange(typedValue);
      onEnterKey(typedValue); // ✅ Pass typed value
    } else {
      onEnterKey();
    }
  }
  break;
```

### Behavior After Fix

Now both scenarios work consistently:

**Scenario 1: Dropdown closed + Enter**
- Gets typed value
- Calls `onChange(typedValue)`
- Calls `onEnterKey(typedValue)`
- ✅ Search with correct location

**Scenario 2: Dropdown open + Enter (no selection)**
- Gets typed value
- Calls `onChange(typedValue)`
- Calls `onEnterKey(typedValue)`
- ✅ Search with correct location

**Scenario 3: Dropdown open + Enter (suggestion selected)**
- Calls `handleSelect(suggestion)`
- ✅ Search with selected location

### Files Modified

**`src/components/search/EnhancedLocationFilter.tsx`**
- Lines 439-450: Updated Enter key handler in dropdown open state
- Added logic to extract and pass typed value when no suggestion selected

### Impact

#### User Experience
- ✅ Enter key now consistently uses the typed value
- ✅ Users can ignore autocomplete suggestions and press Enter
- ✅ No more "sticky" previous search values
- ✅ More intuitive and predictable behavior

#### Technical
- ✅ Consistent behavior across all dropdown states
- ✅ Eliminates async state race conditions
- ✅ Matches existing pattern from closed dropdown case

### Testing Verification

**Test Case 1: Type and Enter (No Dropdown)**
1. Type "London" in location field
2. Press Enter immediately (before dropdown opens)
3. ✅ Expected: Search for "London"
4. ✅ Result: Works correctly

**Test Case 2: Type and Enter (Dropdown Open, No Selection)**
1. Type "Manchester" in location field
2. Wait for autocomplete dropdown to appear
3. Do NOT select any suggestion
4. Press Enter
5. ✅ Expected: Search for "Manchester"
6. ✅ Result: NOW FIXED (previously searched with old value)

**Test Case 3: Type and Select Suggestion**
1. Type "Birm" in location field
2. Autocomplete shows "Birmingham, UK"
3. Arrow down to select suggestion
4. Press Enter
5. ✅ Expected: Search for "Birmingham, UK" with coordinates
6. ✅ Result: Works correctly

**Test Case 4: Type, Clear, and Enter**
1. Type "London" and search
2. Clear the field (empty)
3. Press Enter
4. ✅ Expected: No search triggered (empty value)
5. ✅ Result: Works correctly

### Edge Cases Handled

1. **Empty string**: If user clears field and presses Enter, `onEnterKey()` is called without arguments (no search)
2. **Whitespace only**: `query.trim()` removes whitespace, so "   " is treated as empty
3. **Dropdown navigation**: Arrow keys still work to navigate suggestions
4. **Selected suggestion**: Takes priority over typed value (intended behavior)

### Integration Points

This fix affects:
1. **`SearchFilters.tsx`** - Location filter in desktop/mobile search filters
2. **`EnhancedSearchBar.tsx`** - Homepage search bar (if using same component)

Both components use `EnhancedLocationFilter` and will benefit from this fix.

### Related Code Patterns

The fix follows the same pattern already established in the closed dropdown handler (lines 414-428):

```typescript
// Pattern: Extract typed value and pass it along
const typedValue = query.trim();
if (typedValue) {
  onChange(typedValue);
  onEnterKey(typedValue);
} else {
  onEnterKey();
}
```

This pattern is now used in both:
- Closed dropdown state (lines 414-428)
- Open dropdown with no selection (lines 439-450)

### Commit Message

```
Fix: Pass typed location value when Enter pressed with open dropdown

Bug Fix:
- EnhancedLocationFilter now passes typed value to onEnterKey callback
- Fixes issue where Enter key used previous search value instead of typed text
- Affects case when autocomplete dropdown is open but no suggestion selected

Behavior:
- Before: Enter with open dropdown (no selection) → search with stale value
- After: Enter with open dropdown (no selection) → search with typed value

Impact:
- Users can now type location and press Enter to search
- No need to close dropdown or select suggestion first
- Consistent behavior across all dropdown states

Files:
- src/components/search/EnhancedLocationFilter.tsx
```

### Status

✅ Bug verified and fixed
✅ Linter passes
✅ Code follows existing patterns
✅ All scenarios tested
✅ Documentation complete
✅ Ready for commit
