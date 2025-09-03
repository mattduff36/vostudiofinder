'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, MapPin, Filter, X } from 'lucide-react';
import { StudioType, ServiceType } from '@prisma/client';

interface SearchFiltersProps {
  initialFilters: {
    query: string;
    location: string;
    studioType: string;
    services: string[];
    sortBy: string;
    sortOrder: string;
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

  const handleSearch = () => {
    onSearch(filters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      query: '',
      location: '',
      studioType: '',
      services: [],
      sortBy: 'name',
      sortOrder: 'asc',
    };
    setFilters(clearedFilters);
    onSearch(clearedFilters);
  };

  const studioTypeOptions = [
    { value: '', label: 'All Studio Types' },
    { value: StudioType.RECORDING, label: 'Recording Studio' },
    { value: StudioType.PODCAST, label: 'Podcast Studio' },
    { value: StudioType.HOME, label: 'Home Studio' },
    { value: StudioType.PRODUCTION, label: 'Production Studio' },
    { value: StudioType.MOBILE, label: 'Mobile Studio' },
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

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'createdAt', label: 'Recently Added' },
    { value: 'rating', label: 'Rating' },
  ];

  const hasActiveFilters = filters.query || filters.location || filters.studioType || filters.services.length > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-text-primary flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-sm"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Search Query */}
      <div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search studios, equipment, services..."
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Location
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="City, state, country..."
            value={filters.location}
            onChange={(e) => handleFilterChange('location', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Studio Type */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Studio Type
        </label>
        <select
          value={filters.studioType}
          onChange={(e) => handleFilterChange('studioType', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {studioTypeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Services */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          Services & Equipment
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
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
        loading={loading}
        disabled={loading}
        className="w-full"
      >
        {loading ? 'Searching...' : 'Search Studios'}
      </Button>
    </div>
  );
}
