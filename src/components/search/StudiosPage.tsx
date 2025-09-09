'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchFilters } from './SearchFilters';
import { StudiosList } from './StudiosList';
import { StudiosMapView } from './StudiosMapView';
import Image from 'next/image';
import { colors } from '@/components/home/HomePage';

import { Button } from '@/components/ui/Button';
import { Map, List } from 'lucide-react';

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
  const [isFilterSticky, setIsFilterSticky] = useState(false);
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const filterSidebarRef = useRef<HTMLDivElement>(null);
  // const [, setShowFilters] = useState(false);

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

  // Handle sticky filter sidebar
  useEffect(() => {
    const handleScroll = () => {
      if (!heroSectionRef.current) return;
      
      const heroSection = heroSectionRef.current;
      const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
      const navbarHeight = 80; // Approximate navbar height
      const scrollPosition = window.scrollY + navbarHeight;
      
      // Make sticky when scroll position reaches the bottom of hero section
      setIsFilterSticky(scrollPosition >= heroBottom);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <div className="min-h-screen bg-white relative overflow-hidden -mt-20">
      {/* Background Image for main content */}
      <div className="absolute inset-0">
        <Image
          src="/bakground-images/21920-5.jpg"
          alt="Studios page background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      {/* Header Section - Simplified */}
      <div ref={heroSectionRef} className="relative overflow-hidden pt-20" style={{ height: '200px' }}>
        <div className="absolute inset-0">
          <Image
            src="/bakground-images/21920-3.jpg"
            alt="Studio search background texture"
            fill
            className="object-cover"
            priority={false}
          />
        </div>
        {/* Black gradient overlay - 0% transparent left, 60% transparent middle, 0% transparent right */}
        <div 
          className="absolute inset-0" 
          style={{ 
            background: 'linear-gradient(to right, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 1))' 
          }}
        ></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex items-center justify-center">
          <h1 className="text-4xl md:text-5xl font-bold" style={{ color: '#ffffff' }}>
            Recording Studios
          </h1>
        </div>
      </div>


      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 hidden lg:block">
            {/* Placeholder to maintain layout when filter becomes fixed */}
            {isFilterSticky && <div style={{ height: '600px' }} />}
            
            <div 
              ref={filterSidebarRef}
              className={`transition-all duration-200 ${
                isFilterSticky 
                  ? 'fixed top-20 w-80 z-30' 
                  : 'sticky top-8'
              }`}
              style={isFilterSticky ? { 
                maxHeight: 'calc(100vh - 5rem)',
                overflowY: 'auto'
              } : {}}
            >
              <SearchFilters
                initialFilters={{
                  location: searchParams.get('location') || '',
                  studioType: searchParams.get('studioType') || '',
                  services: searchParams.get('services')?.split(',') || [],
                  sortBy: searchParams.get('sortBy') || 'name',
                  sortOrder: searchParams.get('sortOrder') || 'asc',
                  radius: parseInt(searchParams.get('radius') || '25'),
                }}
                onSearch={handleSearch}
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
                
                {/* View Mode Toggle - Right Side */}
                <div className="flex items-center bg-white rounded-lg border border-gray-300 p-1">
                  <Button
                    variant={viewMode === 'list' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="px-3 py-2"
                    style={viewMode === 'list' ? { backgroundColor: colors.primary, color: 'white' } : {}}
                  >
                    <List className="w-4 h-4 mr-1" />
                    List
                  </Button>
                  <Button
                    variant={viewMode === 'map' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('map')}
                    className="px-3 py-2"
                    style={viewMode === 'map' ? { backgroundColor: colors.primary, color: 'white' } : {}}
                  >
                    <Map className="w-4 h-4 mr-1" />
                    Map
                  </Button>
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
