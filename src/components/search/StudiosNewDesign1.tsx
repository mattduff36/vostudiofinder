'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, MapPin, X, Grid, List, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Studio {
  id: string;
  name: string;
  description: string;
  location: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
  studioType: string;
  services: string[];
}

export function StudiosNewDesign1() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Enhanced filters state
  const [filters, setFilters] = useState({
    query: searchParams.get('q') || '',
    location: searchParams.get('location') || '',
    studioType: searchParams.get('studioType') || '',
    services: searchParams.get('services')?.split(',') || [],
    sortBy: searchParams.get('sortBy') || 'name',
    sortOrder: searchParams.get('sortOrder') || 'asc',
    radius: parseInt(searchParams.get('radius') || '25'),
  });

  const handleSearch = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setSearchResults({
        studios: Array.from({ length: 12 }, (_, i) => ({
          id: `studio-${i}`,
          name: `Studio ${i + 1}`,
          description: 'Professional recording studio with state-of-the-art equipment',
          location: 'London, UK',
          rating: 4.5,
          reviewCount: 23,
          studioType: 'Recording Studio',
          services: ['Pro Tools', 'Logic Pro', 'Mixing']
        })),
        pagination: { page: 1, limit: 20, totalCount: 50 }
      });
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    handleSearch();
  }, []);

  const activeFiltersCount = [
    filters.query,
    filters.location, 
    filters.studioType,
    filters.services.length > 0,
    filters.radius !== 25
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Find Recording Studios</h1>
              <p className="text-gray-600 mt-1">Discover professional studios near you</p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="hidden md:flex"
            >
              ← Back to Home
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            
            {/* Main Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for studios, equipment, or services..."
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
              />
            </div>

            {/* Location Input */}
            <div className="lg:w-80 relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Location (city, country...)"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
              />
            </div>

            {/* Filter Toggle & Search Button */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-3 relative"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
              
              <Button
                onClick={handleSearch}
                loading={loading}
                className="px-6 py-3 bg-red-600 hover:bg-red-700"
                style={{ backgroundColor: '#d42027' }}
              >
                Search
              </Button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.location || filters.studioType || filters.services.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {filters.location && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  📍 {filters.location}
                  <button onClick={() => setFilters(prev => ({ ...prev, location: '' }))} className="ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.studioType && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  🎙️ {filters.studioType}
                  <button onClick={() => setFilters(prev => ({ ...prev, studioType: '' }))} className="ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.services.map((service, index) => (
                <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                  ⚙️ {service}
                  <button onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    services: prev.services.filter(s => s !== service) 
                  }))} className="ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Advanced Filters */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Studio Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Studio Type</label>
                <select
                  value={filters.studioType}
                  onChange={(e) => setFilters(prev => ({ ...prev, studioType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">All Types</option>
                  <option value="RECORDING">Recording Studio</option>
                  <option value="PODCAST">Podcast Studio</option>
                  <option value="HOME">Home Studio</option>
                  <option value="PRODUCTION">Production Studio</option>
                </select>
              </div>

              {/* Search Radius */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Radius: {filters.radius} miles
                </label>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={filters.radius}
                  onChange={(e) => setFilters(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #d42027 0%, #d42027 ${(filters.radius - 5) / 195 * 100}%, #e5e7eb ${(filters.radius - 5) / 195 * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="name">Name</option>
                  <option value="rating">Rating</option>
                  <option value="createdAt">Recently Added</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button
                  variant="outline"
        onClick={() => setFilters({
          query: '', location: '', studioType: '', services: [],
          sortBy: 'name', sortOrder: 'asc',
          radius: 25, // Keep radius for internal state consistency
          // Clear coordinates by omitting lat/lng properties
        })}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {searchResults ? `${searchResults.pagination.totalCount} Studios Found` : 'Loading...'}
            </h2>
            {searchResults && (
              <p className="text-gray-600 text-sm mt-1">
                Showing {((searchResults.pagination.page - 1) * searchResults.pagination.limit) + 1}-{Math.min(searchResults.pagination.page * searchResults.pagination.limit, searchResults.pagination.totalCount)} of {searchResults.pagination.totalCount} results
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Grid/List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderBottomColor: '#d42027' }}></div>
            <p className="mt-4 text-gray-600">Searching studios...</p>
          </div>
        ) : searchResults ? (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }>
            {searchResults.studios.map((studio: Studio) => (
              <div key={studio.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${
                viewMode === 'list' ? 'flex gap-4 p-4' : 'p-6'
              }`}>
                <div className={`${viewMode === 'list' ? 'w-32 h-24' : 'w-full h-48'} bg-gray-200 rounded-lg mb-4 flex-shrink-0`}>
                  {/* Studio Image Placeholder */}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">{studio.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{studio.description}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <MapPin className="w-4 h-4" />
                    {studio.location}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex text-yellow-400">
                        {'★'.repeat(5)}
                      </div>
                      <span className="text-sm text-gray-600">({studio.reviewCount})</span>
                    </div>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700" style={{ backgroundColor: '#d42027' }}>
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No studios found. Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
