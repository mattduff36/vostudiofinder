'use client';

import { useState, useEffect } from 'react';
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
}

export function SearchFilters({ initialFilters, onSearch }: SearchFiltersProps) {
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    console.log('Updating filters with initialFilters:', initialFilters);
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleFilterChange = (key: string, value: any) => {
    console.log(`HandleFilterChange called - key: ${key}, value: ${value}`);
    console.log('Current filters state:', filters);
    
    const newFilters = { ...filters, [key]: value };
    
    // Always preserve coordinates if they exist (except when explicitly changing location without coordinates)
    if (filters.lat && filters.lng) {
      newFilters.lat = filters.lat;
      newFilters.lng = filters.lng;
      console.log('Preserving coordinates:', { lat: filters.lat, lng: filters.lng });
    } else {
      console.log('No coordinates to preserve - filters.lat:', filters.lat, 'filters.lng:', filters.lng);
    }
    
    console.log('Final newFilters being sent to onSearch:', newFilters);
    
    setFilters(newFilters);
    
    // RULE: Only trigger search if there's a location (except for location changes themselves)
    if (key === 'location' || (newFilters.location && newFilters.location.trim() !== '')) {
      console.log('✅ Triggering search - location exists or location is being changed');
      onSearch(newFilters);
    } else {
      console.log('🚫 Skipping search - no location provided');
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
  //     console.log('✅ Service toggle triggering search - location exists');
  //     onSearch(newFilters);
  //   } else {
  //     console.log('🚫 Service toggle skipping search - no location provided');
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
    // Apply filters instantly
    onSearch(newFilters);
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
                
                console.log('Location selected - coordinates extracted:', { lat, lng });
                console.log('New filters with coordinates:', newFilters);
                
                // Set state first, then immediately trigger search
                setFilters(newFilters);
                onSearch(newFilters);
              } else {
                console.log('Just typing location, no coordinates - not searching');
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
              console.log('Enter key pressed - triggering search with coordinates:', 
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
                
                console.log(`Radius changed to ${newRadius} - triggering immediate search`);
                handleFilterChange('radius', newRadius);
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
        <div className="space-y-2">
          {studioTypeOptions.map(option => (
            <label
              key={option.value}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.studio_studio_types.includes(option.value)}
                onChange={() => handleStudioTypeToggle(option.value)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-black">{option.label}</span>
            </label>
          ))}
        </div>
      </div>





    </div>
  );
}
