'use client';
import { logger } from '@/lib/logger';

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/Button';

import { EnhancedLocationFilter } from './EnhancedLocationFilter';
import { studio_type } from '@/types/prisma';

interface SearchFiltersProps {
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
  onFilterByMapArea?: () => void;
  isFilteringByMapArea?: boolean;
  visibleMarkerCount?: number;
  filterByMapAreaMaxMarkers?: number;
  isMapReady?: boolean;
  onApplyFilter?: () => void; // Optional callback for when Apply Filter is clicked (e.g., to close mobile modal)
  isMobileModalOpen?: boolean; // Track if mobile filter modal is open
  studioTypeCounts?: Record<string, number>; // Count of studios for each type in the current search area
}

export interface SearchFiltersRef {
  applyFilters: () => void;
}

export const SearchFilters = forwardRef<SearchFiltersRef, SearchFiltersProps>(function SearchFilters({ initialFilters, onSearch, onFilterByMapArea, isFilteringByMapArea, visibleMarkerCount, filterByMapAreaMaxMarkers = 30, isMapReady = true, onApplyFilter, isMobileModalOpen, studioTypeCounts = {} }, ref) {
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

  // Studio types are unchecked by default - users must select what they want
  const filtersWithDefaults = {
    ...initialFilters,
    studio_studio_types: initialFilters.studio_studio_types || []
  };
  
  const [filters, setFilters] = useState(filtersWithDefaults);
  const [showActionButtons, setShowActionButtons] = useState(false);
  const radiusDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAppliedRef = useRef(normalizeFilters(filtersWithDefaults));
  
  // Derive hasPendingChanges from real comparison
  const hasPendingChanges = JSON.stringify(normalizeFilters(filters)) !== JSON.stringify(lastAppliedRef.current);

  // Expose applyFilters method to parent component via ref
  // Used when mobile drawer closes (backdrop/scroll/Escape)
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
  }), [filters, onSearch]); // normalizeFilters is stable, doesn't need to be in deps

  useEffect(() => {
    logger.log('Updating filters with initialFilters:', initialFilters);
    // Studio types are unchecked by default - users must select what they want
    const updatedFilters = {
      ...initialFilters,
      studio_studio_types: initialFilters.studio_studio_types || []
    };
    setFilters(updatedFilters);
    // Update last applied filters (this represents the current search state from URL)
    lastAppliedRef.current = normalizeFilters(updatedFilters);
    setShowActionButtons(false);
  }, [initialFilters]); // normalizeFilters is stable, doesn't need to be in deps

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (radiusDebounceRef.current) {
        clearTimeout(radiusDebounceRef.current);
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  // Show action buttons immediately (no delay)
  const startInactivityTimer = () => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Show buttons immediately (0ms delay)
    inactivityTimerRef.current = setTimeout(() => {
      logger.log('⏰ Showing action buttons immediately');
      setShowActionButtons(true);
    }, 0);
  };

  const handleFilterChange = (key: string, value: any) => {
    logger.log(`HandleFilterChange called - key: ${key}, value: ${value}`);
    logger.log('Current filters state:', filters);
    
    const newFilters = { ...filters, [key]: value };
    
    // Always preserve coordinates if they exist (except when explicitly changing location without coordinates)
    if (filters.lat && filters.lng) {
      newFilters.lat = filters.lat;
      newFilters.lng = filters.lng;
      logger.log('Preserving coordinates:', { lat: filters.lat, lng: filters.lng });
    } else {
      logger.log('No coordinates to preserve - filters.lat:', filters.lat, 'filters.lng:', filters.lng);
    }
    
    logger.log('Final newFilters being sent to onSearch:', newFilters);
    
    setFilters(newFilters);
    
    // RULE: Only trigger search if there's a location (except for location changes themselves)
    if (key === 'location' || (newFilters.location && newFilters.location.trim() !== '')) {
      logger.log('✅ Triggering search - location exists or location is being changed');
      onSearch(newFilters);
    } else {
      logger.log('🚫 Skipping search - no location provided');
    }
  };

  // Disabled for now - not currently used in the UI
  // const handleServiceToggle = (service: string) => {
  //   const currentServices = filters.studio_services || [];
  //   const updatedServices = currentServices.includes(service)
  //     ? currentServices.filter(s => s !== service)
  //     : [...currentServices, service];
  //   
  //   const newFilters = { ...filters, studio_services: updatedServices };
  //   
  //   // Preserve coordinates if they exist
  //   if (filters.lat && filters.lng) {
  //     newFilters.lat = filters.lat;
  //     newFilters.lng = filters.lng;
  //   }
  //   
  //   setFilters(newFilters);
  //   
  //   // RULE: Only trigger search if there's a location
  //   if (newFilters.location && newFilters.location.trim() !== '') {
  //     logger.log('✅ Service toggle triggering search - location exists');
  //     onSearch(newFilters);
  //   } else {
  //     logger.log('🚫 Service toggle skipping search - no location provided');
  //   }
  // };



  const clearFilters = () => {
    const clearedFilters = {
      location: '',
      studio_studio_types: [],
      studio_services: [],
      sortBy: 'name',
      sort_order: 'asc',
      radius: 10, // Default radius is 10 miles
      // Clear coordinates to remove the radius circle from the map - omit lat/lng properties
    };
    setFilters(clearedFilters);
    onSearch(clearedFilters);
  };

  const studioTypeOptions = [
    { value: studio_type.HOME, label: 'Home', fullLabel: 'Home Studio' },
    { value: studio_type.RECORDING, label: 'Recording', fullLabel: 'Recording Studio' },
    { value: studio_type.PODCAST, label: 'Podcast', fullLabel: 'Podcast Studio' },
    { value: studio_type.VOICEOVER, label: 'Voiceover', fullLabel: 'Voiceover Artist' },
    { value: studio_type.AUDIO_PRODUCER, label: 'Audio Producer', fullLabel: 'Audio Producer' },
    { value: studio_type.VO_COACH, label: 'VO Coach', fullLabel: 'VO Coach' },
  ];

  // Disabled for now - not currently used in the UI
  // const serviceOptions = [
  //   { value: ServiceType.SOURCE_CONNECT, label: 'Source Connect' },
  //   { value: ServiceType.SOURCE_CONNECT_NOW, label: 'Source Connect Now' },
  //   { value: ServiceType.CLEANFEED, label: 'Cleanfeed' },
  //   { value: ServiceType.SESSION_LINK_PRO, label: 'Session Link Pro' },
  //   { value: ServiceType.ZOOM, label: 'Zoom' },
  //   { value: ServiceType.TEAMS, label: 'Microsoft Teams' },
  // ];

  const hasActiveFilters = filters.location || filters.studio_studio_types.length > 0 || filters.studio_services.length > 0 || filters.radius !== 10;

  const handleStudioTypeToggle = (studio_type: string) => {
    const currentTypes = filters.studio_studio_types || [];
    const updatedTypes = currentTypes.includes(studio_type)
      ? currentTypes.filter(type => type !== studio_type)
      : [...currentTypes, studio_type];
    
    const newFilters = { ...filters, studio_studio_types: updatedTypes };
    
    // Preserve coordinates if they exist
    if (filters.lat && filters.lng) {
      newFilters.lat = filters.lat;
      newFilters.lng = filters.lng;
    }
    
    setFilters(newFilters);
    
    // Both mobile and desktop: show buttons immediately (no auto-search)
    // hasPendingChanges will be derived from comparison automatically
    setShowActionButtons(false); // Hide buttons immediately, will show instantly
    startInactivityTimer();
    logger.log('Studio type toggled - buttons will appear immediately');
  };

  // Helper function to detect if device is mobile
  const isMobileDevice = () => {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  };

  // Trigger timer when mobile modal opens with existing filters
  useEffect(() => {
    if (isMobileModalOpen && hasActiveFilters && !hasPendingChanges) {
      logger.log('📱 Mobile modal opened with existing filters - starting timer');
      setShowActionButtons(false);
      startInactivityTimer();
    }
  }, [isMobileModalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle click inside filter box (desktop) - trigger timer if filters exist
  const handleFilterBoxClick = () => {
    if (!isMobileDevice() && hasActiveFilters && !hasPendingChanges && !showActionButtons) {
      logger.log('🖱️ Desktop filter box clicked with existing filters - starting timer');
      startInactivityTimer();
    }
  };

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 shadow-lg px-4 lg:px-6 py-2 lg:py-3 space-y-4 lg:space-y-6"
      onClick={handleFilterBoxClick}
    >
      {/* Location */}
      <div>
        <label className="hidden lg:block text-sm font-medium text-black mb-2">
          Filter by:
        </label>
        <div className="space-y-2">
          <EnhancedLocationFilter
            value={filters.location}
            onChange={(value, placeDetails) => {
              // Update the location value in state
              const newFilters = { ...filters, location: value };
              
              // If this is a selection from the dropdown (placeDetails exists), 
              // extract coordinates and add them to the filters
              if (placeDetails && placeDetails.geometry?.location) {
                const lat = typeof placeDetails.geometry.location.lat === 'function' 
                  ? placeDetails.geometry.location.lat() 
                  : placeDetails.geometry.location.lat;
                const lng = typeof placeDetails.geometry.location.lng === 'function' 
                  ? placeDetails.geometry.location.lng() 
                  : placeDetails.geometry.location.lng;
                
                newFilters.lat = lat;
                newFilters.lng = lng;
                
                logger.log('Location selected - coordinates extracted:', { lat, lng });
                logger.log('New filters with coordinates:', newFilters);
                
                // Set state but don't auto-search - user must click Apply Filter or press Enter
                setFilters(newFilters);
                // Start timer - hasPendingChanges will be derived from comparison
                setShowActionButtons(false);
                startInactivityTimer();
              } else {
                logger.log('Just typing location, no coordinates - not searching yet');
                // Just typing, update state but don't search until Enter/button pressed
                setFilters(newFilters);
              }
            }}
            onEnterKey={(typedValue) => {
              // Trigger search when Enter is pressed
              // typedValue is passed from the input component to avoid async state issues
              const newFilters = { ...filters };
              
              // If a typed value was passed, use it (user pressed Enter without selecting autocomplete)
              if (typedValue) {
                newFilters.location = typedValue;
                // Clear coordinates since this is a text-based search
                // Backend will use fallback coordinates or text search
                delete newFilters.lat;
                delete newFilters.lng;
                logger.log('Enter pressed with typed value:', typedValue);
              } else if (filters.lat && filters.lng) {
                // If we have coordinates from a previous autocomplete selection, keep them
                newFilters.lat = filters.lat;
                newFilters.lng = filters.lng;
                logger.log('Enter pressed with existing coordinates:', { lat: filters.lat, lng: filters.lng });
              }
              
              logger.log('Triggering search with filters:', newFilters);
              onSearch(newFilters);
            }}
            placeholder="Search..."
          />
          
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Search Radius: {filters.radius} miles
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={(() => {
                // Convert radius to slider position (0-100)
                if (filters.radius <= 5) return ((filters.radius - 1) / 4) * 25; // 1-5 maps to 0-25%
                if (filters.radius <= 10) return 25 + ((filters.radius - 5) / 5) * 25; // 5-10 maps to 25-50%
                if (filters.radius <= 25) return 50 + ((filters.radius - 10) / 15) * 25; // 10-25 maps to 50-75%
                return 75 + ((filters.radius - 25) / 25) * 25; // 25-50 maps to 75-100%
              })()}
              onChange={(e) => {
                const sliderValue = parseInt(e.target.value);
                let newRadius;
                
                // Convert slider position (0-100) to radius
                if (sliderValue <= 25) {
                  newRadius = Math.round(1 + (sliderValue / 25) * 4); // 0-25% maps to 1-5
                } else if (sliderValue <= 50) {
                  newRadius = Math.round(5 + ((sliderValue - 25) / 25) * 5); // 25-50% maps to 5-10
                } else if (sliderValue <= 75) {
                  newRadius = Math.round(10 + ((sliderValue - 50) / 25) * 15); // 50-75% maps to 10-25
                } else {
                  newRadius = Math.round(25 + ((sliderValue - 75) / 25) * 25); // 75-100% maps to 25-50
                }
                
                // Update radius immediately for UI feedback
                setFilters({ ...filters, radius: newRadius });
                
                // On mobile: only update the state, don't trigger search
                // User will trigger search by clicking "Apply" button in modal
                const isMobile = isMobileDevice();
                
                if (isMobile) {
                  logger.log(`Mobile: Radius changed to ${newRadius} - waiting for user to click Apply`);
                  // Start timer - hasPendingChanges will be derived from comparison
                  setShowActionButtons(false);
                  startInactivityTimer();
                  // Clear any existing timeout to prevent accidental search
                  if (radiusDebounceRef.current) {
                    clearTimeout(radiusDebounceRef.current);
                  }
                  return; // Exit early - don't trigger search
                }
                
                // Desktop: Debounce the search with 1000ms delay (increased from 500ms)
                if (radiusDebounceRef.current) {
                  clearTimeout(radiusDebounceRef.current);
                }
                
                const delay = 1000;
                logger.log(`Desktop: Radius changed to ${newRadius} - will trigger search after ${delay}ms`);
                
                radiusDebounceRef.current = setTimeout(() => {
                  logger.log(`Radius search triggered after ${delay}ms delay: ${newRadius} miles`);
                  // Auto-search for radius on desktop (no pending changes needed)
                  handleFilterChange('radius', newRadius);
                }, delay);
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #d42027 0%, #d42027 ${(() => {
                  // Convert radius to percentage for visual progress bar
                  if (filters.radius <= 5) return ((filters.radius - 1) / 4) * 25;
                  if (filters.radius <= 10) return 25 + ((filters.radius - 5) / 5) * 25;
                  if (filters.radius <= 25) return 50 + ((filters.radius - 10) / 15) * 25;
                  return 75 + ((filters.radius - 25) / 25) * 25;
                })()}%, #e5e7eb ${(() => {
                  if (filters.radius <= 5) return ((filters.radius - 1) / 4) * 25;
                  if (filters.radius <= 10) return 25 + ((filters.radius - 5) / 5) * 25;
                  if (filters.radius <= 25) return 50 + ((filters.radius - 10) / 15) * 25;
                  return 75 + ((filters.radius - 25) / 25) * 25;
                })()}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1mi</span>
              <span>5mi</span>
              <span>10mi</span>
              <span>25mi</span>
              <span>50mi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Studio Types / Services */}
      <div>
        <label className="block text-sm font-medium text-black mb-2">
          Studio Type / Service
        </label>
        {/* Mobile: Compact toggle buttons with wrapping */}
        <div className="flex flex-wrap gap-2 lg:hidden">
          {studioTypeOptions.map(option => {
            const isSelected = filters.studio_studio_types.includes(option.value);
            const count = studioTypeCounts[option.value] || 0;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleStudioTypeToggle(option.value)}
                className={`px-3 py-2.5 rounded-lg border-2 transition-all text-sm font-medium flex items-center justify-between ${
                  isSelected
                    ? 'border-red-600 bg-red-50 text-red-600'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 active:bg-gray-50'
                }`}
                style={{ minWidth: 'calc(50% - 4px)' }}
              >
                <span>{option.label}</span>
                <span className="ml-2 text-xs font-semibold text-[#d42027] bg-white px-1.5 py-0.5 rounded">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {/* Desktop: Original checkbox style with result counts */}
        <div className="hidden lg:block space-y-2">
          {studioTypeOptions.map(option => {
            const count = studioTypeCounts[option.value] || 0;
            return (
              <label
                key={option.value}
                className="flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.studio_studio_types.includes(option.value)}
                    onChange={() => handleStudioTypeToggle(option.value)}
                    className="rounded"
                  />
                  <span className="text-sm text-black">{option.fullLabel}</span>
                </div>
                <span className="text-sm text-gray-500 font-medium">{count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Filter by Map Area - Always show on desktop but disable when unusable */}
      {onFilterByMapArea && (
        <div className="hidden lg:block">
          {(() => {
            const isOverLimit = (visibleMarkerCount ?? 0) > filterByMapAreaMaxMarkers;
            const isDisabled = !isFilteringByMapArea && (!isMapReady || isOverLimit);
            
            let tooltipText = '';
            if (isDisabled) {
              if (!isMapReady) {
                tooltipText = 'Wait for the map to finish loading to enable.';
              } else if (isOverLimit) {
                tooltipText = `Refine your search to ${filterByMapAreaMaxMarkers} studios or less to enable.`;
              }
            }
            
            return (
              <span title={tooltipText} className="block">
                <Button
                  onClick={onFilterByMapArea}
                  variant={isFilteringByMapArea ? "primary" : "outline"}
                  className="w-full"
                  size="sm"
                  disabled={isDisabled}
                >
                  {isFilteringByMapArea ? '✓ Filtering by Map Area' : 'Filter by Map Area'}
                </Button>
              </span>
            );
          })()}
          {isFilteringByMapArea && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Showing {visibleMarkerCount || 0} studios visible on map
            </p>
          )}
        </div>
      )}

      {/* Apply Filter + New Search Buttons - Show immediately when pending changes exist */}
      {showActionButtons && hasPendingChanges && (
        <>
          {/* Subtle divider */}
          <div className="border-t border-gray-200 my-4" />
          <div className="flex gap-2 lg:gap-2">
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
              variant="primary"
              className="flex-1"
              size="sm"
            >
              Apply Filter
            </Button>
            <Button
              onClick={clearFilters}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              New Search
            </Button>
          </div>
        </>
      )}

      {/* New Search Button - Show when filters active but no pending changes */}
      {showActionButtons && !hasPendingChanges && hasActiveFilters && (
        <>
          {/* Subtle divider */}
          <div className="border-t border-gray-200 my-4" />
          <Button
            onClick={clearFilters}
            variant="outline"
            className="w-full"
            size="sm"
          >
            New Search
          </Button>
        </>
      )}

    </div>
  );
});
