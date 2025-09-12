'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchFilters } from './SearchFilters';
import { StudiosList } from './StudiosList';
import { GoogleMap } from '@/components/maps/GoogleMap';
import Image from 'next/image';

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
  searchCoordinates?: { lat: number; lng: number } | null;
  searchRadius?: number | null;
}

export function StudiosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFilterSticky, setIsFilterSticky] = useState(false);
  const [stickyStyles, setStickyStyles] = useState<{width: number; left: number} | null>(null);
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const filterSidebarRef = useRef<HTMLDivElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);
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

  // Handle sticky filter sidebar with optimized scroll handling
  useEffect(() => {
    let ticking = false;
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      // Debounce scroll events to prevent excessive re-renders
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!ticking) {
          requestAnimationFrame(() => {
            if (!heroSectionRef.current || !filterSidebarRef.current) {
              ticking = false;
              return;
            }
            
            const heroSection = heroSectionRef.current;
            const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
            const navbarHeight = 80; // Approximate navbar height
            const scrollPosition = window.scrollY + navbarHeight;
            
            const shouldBeSticky = scrollPosition >= heroBottom;
            
            // Only update if state actually changes
            if (shouldBeSticky !== isFilterSticky) {
              // Calculate dimensions when transitioning to sticky
              if (shouldBeSticky) {
                const sidebarElement = filterSidebarRef.current;
                if (sidebarElement) {
                  const sidebarRect = sidebarElement.getBoundingClientRect();
                  const sidebarLeft = sidebarRect.left;
                  
                  setStickyStyles({
                    width: sidebarRect.width,
                    left: sidebarLeft
                  });
                }
              }
              
              // Update sticky state
              setIsFilterSticky(shouldBeSticky);
            }
            
            ticking = false;
          });
          ticking = true;
        }
      }, 16); // Throttle to ~60fps
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll(); // Check initial position
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isFilterSticky]);

  const handleSearch = (filters: Record<string, any>) => {
    console.log('🔍 HandleSearch called with filters:', filters);
    
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      // Special handling for coordinates - they can be 0 which is valid
      if (key === 'lat' || key === 'lng') {
        if (typeof value === 'number') {
          params.set(key, value.toString());
          console.log(`📍 Added coordinate ${key}: ${value}`);
        }
      } 
      // Regular handling for other values
      else if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            params.set(key, value.join(','));
          }
        } else {
          params.set(key, value.toString());
        }
      }
    });

    // Always preserve existing coordinates if we have them and no new coordinates provided
    const currentLat = searchParams.get('lat');
    const currentLng = searchParams.get('lng');
    
    // If filters don't include coordinates, but we have them in URL, preserve them
    if (!filters.lat && !filters.lng && currentLat && currentLng) {
      params.set('lat', currentLat);
      params.set('lng', currentLng);
      console.log('📍 Preserved coordinates from URL:', { lat: currentLat, lng: currentLng });
    }

    // Reset to first page when searching
    params.set('page', '1');
    
    console.log('🚀 Final URL params:', params.toString());
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
          <div ref={filterContainerRef} className="lg:col-span-1 hidden lg:block">
            {/* Placeholder to maintain layout when filter becomes fixed */}
            {isFilterSticky && <div style={{ height: '600px' }} />}
            
            <div 
              ref={filterSidebarRef}
              className={`${
                isFilterSticky 
                  ? 'fixed z-30' 
                  : 'sticky top-8'
              }`}
              style={isFilterSticky && stickyStyles ? { 
                width: `${stickyStyles.width}px`,
                left: `${stickyStyles.left}px`,
                top: '112px', // 80px navbar + 32px padding (same as top-8)
                maxHeight: 'calc(100vh - 7rem)', // Adjusted for the extra top space
                overflowY: 'auto'
              } : {}}
            >
              <SearchFilters
                initialFilters={useMemo(() => ({
                  location: searchParams.get('location') || '',
                  studioType: searchParams.get('studioType') || '',
                  services: searchParams.get('services')?.split(',') || [],
                  sortBy: searchParams.get('sortBy') || 'name',
                  sortOrder: searchParams.get('sortOrder') || 'asc',
                  radius: parseInt(searchParams.get('radius') || '25'),
                  ...(searchParams.get('lat') && searchParams.get('lng') ? {
                    lat: parseFloat(searchParams.get('lat')!),
                    lng: parseFloat(searchParams.get('lng')!)
                  } : {})
                }), [searchParams])}
                onSearch={handleSearch}
              />
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderBottomColor: '#d42027' }}></div>
                <p className="mt-4 text-text-secondary">Searching studios...</p>
              </div>
            ) : searchResults ? (
              <div className="space-y-6">
                {/* Map Section - Always shown at top */}
                <div className="h-[400px]">
                  <GoogleMap
                    key={`map-${searchResults.searchCoordinates ? `${searchResults.searchCoordinates.lat}-${searchResults.searchCoordinates.lng}` : 'global'}`}
                    center={searchResults.searchCoordinates 
                      ? { lat: searchResults.searchCoordinates.lat, lng: searchResults.searchCoordinates.lng }
                      : { lat: 20, lng: 0 }
                    }
                    zoom={searchResults.searchCoordinates ? 10 : 2}
                    markers={searchResults.studios
                      .filter(studio => studio.latitude && studio.longitude)
                      .map(studio => ({
                        id: studio.id,
                        position: { lat: studio.latitude!, lng: studio.longitude! },
                        title: studio.name,
                        studioType: studio.studioType,
                        isVerified: studio.isVerified,
                        onClick: () => {
                          // Scroll to the studio in the list below
                          const element = document.getElementById(`studio-${studio.id}`);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            // Add a brief highlight effect
                            element.classList.add('ring-2', 'ring-primary-300');
                            setTimeout(() => {
                              element.classList.remove('ring-2', 'ring-primary-300');
                            }, 2000);
                          }
                        },
                      }))}
                    searchCenter={searchResults.searchCoordinates || null}
                    searchRadius={parseInt(searchParams.get('radius') || '25')}
                    selectedMarkerId={null}
                    height="100%"
                    className="rounded-lg border border-gray-200"
                  />
                </div>

                {/* Results Header with Active Filters - Below map, above cards */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                          {searchParams.get('radius') && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              📏 {searchParams.get('radius')} miles
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* List Section - Always shown below results header */}
                <StudiosList
                  studios={searchResults.studios}
                  pagination={searchResults.pagination}
                  onPageChange={handlePageChange}
                />
              </div>
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
