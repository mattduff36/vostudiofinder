'use client';
import { logger } from '@/lib/logger';

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/Button';

import { X } from 'lucide-react';
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
}

export interface SearchFiltersRef {
  applyFilters: () => void;
}

export const SearchFilters = forwardRef<SearchFiltersRef, SearchFiltersProps>(function SearchFilters({ initialFilters, onSearch, onFilterByMapArea, isFilteringByMapArea, visibleMarkerCount }, ref) {
  // If no studio types are selected, default to all types
  const filtersWithDefaults = {
    ...initialFilters,
    studio_studio_types: initialFilters.studio_studio_types.length === 0 
      ? [studio_type.HOME, studio_type.RECORDING, studio_type.PODCAST]
      : initialFilters.studio_studio_types
  };
  
  const [filters, setFilters] = useState(filtersWithDefaults);
  const radiusDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Expose applyFilters method to parent component via ref
  useImperativeHandle(ref, () => ({
    applyFilters: () => {
      logger.log('🔍 Apply button clicked - triggering search with current filters:', filters);
      // Only trigger search if there's a location
      if (filters.location && filters.location.trim() !== '') {
        logger.log('✅ Triggering search from Apply button');
        onSearch(filters);
      } else {
        logger.log('🚫 Skipping search - no location provided');
      }
    }
  }), [filters, onSearch]);

  useEffect(() => {
    logger.log('Updating filters with initialFilters:', initialFilters);
    // Apply defaults when updating from URL params
    const updatedFilters = {
      ...initialFilters,
      studio_studio_types: initialFilters.studio_studio_types.length === 0 
        ? [studio_type.HOME, studio_type.RECORDING, studio_type.PODCAST]
        : initialFilters.studio_studio_types
    };
    setFilters(updatedFilters);
  }, [initialFilters]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (radiusDebounceRef.current) {
        clearTimeout(radiusDebounceRef.current);
      }
    };
  }, []);

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
    { value: studio_type.HOME, label: 'Home Studio' },
    { value: studio_type.RECORDING, label: 'Recording Studio' },
    { value: studio_type.PODCAST, label: 'Podcast Studio' },
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
    
    // On mobile: only update state, don't trigger search
    // User will click "Apply" button to search
    // On desktop: trigger search immediately
    if (!isMobileDevice()) {
      logger.log('Desktop: Studio type toggled - triggering immediate search');
      onSearch(newFilters);
    } else {
      logger.log('Mobile: Studio type toggled - waiting for user to click Apply');
    }
  };

  // Helper function to detect if device is mobile
  const isMobileDevice = () => {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg px-6 py-3 space-y-6">
      {/* Optional Clear All button */}
      {hasActiveFilters && (
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-sm"
          >
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        </div>
      )}


      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-black mb-3">
          Location
        </label>
        <div className="space-y-3">
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
                
                // Set state first, then immediately trigger search
                setFilters(newFilters);
                onSearch(newFilters);
              } else {
                logger.log('Just typing location, no coordinates - not searching');
                // Just typing, update state but don't search
                setFilters(newFilters);
              }
            }}
            onEnterKey={() => {
              // Trigger search when Enter is pressed
              const newFilters = { ...filters };
              // Preserve coordinates if they exist
              if (filters.lat && filters.lng) {
                newFilters.lat = filters.lat;
                newFilters.lng = filters.lng;
              }
              logger.log('Enter key pressed - triggering search with coordinates:', 
                          filters.lat && filters.lng ? { lat: filters.lat, lng: filters.lng } : 'none');
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
                  // Clear any existing timeout to prevent accidental search
                  if (radiusDebounceRef.current) {
                    clearTimeout(radiusDebounceRef.current);
                  }
                  return; // Exit early - don't trigger search
                }
                
                // Desktop: Debounce the search with 500ms delay
                if (radiusDebounceRef.current) {
                  clearTimeout(radiusDebounceRef.current);
                }
                
                const delay = 500;
                logger.log(`Desktop: Radius changed to ${newRadius} - will trigger search after ${delay}ms`);
                
                radiusDebounceRef.current = setTimeout(() => {
                  logger.log(`Radius search triggered after ${delay}ms delay: ${newRadius} miles`);
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

      {/* Studio Types */}
      <div>
        <label className="block text-sm font-medium text-black mb-3">
          Studio Types
        </label>
        {/* Mobile: Card-style buttons */}
        <div className="space-y-3 lg:hidden">
          {studioTypeOptions.map(option => {
            const isSelected = filters.studio_studio_types.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleStudioTypeToggle(option.value)}
                className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 active:bg-gray-50'
                }`}
              >
                <span className={`text-base font-medium ${isSelected ? 'text-red-600' : 'text-gray-900'}`}>
                  {option.label}
                </span>
                <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelected
                    ? 'border-red-600 bg-red-600'
                    : 'border-gray-300 bg-white'
                }`}>
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {/* Desktop: Original checkbox style */}
        <div className="hidden lg:block space-y-2">
          {studioTypeOptions.map(option => (
            <label
              key={option.value}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.studio_studio_types.includes(option.value)}
                onChange={() => handleStudioTypeToggle(option.value)}
                className="rounded border-gray-300 text-red-600 focus:ring-gray-400"
              />
              <span className="text-sm text-black">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Filter by Map Area - Only show on desktop when 30 or fewer markers visible */}
      {onFilterByMapArea && (
        <div className="hidden lg:block">
          <Button
            onClick={onFilterByMapArea}
            variant={isFilteringByMapArea ? "primary" : "outline"}
            className="w-full"
            size="sm"
          >
            {isFilteringByMapArea ? '✓ Filtering by Map Area' : 'Filter by Map Area'}
          </Button>
          {isFilteringByMapArea && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Showing {visibleMarkerCount || 0} studios visible on map
            </p>
          )}
        </div>
      )}


    </div>
  );
});
