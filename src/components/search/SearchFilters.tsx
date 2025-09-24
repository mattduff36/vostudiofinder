'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

import { X } from 'lucide-react';
import { EnhancedLocationFilter } from './EnhancedLocationFilter';
import { StudioType, ServiceType } from '@prisma/client';

interface SearchFiltersProps {
  initialFilters: {
    location: string;
    studioType: string;
    services: string[];
    sortBy: string;
    sortOrder: string;
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

  const handleServiceToggle = (service: string) => {
    const currentServices = filters.services || [];
    const updatedServices = currentServices.includes(service)
      ? currentServices.filter(s => s !== service)
      : [...currentServices, service];
    
    const newFilters = { ...filters, services: updatedServices };
    
    // Preserve coordinates if they exist
    if (filters.lat && filters.lng) {
      newFilters.lat = filters.lat;
      newFilters.lng = filters.lng;
    }
    
    setFilters(newFilters);
    
    // RULE: Only trigger search if there's a location
    if (newFilters.location && newFilters.location.trim() !== '') {
      console.log('✅ Service toggle triggering search - location exists');
      onSearch(newFilters);
    } else {
      console.log('🚫 Service toggle skipping search - no location provided');
    }
  };



  const clearFilters = () => {
    const clearedFilters = {
      location: '',
      studioType: '',
      services: [],
      sortBy: 'name',
      sortOrder: 'asc',
      radius: 25, // Keep radius for internal state consistency
      // Clear coordinates to remove the radius circle from the map - omit lat/lng properties
    };
    setFilters(clearedFilters);
    onSearch(clearedFilters);
  };

  const studioTypeOptions = [
    { value: '', label: 'All Studio Types' },
    { value: StudioType.RECORDING, label: 'Recording Studio' },
    { value: StudioType.PODCAST, label: 'Podcast Studio' },
    { value: 'VOICEOVER', label: 'Voiceover Studio' },
  ];

  const serviceOptions = [
    { value: ServiceType.SOURCE_CONNECT, label: 'Source Connect' },
    { value: ServiceType.SOURCE_CONNECT_NOW, label: 'Source Connect Now' },
    { value: ServiceType.CLEANFEED, label: 'Cleanfeed' },
    { value: ServiceType.SESSION_LINK_PRO, label: 'Session Link Pro' },
    { value: ServiceType.ZOOM, label: 'Zoom' },
    { value: ServiceType.TEAMS, label: 'Microsoft Teams' },
  ];


  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'createdAt', label: 'Recently Added' },
    { value: 'rating', label: 'Rating' },
  ];

  const hasActiveFilters = filters.location || filters.studioType || filters.services.length > 0 || filters.radius !== 25;

  const handleStudioTypeToggle = (studioType: string) => {
    const currentTypes = filters.studioType ? [filters.studioType] : [];
    const updatedType = currentTypes.includes(studioType) ? '' : studioType;
    const newFilters = { ...filters, studioType: updatedType };
    
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
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {hasActiveFilters && (
        <div className="flex justify-end">
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
        <label className="block text-sm font-medium text-text-primary mb-3">
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
            placeholder="Search by location, postcode, or username..."
          />
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Search Radius: {filters.radius} miles
            </label>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={filters.radius}
              onChange={(e) => {
                const newRadius = parseInt(e.target.value);
                console.log(`Radius changed to ${newRadius} - triggering immediate search`);
                handleFilterChange('radius', newRadius);
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #d42027 0%, #d42027 ${(filters.radius - 1) / 49 * 100}%, #e5e7eb ${(filters.radius - 1) / 49 * 100}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1mi</span>
              <span>25mi</span>
              <span>50mi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Studio Type */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          Studio Type
        </label>
        <div className="space-y-2">
          {studioTypeOptions.filter(option => option.value !== '').map(option => (
            <label
              key={option.value}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.studioType === option.value}
                onChange={() => handleStudioTypeToggle(option.value)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-text-primary">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Services */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          Services
        </label>
        <div className="space-y-2">
          {serviceOptions.map(service => (
            <label
              key={service.value}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.services.includes(service.value)}
                onChange={() => handleServiceToggle(service.value)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-text-primary">{service.label}</span>
            </label>
          ))}
        </div>
      </div>




    </div>
  );
}
