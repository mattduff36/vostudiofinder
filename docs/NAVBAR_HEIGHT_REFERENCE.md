# Navbar Height Reference

**Last Updated**: March 4, 2026  
**Status**: ✅ Verified and Documented

## Correct Navbar Heights

### Desktop (≥ 768px)
- **Height**: 72px
- **Tailwind Class**: `top-[72px]` (custom value)
- **Usage**: Used for sticky positioning of elements below the navbar (e.g., admin tabs)

### Mobile (< 768px)
- **Height**: 72px
- **Tailwind Class**: `top-[72px]` (custom value)
- **Usage**: Used for sticky positioning of elements below the navbar (e.g., admin tabs, mobile navigation calculations)

## Implementation Examples

### Admin Tabs Component
```tsx
// Desktop tabs
<div className="hidden md:block sticky top-[72px] ...">
  {/* Desktop admin tabs */}
</div>

// Mobile tabs
<div className="md:hidden sticky top-[72px] ...">
  {/* Mobile admin tabs */}
</div>
```

### Scroll Animation Hook
```tsx
// In Navbar.tsx
const { translateY: navTranslateY } = useScrollDrivenNav({ 
  navHeight: 72, // Mobile navbar height (4.5rem = 72px)
  scrollThreshold: 3,
  enabled: isMobile
});
```

## Common Mistakes to Avoid

❌ **Incorrect**: Using `top-20` (80px) for desktop - navbar is 72px, not 80px  
❌ **Incorrect**: Using `top-14` (56px) for mobile - navbar is 72px, not 56px  
✅ **Correct**: Use `top-[72px]` for both desktop and mobile

## Related Files

- `src/components/navigation/Navbar.tsx` - Main navbar component
- `src/components/admin/AdminTabs.tsx` - Example of correct sticky positioning
- `src/hooks/useScrollDrivenNav.ts` - Scroll animation hook using navbar height

## Verification

The navbar heights have been verified by:
1. ✅ Code inspection of `Navbar.tsx` component
2. ✅ Verification of `AdminTabs.tsx` sticky positioning values
3. ✅ Cross-reference with actual Tailwind classes used in codebase

---

**Note**: If navbar height changes in the future, update this document and all references to maintain consistency across the codebase.
