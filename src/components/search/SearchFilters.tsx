'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

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
      radius: 25,
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

  const hasActiveFilters = filters.query || filters.location || filters.studioType || filters.services.length > 0 || filters.radius !== 25;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mr-3">
              <Filter className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Search Filters</h3>
              <p className="text-sm text-gray-500">Refine your studio search</p>
            </div>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-sm hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Filters Content */}
      <div className="p-6">

        {/* Main Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
          {/* Search Query */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              🔍 Search Query
            </label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-red-500 transition-colors" />
              <input
                type="text"
                placeholder="Studios, equipment, services..."
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Location */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              📍 Location
            </label>
            <div className="relative group">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-red-500 transition-colors" />
              <input
                type="text"
                placeholder="City, state, country..."
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Studio Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              🎙️ Studio Type
            </label>
            <select
              value={filters.studioType}
              onChange={(e) => handleFilterChange('studioType', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-gray-50 focus:bg-white appearance-none cursor-pointer"
            >
              {studioTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <Button
              onClick={handleSearch}
              loading={loading || false}
              disabled={loading || false}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              style={{ backgroundColor: '#d42027' }}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Searching...
                </div>
              ) : (
                'Search Studios'
              )}
            </Button>
          </div>
        </div>

        {/* Sort Options Row */}
        <div className="flex items-center justify-between mb-8 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-semibold text-gray-700">📊 Sort Results:</span>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
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
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
            >
              <option value="asc">A-Z</option>
              <option value="desc">Z-A</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Services & Equipment */}
            <div className="lg:col-span-2">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center mr-3">
                  <span className="text-purple-600 text-sm">⚙️</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Services & Equipment</h4>
                  <p className="text-xs text-gray-500">Select the services you need</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 max-h-40 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {serviceOptions.map(service => (
                    <label
                      key={service.value}
                      className="flex items-center space-x-3 cursor-pointer group hover:bg-white hover:shadow-sm rounded-lg p-2 transition-all duration-200"
                    >
                      <input
                        type="checkbox"
                        checked={filters.services.includes(service.value)}
                        onChange={() => handleServiceToggle(service.value)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">
                        {service.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
              {filters.services.length > 0 && (
                <div className="mt-3 text-sm text-gray-600">
                  <span className="font-medium">{filters.services.length}</span> service{filters.services.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            {/* Search Radius */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center mr-3">
                  <span className="text-orange-600 text-sm">📏</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Search Radius</h4>
                  <p className="text-xs text-gray-500">Distance from location</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Distance</span>
                  <span className="text-lg font-bold text-red-600">{filters.radius} miles</span>
                </div>
                
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={filters.radius}
                  onChange={(e) => handleFilterChange('radius', parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #d42027 0%, #d42027 ${(filters.radius - 5) / 195 * 100}%, #e5e7eb ${(filters.radius - 5) / 195 * 100}%, #e5e7eb 100%)`
                  }}
                />
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span className="font-medium">5mi</span>
                  <span>50mi</span>
                  <span>100mi</span>
                  <span className="font-medium">200mi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
