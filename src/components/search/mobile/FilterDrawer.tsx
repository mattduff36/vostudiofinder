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
}

export function FilterDrawer({
  isOpen,
  onClose,
  initialFilters,
  onSearch,
  onFilterByMapArea,
  isFilteringByMapArea,
  visibleMarkerCount,
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
        className={`fixed top-[160px] left-4 w-[calc(100vw-2rem)] max-w-md transform transition-all duration-300 ease-out md:hidden z-[70] ${
          isOpen ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95 pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Filter studios"
      >
        <SearchFilters
          ref={filtersRef}
          initialFilters={initialFilters}
          onSearch={onSearch}
          {...(onFilterByMapArea ? { onFilterByMapArea } : {})}
          {...(isFilteringByMapArea !== undefined ? { isFilteringByMapArea } : {})}
          {...(visibleMarkerCount !== undefined ? { visibleMarkerCount } : {})}
        />

        {/* Arrow pointing up to Filters button */}
        <div className="absolute top-[-8px] left-6 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45" />
      </div>
    </>
  );
}
