'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

import { X, Search } from 'lucide-react';
import { LocationAutocomplete } from '@/components/maps/LocationAutocomplete';
import { StudioType, ServiceType } from '@prisma/client';

interface SearchFiltersProps {
  initialFilters: {
    query: string;
    location: string;
    studioType: string;
    services: string[];
    equipment: string[];
    sortBy: string;
    sortOrder: string;
    radius: number;
  };
  onSearch: (filters: Record<string, any>) => void;
  loading?: boolean;
}

export function SearchFilters({ initialFilters, onSearch, loading }: SearchFiltersProps) {
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleServiceToggle = (service: string) => {
    const currentServices = filters.services || [];
    const updatedServices = currentServices.includes(service)
      ? currentServices.filter(s => s !== service)
      : [...currentServices, service];
    
    handleFilterChange('services', updatedServices);
  };

  const handleEquipmentToggle = (equipment: string) => {
    const currentEquipment = filters.equipment || [];
    const updatedEquipment = currentEquipment.includes(equipment)
      ? currentEquipment.filter(e => e !== equipment)
      : [...currentEquipment, equipment];
    
    handleFilterChange('equipment', updatedEquipment);
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      query: '',
      location: '',
      studioType: '',
      services: [],
      equipment: [],
      sortBy: 'name',
      sortOrder: 'asc',
      radius: 25,
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
    { value: ServiceType.ISDN, label: 'ISDN' },
    { value: ServiceType.SOURCE_CONNECT, label: 'Source Connect' },
    { value: ServiceType.SOURCE_CONNECT_NOW, label: 'Source Connect Now' },
    { value: ServiceType.CLEANFEED, label: 'Cleanfeed' },
    { value: ServiceType.SESSION_LINK_PRO, label: 'Session Link Pro' },
    { value: ServiceType.ZOOM, label: 'Zoom' },
    { value: ServiceType.SKYPE, label: 'Skype' },
    { value: ServiceType.TEAMS, label: 'Microsoft Teams' },
  ];

  const equipmentOptions = [
    { value: 'neumann_u87', label: 'Neumann U87' },
    { value: 'neumann_tlm103', label: 'Neumann TLM 103' },
    { value: 'rode_procaster', label: 'Rode Procaster' },
    { value: 'shure_sm7b', label: 'Shure SM7B' },
    { value: 'audio_technica_at4040', label: 'Audio-Technica AT4040' },
    { value: 'focusrite_scarlett', label: 'Focusrite Scarlett' },
    { value: 'universal_audio', label: 'Universal Audio' },
    { value: 'pro_tools', label: 'Pro Tools' },
    { value: 'logic_pro', label: 'Logic Pro' },
    { value: 'cubase', label: 'Cubase' },
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'createdAt', label: 'Recently Added' },
    { value: 'rating', label: 'Rating' },
  ];

  const hasActiveFilters = filters.query || filters.location || filters.studioType || filters.services.length > 0 || filters.equipment.length > 0 || filters.radius !== 25;

  const handleStudioTypeToggle = (studioType: string) => {
    const currentTypes = filters.studioType ? [filters.studioType] : [];
    const updatedType = currentTypes.includes(studioType) ? '' : studioType;
    handleFilterChange('studioType', updatedType);
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

      {/* Keyword Search */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          Keyword Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search recording studios..."
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          Location
        </label>
        <div className="space-y-3">
          <LocationAutocomplete
            value={filters.location}
            onChange={(value, placeDetails) => {
              handleFilterChange('location', value);
              // You can also store place details if needed for more precise location data
              if (placeDetails) {
                console.log('Selected place:', placeDetails);
              }
            }}
            placeholder="Enter city, state, or country..."
          />
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Search Radius: {filters.radius} miles
            </label>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={filters.radius}
              onChange={(e) => handleFilterChange('radius', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5mi</span>
              <span>50mi</span>
              <span>100mi</span>
              <span>200mi</span>
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

      {/* Equipment */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          Equipment
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {equipmentOptions.map(equipment => (
            <label
              key={equipment.value}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.equipment.includes(equipment.value)}
                onChange={() => handleEquipmentToggle(equipment.value)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-text-primary">{equipment.label}</span>
            </label>
          ))}
        </div>
      </div>


      {/* Sort Options */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Sort By
        </label>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="asc">A-Z</option>
            <option value="desc">Z-A</option>
          </select>
        </div>
      </div>

      {/* Search Button */}
      <Button
        onClick={handleSearch}
        loading={loading || false}
        disabled={loading || false}
        className="w-full"
      >
        {loading ? 'Searching...' : 'Search Studios'}
      </Button>
    </div>
  );
}
