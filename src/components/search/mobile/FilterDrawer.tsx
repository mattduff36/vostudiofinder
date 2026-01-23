/**
 * FilterDrawer - Mobile Dropdown Box for Search Filters
 * 
 * Compact popup that appears from top-left, similar to MobileMenu style.
 * Contains SearchFilters component with mobile-optimized layout.
 * 
 * Only visible on mobile (< 768px).
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { SearchFilters, SearchFiltersRef } from '../SearchFilters';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters: {
    location: string;
    studio_studio_types: string[];
    studio_services: string[];
    sortBy: string;
    sort_order: string;
    radius: number;
    lat?: number;
    lng?: number;
  };
  onSearch: (filters: Record<string, any>) => void;
  onFilterByMapArea?: (() => void) | undefined;
  isFilteringByMapArea?: boolean | undefined;
  visibleMarkerCount?: number | undefined;
  filterByMapAreaMaxMarkers?: number;
  isMapReady?: boolean;
}

export function FilterDrawer({
  isOpen,
  onClose,
  initialFilters,
  onSearch,
  onFilterByMapArea,
  isFilteringByMapArea,
  visibleMarkerCount,
  filterByMapAreaMaxMarkers,
  isMapReady,
}: FilterDrawerProps) {
  const filtersRef = useRef<SearchFiltersRef>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Monitor fullscreen state for hiding filter drawer
  useEffect(() => {
    const checkFullscreen = () => {
      const fullscreen = document.documentElement.hasAttribute('data-map-fullscreen');
      setIsMapFullscreen(fullscreen);
      // Auto-close filter drawer if map goes fullscreen
      if (fullscreen && isOpen) {
        onClose();
      }
    };

    checkFullscreen();

    const observer = new MutationObserver(checkFullscreen);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-map-fullscreen']
    });

    return () => observer.disconnect();
  }, [isOpen, onClose]);

  // Don't prevent body scroll for dropdown (unlike full-screen drawer)

  const handleClose = () => {
    // Apply filters when closing
    if (filtersRef.current) {
      filtersRef.current.applyFilters();
    }
    onClose();
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on scroll (same behavior as backdrop click)
  // BUT: Don't close if an input is focused (keyboard is open)
  useEffect(() => {
    if (!isOpen) return;

    let lastScrollY = window.scrollY;
    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      // Check if any input/textarea is currently focused (keyboard is open)
      const activeElement = document.activeElement;
      const isInputFocused = 
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement;

      // Don't close if:
      // 1. An input is focused (keyboard is open)
      // 2. The scroll amount is very small (< 50px) - likely just keyboard adjustment
      const currentScrollY = window.scrollY;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY);
      
      if (isInputFocused || scrollDelta < 50) {
        // Update last scroll position but don't close
        lastScrollY = currentScrollY;
        return;
      }

      // Clear existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      // Debounce the close action to avoid closing on minor adjustments
      scrollTimeout = setTimeout(() => {
        if (isOpen) {
          handleClose();
        }
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render if map is in fullscreen mode
  if (isMapFullscreen) {
    return null;
  }

  return (
    <>
      {/* Semi-transparent backdrop for outside clicks */}
      {isOpen && (
        <div
          className="fixed inset-0 md:hidden z-[60]"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          aria-hidden="true"
        />
      )}

      {/* Compact Filter Dropdown */}
      <div
        className={`fixed top-[249px] left-8 w-[calc(100vw-4rem)] max-w-md transform transition-all duration-300 ease-out md:hidden z-[70] ${
          isOpen ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Filter studios"
      >
        <SearchFilters
          ref={filtersRef}
          initialFilters={initialFilters}
          onSearch={onSearch}
          onApplyFilter={onClose}
          isMobileModalOpen={isOpen}
          {...(onFilterByMapArea ? { onFilterByMapArea } : {})}
          {...(isFilteringByMapArea !== undefined ? { isFilteringByMapArea } : {})}
          {...(visibleMarkerCount !== undefined ? { visibleMarkerCount } : {})}
          {...(filterByMapAreaMaxMarkers !== undefined ? { filterByMapAreaMaxMarkers } : {})}
          {...(isMapReady !== undefined ? { isMapReady } : {})}
        />

        {/* Arrow pointing up to Filters button */}
        <div className="absolute top-[-8px] left-2 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45" />
      </div>
    </>
  );
}
