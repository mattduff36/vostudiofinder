/**
 * FilterDrawer - Mobile Bottom Sheet for Search Filters
 * 
 * Slides up from bottom (not full-screen), 75% viewport height.
 * Contains SearchFilters component with mobile-optimized layout.
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 2.
 */
'use client';

import { useEffect, useRef } from 'react';
import { X, Filter } from 'lucide-react';
import { SearchFilters, SearchFiltersRef } from '../SearchFilters';
import { zIndex } from '@/lib/theme';
import { isMobileFeatureEnabled } from '@/lib/feature-flags';

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

  // Phase 2 feature gate
  if (!isMobileFeatureEnabled(2)) {
    return null;
  }

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleApplyFilters = () => {
    // Trigger filters via ref, then close drawer
    if (filtersRef.current) {
      filtersRef.current.applyFilters();
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 md:hidden z-[${zIndex.backdrop}] ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out md:hidden z-[${zIndex.drawer}] ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height: '85vh', maxHeight: '85vh' }}
        role="dialog"
        aria-modal="true"
        aria-label="Filter studios"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 rounded-t-2xl">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-[#d42027]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close filters"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto h-[calc(85vh-140px)] px-4 py-4">
          <SearchFilters
            ref={filtersRef}
            initialFilters={initialFilters}
            onSearch={onSearch}
            {...(onFilterByMapArea ? { onFilterByMapArea } : {})}
            {...(isFilteringByMapArea !== undefined ? { isFilteringByMapArea } : {})}
            {...(visibleMarkerCount !== undefined ? { visibleMarkerCount } : {})}
          />
        </div>

        {/* Bottom Action Bar - Sticky */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyFilters}
              className="flex-1 px-4 py-3 bg-[#d42027] text-white font-medium rounded-lg hover:bg-[#a1181d] transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
