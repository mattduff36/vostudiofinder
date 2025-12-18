/**
 * FilterDrawer - Mobile Dropdown Box for Search Filters
 * 
 * Compact popup that appears from top-left, similar to MobileMenu style.
 * Contains SearchFilters component with mobile-optimized layout.
 * 
 * Only visible on mobile (< 768px).
 */
'use client';

import { useEffect, useRef } from 'react';
import { Filter } from 'lucide-react';
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

  // Don't prevent body scroll for dropdown (unlike full-screen drawer)

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
      {/* Semi-transparent backdrop for outside clicks */}
      {isOpen && (
        <div
          className="fixed inset-0 md:hidden z-[60]"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-hidden="true"
        />
      )}

      {/* Compact Top-Left Dropdown Box */}
      <div
        className={`fixed top-[180px] left-4 w-[calc(100vw-2rem)] max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 transform transition-all duration-300 ease-out md:hidden z-[70] ${
          isOpen ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95 pointer-events-none'
        }`}
        style={{ maxHeight: 'calc(100vh - 220px)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Filter studios"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-br from-red-50 to-white border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-[#d42027]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(100vh - 380px)' }}>
          <SearchFilters
            ref={filtersRef}
            initialFilters={initialFilters}
            onSearch={onSearch}
            {...(onFilterByMapArea ? { onFilterByMapArea } : {})}
            {...(isFilteringByMapArea !== undefined ? { isFilteringByMapArea } : {})}
            {...(visibleMarkerCount !== undefined ? { visibleMarkerCount } : {})}
          />
        </div>

        {/* Bottom Action Bar */}
        <div className="p-3 bg-white border-t border-gray-100">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyFilters}
              className="flex-1 px-4 py-2.5 bg-[#d42027] text-white font-medium rounded-lg hover:bg-[#a1181d] transition-colors text-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Arrow pointing to Filters button */}
        <div className="absolute top-[-8px] left-6 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45" />
      </div>
    </>
  );
}
