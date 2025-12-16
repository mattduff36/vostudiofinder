# Mobile Overhaul - Implementation Plan
**Version:** 1.0  
**Date:** December 16, 2025  
**Based on:** MOBILE_OVERHAUL_PRD.md

---

## Overview

This document provides concrete, file-level implementation instructions for the mobile overhaul. Each phase includes:
- Exact files to create/modify
- Code patterns to use
- Acceptance criteria
- Testing requirements
- Complexity estimates

**Absolute Rule:** Every change must be isolated to `< 768px` (mobile) breakpoint. Desktop must remain pixel-identical.

---

## Phase 1: Mobile Navigation Shell & Footer Compaction
**Timeline:** Days 1-4  
**Complexity:** MEDIUM  
**Risk:** LOW (isolated components)

### Goal
Establish mobile-only navigation primitives and compact the footer without affecting desktop.

### Tasks

#### Task 1.1: Create `useIsMobile()` Hook
**File:** `src/hooks/useIsMobile.ts` (CREATE)

```typescript
'use client';

import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

// Server-side safe check
export function isMobileSSR(userAgent?: string): boolean {
  if (!userAgent) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}
```

**Testing:**
- Returns `true` on window width < 768px
- Returns `false` on window width >= 768px
- Updates on window resize
- No console errors

---

#### Task 1.2: Create Bottom Navigation Component
**File:** `src/components/navigation/BottomNav.tsx` (CREATE)

```typescript
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu } from 'lucide-react';
import { Session } from 'next-auth';
import { colors } from '../home/HomePage';

interface BottomNavProps {
  session: Session | null;
  onMenuClick?: () => void;
}

export function BottomNav({ session, onMenuClick }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { 
      icon: Home, 
      label: 'Home', 
      path: '/', 
      show: true 
    },
    { 
      icon: Search, 
      label: 'Search', 
      path: '/studios', 
      show: true 
    },
    { 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      path: '/dashboard', 
      show: !!session 
    },
    { 
      icon: Menu, 
      label: 'More', 
      action: onMenuClick, 
      show: true 
    },
  ].filter(item => item.show);

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom"
      style={{ 
        height: '60px',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
      }}
    >
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.label}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else if (item.path) {
                  router.push(item.path);
                }
              }}
              className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon 
                size={24} 
                strokeWidth={active ? 2.5 : 2}
                style={{ 
                  color: active ? colors.primary : '#6B7280',
                  marginBottom: '2px'
                }}
              />
              <span 
                className="text-xs font-medium"
                style={{ 
                  color: active ? colors.primary : '#6B7280'
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

**Testing:**
- Shows only on mobile (< 768px)
- All 4 icons visible and tappable
- Active state highlights current page
- Tap targets ≥ 48x48px
- Safe area padding on iPhone notch

---

#### Task 1.3: Create Mobile Menu Drawer
**File:** `src/components/navigation/MobileMenu.tsx` (CREATE)

```typescript
'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { colors } from '../home/HomePage';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
}

export function MobileMenu({ isOpen, onClose, session }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="md:hidden fixed inset-0 bg-black/50 z-[60]"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div 
        className="md:hidden fixed top-0 right-0 bottom-0 w-[80%] max-w-[320px] bg-white z-[70] shadow-2xl overflow-y-auto"
        role="dialog"
        aria-label="Mobile menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-4 space-y-1">
          {session ? (
            <>
              <div className="px-3 py-2 text-sm text-gray-500">
                Welcome, {session.user.display_name}
              </div>
              
              <Link
                href="/dashboard"
                onClick={onClose}
                className="block px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Dashboard
              </Link>

              <Link
                href="/about"
                onClick={onClose}
                className="block px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                About
              </Link>

              <Link
                href="/help"
                onClick={onClose}
                className="block px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Help Centre
              </Link>

              <div className="border-t my-2" />

              <Link
                href="/privacy"
                onClick={onClose}
                className="block px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                Privacy Policy
              </Link>

              <Link
                href="/terms"
                onClick={onClose}
                className="block px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                Terms of Service
              </Link>

              <div className="border-t my-2" />

              <button
                onClick={() => {
                  onClose();
                  signOut({ callbackUrl: '/' });
                }}
                className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors text-red-600 font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                onClick={onClose}
                className="block px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Sign In
              </Link>

              <Link
                href="/auth/signup"
                onClick={onClose}
                className="block px-3 py-3 rounded-lg text-white font-medium transition-colors"
                style={{ backgroundColor: colors.primary }}
              >
                List Your Studio
              </Link>

              <div className="border-t my-2" />

              <Link
                href="/about"
                onClick={onClose}
                className="block px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                About
              </Link>

              <Link
                href="/help"
                onClick={onClose}
                className="block px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Help Centre
              </Link>

              <div className="border-t my-2" />

              <Link
                href="/privacy"
                onClick={onClose}
                className="block px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                Privacy Policy
              </Link>

              <Link
                href="/terms"
                onClick={onClose}
                className="block px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                Terms of Service
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
```

**Testing:**
- Slides in from right (80% width)
- Backdrop dismisses menu
- Close button works
- All links functional
- Scrollable if content overflows

---

#### Task 1.4: Create Mobile Footer Component
**File:** `src/components/footer/MobileFooter.tsx` (CREATE)

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

export function MobileFooter() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <footer className="md:hidden w-full bg-black text-white">
      {/* Collapsed State */}
      {!isExpanded && (
        <div className="px-4 py-4">
          <div className="flex flex-col items-center space-y-3">
            <div className="text-xs text-gray-400 text-center">
              © 2025 VoiceoverStudioFinder
            </div>
            
            <div className="flex items-center space-x-4 text-xs">
              <Link 
                href="/privacy" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Privacy
              </Link>
              <span className="text-gray-600">•</span>
              <Link 
                href="/terms" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Terms
              </Link>
            </div>

            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors py-2"
            >
              <span>Show More</span>
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Expanded State */}
      {isExpanded && (
        <div className="px-4 py-6">
          <div className="space-y-4">
            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/studios" className="hover:text-white transition-colors">
                    Browse Studios
                  </Link>
                </li>
                <li>
                  <Link href="/auth/signup" className="hover:text-white transition-colors">
                    List Your Studio
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/help" className="hover:text-white transition-colors">
                    Help Centre
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Follow Us</h4>
              <div className="flex items-center space-x-4">
                <a 
                  href="https://twitter.com/VOStudioFinder" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="X (formerly Twitter)"
                >
                  <X className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Legal */}
            <div className="pt-4 border-t border-gray-800">
              <div className="text-xs text-gray-400 text-center mb-3">
                © 2025 VoiceoverStudioFinder
              </div>
              <div className="flex justify-center items-center space-x-4 text-xs">
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <span className="text-gray-600">•</span>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </div>
            </div>

            {/* Collapse Button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="w-full flex items-center justify-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors py-2"
            >
              <span>Show Less</span>
              <ChevronUp size={16} />
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}
```

**Testing:**
- Collapsed by default (~100px height)
- Expands to ~300px when clicked
- All links work
- Smooth transition
- Only shows on mobile

---

#### Task 1.5: Update Root Layout to Include Bottom Nav
**File:** `src/app/layout.tsx` (MODIFY)

**Changes:**
```typescript
// Add imports
import { BottomNav } from '@/components/navigation/BottomNav';
import { useIsMobile } from '@/hooks/useIsMobile';

// Inside the layout component, add before closing body tag:
<ClientBottomNav session={session} />

// Create a client component wrapper:
'use client';
function ClientBottomNav({ session }: { session: Session | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  
  return (
    <>
      <BottomNav session={session} onMenuClick={() => setMenuOpen(true)} />
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} session={session} />
    </>
  );
}
```

**Testing:**
- Bottom nav appears on mobile pages
- Menu opens when "More" clicked
- Desktop unaffected

---

#### Task 1.6: Update Footer to Conditionally Render Mobile Version
**File:** `src/components/home/Footer.tsx` (MODIFY)

**Changes:**
```typescript
// Add imports
import { MobileFooter } from '@/components/footer/MobileFooter';

// Replace entire return statement with:
export function Footer() {
  return (
    <>
      {/* Desktop Footer (hidden on mobile) */}
      <footer className="hidden md:block w-full max-w-full overflow-x-hidden" style={{ backgroundColor: '#000000', color: '#ffffff' }}>
        {/* Existing desktop footer code stays here */}
      </footer>

      {/* Mobile Footer (hidden on desktop) */}
      <MobileFooter />
    </>
  );
}
```

**Testing:**
- Mobile shows collapsed footer
- Desktop shows full footer
- No layout shift

---

### Acceptance Criteria for Phase 1

- [ ] Bottom nav appears on all mobile pages (< 768px)
- [ ] Bottom nav icons: Home, Search, Dashboard (logged in), More
- [ ] Active state highlights current page
- [ ] Tap targets ≥ 48x48px
- [ ] Menu drawer slides in from right
- [ ] Menu drawer backdrop dismisses
- [ ] Footer collapses to ~100px on mobile
- [ ] Footer expands to ~300px when clicked
- [ ] Desktop footer unchanged
- [ ] Desktop navigation unchanged
- [ ] No horizontal scroll on any device
- [ ] No console errors
- [ ] All links functional

### Rollout Plan

1. Deploy behind feature flag: `ENABLE_MOBILE_NAV_V2`
2. Enable for 10% of mobile users
3. Monitor metrics for 48 hours:
   - Engagement rate
   - Bounce rate
   - Navigation clicks
4. If metrics positive, scale to 50%
5. After 1 week, scale to 100%

---

## Phase 2: Studios Page Mobile Rebuild
**Timeline:** Days 5-10  
**Complexity:** HIGH  
**Risk:** MEDIUM (complex state management)

### Goal
Rebuild /studios page with bottom-sheet filters, collapsible map, and optimized card layout.

### Tasks

#### Task 2.1: Create Filter Drawer Component
**File:** `src/components/search/mobile/FilterDrawer.tsx` (CREATE)

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { SearchFiltersRef } from '../SearchFilters';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  children: React.ReactNode;
}

export function FilterDrawer({ isOpen, onClose, onApply, children }: FilterDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  // Handle swipe-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (currentY - startY > 100) { // Swiped down more than 100px
      onClose();
    }
    setStartY(0);
    setCurrentY(0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="md:hidden fixed inset-0 bg-black/50 z-[60]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[70] shadow-2xl"
        style={{
          height: '75vh',
          maxHeight: '75vh'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close filters"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="overflow-y-auto px-4 py-4" style={{ height: 'calc(75vh - 140px)' }}>
          {children}
        </div>

        {/* Footer (Sticky) */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center space-x-3 px-4 py-4 border-t bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onApply();
              onClose();
            }}
            className="flex-1 py-3 rounded-lg font-medium text-white transition-colors"
            style={{ backgroundColor: '#d42027' }}
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}
```

**Testing:**
- Slides up from bottom (75% height)
- Backdrop dismisses drawer
- Swipe down to dismiss
- Drag handle visual feedback
- Apply button triggers search
- Cancel button closes without applying

---

#### Task 2.2: Create Collapsible Map Component
**File:** `src/components/search/mobile/MapCollapsible.tsx` (CREATE)

```typescript
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { GoogleMap } from '@/components/maps/GoogleMap';

interface MapCollapsibleProps {
  markers: any[];
  center: { lat: number; lng: number };
  zoom: number;
  searchCenter: { lat: number; lng: number } | null;
  searchRadius: number;
  onMarkerClick: (data: any, event: any) => void;
  onBoundsChanged: (bounds: any) => void;
}

export function MapCollapsible({
  markers,
  center,
  zoom,
  searchCenter,
  searchRadius,
  onMarkerClick,
  onBoundsChanged
}: MapCollapsibleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="md:hidden bg-white border-b">
      {/* Collapsed State */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium text-gray-900">
              Show Map
            </div>
            <div className="text-xs text-gray-500">
              ({markers.length} studios)
            </div>
          </div>
          <ChevronDown size={20} className="text-gray-400" />
        </button>
      )}

      {/* Expanded State */}
      {isExpanded && (
        <div>
          {/* Map Container */}
          <div style={{ height: '240px' }}>
            <GoogleMap
              center={center}
              zoom={zoom}
              markers={markers}
              searchCenter={searchCenter}
              searchRadius={searchRadius}
              onBoundsChanged={onBoundsChanged}
              height="240px"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between px-4 py-2 border-t">
            <button
              onClick={() => setIsExpanded(false)}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronUp size={16} />
              <span>Minimize Map</span>
            </button>
            
            <button
              onClick={() => {
                // Navigate to full-screen map (future enhancement)
                console.log('Full-screen map');
              }}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Maximize2 size={16} />
              <span>Full Screen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Testing:**
- Collapsed by default (60px bar)
- Expands to 240px + controls
- Map functional when expanded
- Markers clickable
- Minimize button works

---

#### Task 2.3: Update StudiosPage for Mobile Layout
**File:** `src/components/search/StudiosPage.tsx` (MODIFY lines 82, 392-798)

**Changes:**
```typescript
// Add imports
import { useIsMobile } from '@/hooks/useIsMobile';
import { FilterDrawer } from './mobile/FilterDrawer';
import { MapCollapsible } from './mobile/MapCollapsible';

// Inside component:
const isMobile = useIsMobile();

// Replace mobile filter modal (lines 731-798) with:
{isMobile && showMobileFilters && (
  <FilterDrawer
    isOpen={showMobileFilters}
    onClose={() => setShowMobileFilters(false)}
    onApply={() => {
      mobileFiltersRef.current?.applyFilters();
    }}
  >
    <SearchFilters
      ref={mobileFiltersRef}
      initialFilters={mobileFiltersInitialState}
      onSearch={(filters) => {
        handleSearch(filters);
      }}
    />
  </FilterDrawer>
)}

// Replace mobile controls (lines 676-729) with:
{isMobile && (
  <div className="sticky top-20 z-30 bg-white border-b border-gray-200">
    {/* Filter Button */}
    <div className="px-4 py-3">
      <button
        onClick={() => setShowMobileFilters(true)}
        className="w-full flex items-center justify-center py-3 bg-white border-2 border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
        </svg>
        Filters
        {getActiveFilterCount() > 0 && (
          <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {getActiveFilterCount()}
          </span>
        )}
      </button>
    </div>
    
    {/* Collapsible Map */}
    <MapCollapsible
      markers={memoizedMarkers}
      center={searchResults.searchCoordinates || { lat: 20, lng: 0 }}
      zoom={searchResults.searchCoordinates ? 10 : 2}
      searchCenter={searchResults.searchCoordinates || null}
      searchRadius={parseInt(searchParams.get('radius') || '10')}
      onMarkerClick={handleMarkerClick}
      onBoundsChanged={handleBoundsChanged}
    />
  </div>
)}
```

**Testing:**
- Filter button opens drawer (not modal)
- Map collapsed by default
- Map expands inline
- Desktop layout unchanged

---

### Acceptance Criteria for Phase 2

- [ ] Filter drawer slides up (not full-screen modal)
- [ ] Filter drawer 75% viewport height
- [ ] Swipe down to dismiss drawer works
- [ ] Apply button closes drawer and triggers search
- [ ] Map collapsed to 60px bar by default
- [ ] Map expands to 240px when clicked
- [ ] Map markers clickable when expanded
- [ ] Filter chips show active filter count
- [ ] Studio cards optimized for mobile
- [ ] Desktop sidebar layout unchanged
- [ ] Desktop map full height unchanged

---

## Phase 3: Profile Pages Mobile (Week 4)
_Implementation details continue..._

## Phase 4: Dashboard Mobile (Week 5)
_Implementation details continue..._

## Phase 5: Polish & Accessibility (Week 6)
_Implementation details continue..._

---

## Critical Implementation Notes

### Mobile-Only CSS Pattern

```css
/* In component or globals.css */
@media (max-width: 767px) {
  .mobile-only-class {
    /* Mobile styles */
  }
}

/* OR use Tailwind */
.class-name {
  @apply hidden md:block; /* Desktop only */
}

.mobile-class {
  @apply block md:hidden; /* Mobile only */
}
```

### Feature Flag Pattern

```typescript
// In environment or config
const ENABLE_MOBILE_NAV_V2 = process.env.NEXT_PUBLIC_ENABLE_MOBILE_NAV === 'true';

// In component
{ENABLE_MOBILE_NAV_V2 && <BottomNav />}
```

### Testing Checklist for Every PR

- [ ] Desktop unchanged (visual regression)
- [ ] Mobile devices tested (360px, 390px, 412px, 430px)
- [ ] iOS Safari + Android Chrome
- [ ] No horizontal scroll
- [ ] Tap targets ≥ 48x48px
- [ ] No console errors
- [ ] Lighthouse mobile score ≥ 85

---

**END OF IMPLEMENTATION PLAN**

_Detailed Phase 3-5 implementation available upon Phase 1-2 completion and approval._
