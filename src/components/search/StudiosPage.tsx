'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchFilters } from './SearchFilters';
import { StudiosList } from './StudiosList';
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
        console.error('Search failed:', response.statusText);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial search on component mount
  useEffect(() => {
    performSearch(searchParams);
  }, [searchParams]);

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
              <h1 className="text-3xl font-bold text-text-primary">Recording Studios</h1>
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
                }}
                onSearch={handleSearch}
                loading={loading}
              />
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
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
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <Map className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-text-primary mb-2">
                      Map View Coming Soon
                    </h3>
                    <p className="text-text-secondary">
                      We're working on an interactive map view with Google Maps integration.
                    </p>
                  </div>
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
