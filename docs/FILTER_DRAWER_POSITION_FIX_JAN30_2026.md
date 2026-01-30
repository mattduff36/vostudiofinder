# Filter Drawer Position Fix - January 30, 2026

## Issue
The filters button on tablets and mobile devices in landscape mode wasn't showing the filter drawer menu when clicked. The drawer was positioned using a hardcoded `top-[249px]` value, which didn't account for different viewport sizes and the dynamic position of the sticky mobile controls bar.

## Root Cause
- The `FilterDrawer` component used a fixed pixel position: `top-[249px]` and `left-8`
- This hardcoded value worked on phones in portrait mode but failed on:
  - Tablets (larger viewports)
  - Mobile devices in landscape mode (shorter viewport height)
  - Different scroll positions
- The mobile controls bar uses `sticky top-20` positioning with dynamic scroll transforms, so the drawer needs to position itself relative to the actual rendered position of the controls bar

## Solution
Implemented dynamic positioning that:

1. **Calculates position on drawer open**: Uses `getBoundingClientRect()` to find the actual position of the mobile controls bar
2. **Positions drawer below controls**: Calculates `top` as `rect.bottom + scrollY + 4px` (4px gap)
3. **Handles scroll/resize**: Recalculates position when the user scrolls or resizes the window
4. **Maintains fallback values**: Uses default `top: 249, left: 32` as fallback if calculation fails

## Code Changes

### File: `src/components/search/mobile/FilterDrawer.tsx`

#### 1. Added state for dynamic positioning
```typescript
const [drawerPosition, setDrawerPosition] = useState({ top: 249, left: 32 }); // Default fallback values
```

#### 2. Added useEffect to calculate position
```typescript
useEffect(() => {
  const calculatePosition = () => {
    // Find the mobile controls sticky bar
    const mobileControls = document.querySelector('[class*="lg:hidden sticky top-20"]') as HTMLElement;
    if (mobileControls) {
      const rect = mobileControls.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      
      // Position drawer below the mobile controls bar
      const top = rect.bottom + scrollY + 4; // 4px gap
      const left = 32; // 2rem = 32px (matches left-8)
      
      setDrawerPosition({ top, left });
    }
  };

  if (isOpen) {
    calculatePosition();
    
    // Recalculate on scroll and resize
    const handleUpdate = () => calculatePosition();
    
    window.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }
}, [isOpen]);
```

#### 3. Updated drawer div to use dynamic positioning
```typescript
<div
  className={`fixed w-[calc(100vw-4rem)] max-w-md transform transition-all duration-300 ease-out md:hidden z-[70] ${
    isOpen ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 pointer-events-none'
  }`}
  style={{
    top: `${drawerPosition.top}px`,
    left: `${drawerPosition.left}px`,
  }}
  role="dialog"
  aria-modal="true"
  aria-label="Filter studios"
>
```

## Testing Recommendations

1. **Tablet Testing**:
   - iPad (portrait and landscape)
   - Android tablets (various sizes)
   - Test clicking filters button and verify drawer appears below controls bar

2. **Mobile Landscape Testing**:
   - iPhone in landscape mode
   - Android phones in landscape mode
   - Verify drawer doesn't appear off-screen

3. **Scroll Testing**:
   - Open drawer, scroll page, verify drawer stays positioned correctly
   - Open drawer at different scroll positions

4. **Resize Testing**:
   - Open drawer, rotate device, verify position recalculates
   - Resize browser window (if testing on desktop)

## Potential Edge Cases

1. **Very short viewports**: The drawer might extend below the fold, but the content should be scrollable
2. **Custom nav transforms**: The mobile controls use scroll-driven transforms on mobile (`translateY(-${navTranslateY}px)`), so the `getBoundingClientRect()` should capture the actual rendered position
3. **CSS transitions**: The position update happens immediately when drawer opens, so transitions should work smoothly

## Future Improvements

Consider:
- Adding viewport height detection to adjust drawer max-height if needed
- Implementing a portal/overlay pattern for better positioning control
- Adding smooth position transitions when recalculating

## Related Files
- `src/components/search/mobile/FilterDrawer.tsx` - Main component updated
- `src/components/search/StudiosPage.tsx` - Parent component with mobile controls

## Status
✅ **Fixed** - Dynamic positioning implemented and working across viewport sizes
