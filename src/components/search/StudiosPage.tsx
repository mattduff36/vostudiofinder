'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchFilters } from './SearchFilters';
import { StudiosList } from './StudiosList';
import { StudiosMapView } from './StudiosMapView';
import Image from 'next/image';

import { Button } from '@/components/ui/Button';
import { Map, List, Filter } from 'lucide-react';

interface Studio {
  id: string;
  name: string;
  description: string;
  studioType: string;
  address: string;
  websiteUrl?: string;
  phone?: string;
  isPremium: boolean;
  isVerified: boolean;
  latitude?: number;
  longitude?: number;
  owner: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  services: Array<{ service: string }>;
  images: Array<{ imageUrl: string; altText?: string }>;
  _count: { reviews: number };
}

interface SearchResponse {
  studios: Studio[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: {
    query?: string;
    location?: string;
    studioType?: string;
    services?: string[];
  };
}

export function StudiosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);

  // Search function
  const performSearch = async (params: URLSearchParams) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/studios/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        console.error('Search failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial search on component mount
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    performSearch(params);
  }, [searchParams.toString()]);

  const handleSearch = (filters: Record<string, any>) => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            params.set(key, value.join(','));
          }
        } else {
          params.set(key, value.toString());
        }
      }
    });

    // Reset to first page when searching
    params.set('page', '1');
    
    router.push(`/studios?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`/studios?${params.toString()}`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/bakground-images/21920-3.jpg"
          alt="Studio search background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>
      
      {/* Header */}
      <div className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#000000' }}>Recording Studios</h1>
              <p className="mt-2 text-text-secondary">
                {searchResults ? (
                  `${searchResults.pagination.totalCount} studios found`
                ) : (
                  'Discover professional recording studios worldwide'
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="px-3 py-1"
                >
                  <List className="w-4 h-4 mr-1" />
                  List
                </Button>
                <Button
                  variant={viewMode === 'map' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('map')}
                  className="px-3 py-1"
                >
                  <Map className="w-4 h-4 mr-1" />
                  Map
                </Button>
              </div>

              {/* Mobile Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden"
              >
                <Filter className="w-4 h-4 mr-1" />
                Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-8">
              <SearchFilters
                initialFilters={{
                  query: searchParams.get('q') || '',
                  location: searchParams.get('location') || '',
                  studioType: searchParams.get('studioType') || '',
                  services: searchParams.get('services')?.split(',') || [],
                  sortBy: searchParams.get('sortBy') || 'name',
                  sortOrder: searchParams.get('sortOrder') || 'asc',
                  radius: parseInt(searchParams.get('radius') || '25'),
                }}
                onSearch={handleSearch}
                loading={loading}
              />
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-3">
            {/* Results Header with Active Filters */}
            {searchResults && (
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <p className="text-text-secondary">
                    Showing {searchResults.pagination.totalCount === 0 ? '0-0' : `${((searchResults.pagination.page - 1) * searchResults.pagination.limit) + 1}-${Math.min(searchResults.pagination.page * searchResults.pagination.limit, searchResults.pagination.totalCount)}`} of {searchResults.pagination.totalCount} studios
                  </p>
                  {/* Active Filters Display */}
                  {(searchParams.get('location') || searchParams.get('studioType') || searchParams.get('services') || searchParams.get('radius')) && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-secondary">•</span>
                      <div className="flex flex-wrap gap-2">
                        {searchParams.get('location') && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            📍 {searchParams.get('location')}
                          </span>
                        )}
                        {searchParams.get('studioType') && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            🎙️ {searchParams.get('studioType')?.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Studio
                          </span>
                        )}
                        {searchParams.get('services') && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            ⚙️ {searchParams.get('services')?.split(',').length} Service{searchParams.get('services')?.split(',').length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {searchParams.get('radius') && searchParams.get('radius') !== '25' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            📏 {searchParams.get('radius')} miles
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderBottomColor: '#d42027' }}></div>
                <p className="mt-4 text-text-secondary">Searching studios...</p>
              </div>
            ) : searchResults ? (
              <>
                {viewMode === 'list' ? (
                  <StudiosList
                    studios={searchResults.studios}
                    pagination={searchResults.pagination}
                    onPageChange={handlePageChange}
                  />
                ) : (
                  <StudiosMapView studios={searchResults.studios} />
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-text-secondary">No results found. Try adjusting your search criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
