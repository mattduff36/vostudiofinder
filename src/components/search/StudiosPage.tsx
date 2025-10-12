'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchFilters } from './SearchFilters';
import { StudiosList } from './StudiosList';
import { GoogleMap } from '@/components/maps/GoogleMap';
import { abbreviateAddress } from '@/lib/utils/address';
import Image from 'next/image';

// Custom hook for dynamic text sizing
function useDynamicTextSize(text: string, containerWidth: number, maxFontSize: number = 48) {
  const [fontSize, setFontSize] = useState(maxFontSize);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!measureRef.current || !containerWidth || containerWidth === 0) return;

    const measureElement = measureRef.current;
    let currentSize = maxFontSize;
    
    // Binary search for optimal font size
    let minSize = 12;
    let maxSize = maxFontSize;
    
    while (minSize <= maxSize) {
      currentSize = Math.floor((minSize + maxSize) / 2);
      measureElement.style.fontSize = `${currentSize}px`;
      measureElement.style.fontWeight = 'bold';
      measureElement.textContent = text;
      
      const textWidth = measureElement.scrollWidth;
      const availableWidth = containerWidth - 48; // Account for padding
      
      if (textWidth <= availableWidth) {
        minSize = currentSize + 1;
      } else {
        maxSize = currentSize - 1;
      }
    }
    
    setFontSize(Math.max(maxSize, 16)); // Minimum 16px
  }, [text, containerWidth, maxFontSize]);

  return { fontSize, measureRef };
}

interface Studio {
  id: string;
  name: string;
  description: string;
  studio_studio_types: Array<{ studio_type: string }>;
  address: string;
  website_url?: string;
  phone?: string;
  is_premium: boolean;
  is_verified: boolean;
  latitude?: number;
  longitude?: number;
  owner: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
  };
  studio_services: Array<{ service: string }>;
  studio_images: Array<{ imageUrl: string; alt_text?: string }>;
  _count: { reviews: number };
}

interface SearchResponse {
  studios: Studio[];
  mapMarkers?: Array<{
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    studio_studio_types: Array<{ studio_type: string }>;
    is_verified: boolean;
  }>;
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
    studioTypes?: string[];
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
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const titleContainerRef = useRef<HTMLDivElement>(null);

  // Use dynamic text sizing hook
  const { fontSize, measureRef } = useDynamicTextSize('Available Studios', containerWidth, 48);

  // Track container width and mobile state for dynamic text sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (titleContainerRef.current) {
        setContainerWidth(titleContainerRef.current.offsetWidth);
      }
      setIsMobile(window.innerWidth < 640);
    };

    // Initial measurement
    updateDimensions();

    // Set up resize observer
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (titleContainerRef.current) {
      resizeObserver.observe(titleContainerRef.current);
    }

    // Also listen to window resize as fallback
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Function to clear previous studio selection outline
  const clearPreviousSelection = () => {
    if (selectedStudioId) {
      const previousElement = document.getElementById(`studio-${selectedStudioId}`);
      if (previousElement) {
        previousElement.style.outline = '';
        previousElement.style.outlineOffset = '';
        previousElement.classList.remove('animate-bounce-once');
      }
    }
  };

  // Function to select a studio and add persistent outline
  const selectStudio = async (studio_id: string) => {
    clearPreviousSelection();
    setSelectedStudioId(studio_id);
    
    // Check if the studio is on the current page
    const currentPageStudios = searchResults?.studios || [];
    const studioOnCurrentPage = currentPageStudios.find(studio => studio.id === studio_id);
    
    if (!studioOnCurrentPage && searchResults) {
      // Studio is not on current page - need to find which page it's on
      // Since we have mapMarkers with all studios, we can search through pages more efficiently
      try {
        console.log('🔍 Studio not on current page, searching for:', studio_id);
        
        const studiosPerPage = searchResults.pagination.limit;
        const totalPages = searchResults.pagination.totalPages;
        
        // Search through pages to find the studio (limit to first 10 pages for performance)
        let foundPage = null;
        
        for (let page = 1; page <= Math.min(totalPages, 10); page++) {
          const params = new URLSearchParams(searchParams);
          params.set('page', page.toString());
          params.set('limit', studiosPerPage.toString()); // Use same limit as current pagination
          
          console.log(`🔍 Checking page ${page} for studio ${studio_id}`);
          
          const response = await fetch(`/api/studios/search?${params.toString()}`);
          if (!response.ok) {
            console.error('API request failed:', response.status);
            break;
          }
          
          const data = await response.json();
          
          if (data.studios) {
            const studioFound = data.studios.find((studio: any) => studio.id === studio_id);
            if (studioFound) {
              foundPage = page;
              console.log(`✅ Found studio on page ${page}`);
              break;
            }
          }
        }
        
        if (foundPage && foundPage !== searchResults.pagination.page) {
          console.log(`🚀 Navigating to page ${foundPage}`);
          // Navigate to the correct page
          const newParams = new URLSearchParams(searchParams);
          newParams.set('page', foundPage.toString());
          router.push(`/studios?${newParams.toString()}`);
          
          // Store the studio ID to select after navigation
          sessionStorage.setItem('pendingStudioSelection', studio_id);
          return;
        }
        
        // If not found in first 10 pages, fall back to direct selection
        console.log('⚠️ Studio not found in first 10 pages, selecting on current page if possible');
        
      } catch (error) {
        console.error('❌ Error finding studio page:', error);
      }
    }
    
    // Studio is on current page or fallback - select it directly
    selectStudioOnCurrentPage(studio_id);
  };

  // Helper function to select studio on current page
  const selectStudioOnCurrentPage = (studio_id: string) => {
    const element = document.getElementById(`studio-${studio_id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Wait for scroll to complete, then add bounce animation and red outline
      setTimeout(() => {
        // Add red outline and bounce animation
        element.style.outline = '2px solid #dc2626'; // red-600
        element.style.outlineOffset = '2px';
        element.classList.add('animate-bounce-once');
        
        // Remove only the bounce animation after it completes, keep the outline
        setTimeout(() => {
          element.classList.remove('animate-bounce-once');
        }, 1000); // 1 second for bounce animation
      }, 800); // Wait for scroll to complete
    }
  };
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const filterSidebarRef = useRef<HTMLDivElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);

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

  // Clear selection when search parameters change (new search from URL)
  useEffect(() => {
    clearPreviousSelection();
    setSelectedStudioId(null);
  }, [searchParams.toString()]);

  // Handle pending studio selection after navigation
  useEffect(() => {
    const pendingStudioId = sessionStorage.getItem('pendingStudioSelection');
    if (pendingStudioId && searchResults?.studios) {
      // Check if the pending studio is now on the current page
      const studioOnCurrentPage = searchResults.studios.find(studio => studio.id === pendingStudioId);
      if (studioOnCurrentPage) {
        // Clear the pending selection and select the studio
        sessionStorage.removeItem('pendingStudioSelection');
        setTimeout(() => {
          selectStudioOnCurrentPage(pendingStudioId);
        }, 100);
      }
    }
  }, [searchResults?.studios]);

  const handleSearch = (filters: Record<string, any>) => {
    console.log('🔍 HandleSearch called with filters:', filters);
    
    // Clear any selected studio when performing a new search
    clearPreviousSelection();
    setSelectedStudioId(null);
    
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
    // BUT only if coordinates weren't explicitly cleared (undefined means explicitly cleared)
    if (!filters.lat && !filters.lng && currentLat && currentLng && 
        !filters.hasOwnProperty('lat') && !filters.hasOwnProperty('lng')) {
      params.set('lat', currentLat);
      params.set('lng', currentLng);
      console.log('📍 Preserved coordinates from URL:', { lat: currentLat, lng: currentLng });
    } else if (filters.hasOwnProperty('lat') && filters.lat === undefined) {
      console.log('📍 Coordinates explicitly cleared - not preserving from URL');
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

  // Count active filters for mobile badge
  const getActiveFilterCount = () => {
    let count = 0;
    if (searchParams.get('location')) count++;
    if (searchParams.get('studio_type')) count++;
    if (searchParams.get('services')) count++;
    if (searchParams.get('radius') && searchParams.get('radius') !== '10') count++;
    return count;
  };

  // Move useMemo outside conditional render to maintain hook order
  const mobileFiltersInitialState = useMemo(() => ({
    location: searchParams.get('location') || '',
    studio_studio_types: searchParams.get('studioTypes')?.split(',') || searchParams.get('studio_type')?.split(',') || [],
    studio_services: searchParams.get('services')?.split(',') || [],
    sortBy: searchParams.get('sortBy') || 'name',
    sort_order: searchParams.get('sort_order') || 'asc',
    radius: parseInt(searchParams.get('radius') || '10'),
    ...(searchParams.get('lat') && searchParams.get('lng') ? {
      lat: parseFloat(searchParams.get('lat')!),
      lng: parseFloat(searchParams.get('lng')!)
    } : {})
  }), [searchParams]);


  return (
    <div className="min-h-screen bg-white relative overflow-hidden -mt-20">
      {/* Background Image for main content */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-5.jpg"
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
            src="/background-images/21920-3.jpg"
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
        <div ref={titleContainerRef} className="relative z-10 max-w-7xl mx-auto px-6 flex items-center justify-center" style={{ height: '120px' }}>
          <h1 
            className="font-bold whitespace-nowrap sm:text-3xl md:text-4xl lg:text-5xl" 
            style={{ 
              color: '#ffffff',
              fontSize: isMobile ? `${fontSize}px` : undefined
            }}
          >
            Available Studios
          </h1>
          {/* Hidden measurement element */}
          <span 
            ref={measureRef}
            style={{
              position: 'absolute',
              visibility: 'hidden',
              whiteSpace: 'nowrap',
              fontSize: '48px',
              fontWeight: 'bold'
            }}
            aria-hidden="true"
          />
        </div>
      </div>


      {/* Mobile Controls */}
      <div className="lg:hidden sticky top-20 z-30 bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex space-x-3">
          {/* Filter Button */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center justify-center flex-1 py-3 px-4 bg-white border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 relative"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            Filters
            {getActiveFilterCount() > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {getActiveFilterCount()}
              </span>
            )}
          </button>

          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMobileView('list')}
              className={`flex items-center justify-center px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                mobileView === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </button>
            <button
              onClick={() => setMobileView('map')}
              className={`flex items-center justify-center px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                mobileView === 'map'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Map
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileFilters(false)}
          />
          
          {/* Modal Content */}
          <div className="relative h-full bg-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4">
              <SearchFilters
                initialFilters={mobileFiltersInitialState}
                onSearch={(filters) => {
                  handleSearch(filters);
                  setShowMobileFilters(false);
                }}
              />
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    router.push('/studios');
                    setShowMobileFilters(false);
                  }}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 py-3 px-4 rounded-lg font-medium text-white transition-colors"
                  style={{ backgroundColor: '#d42027' }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  studio_studio_types: searchParams.get('studioTypes')?.split(',') || searchParams.get('studio_type')?.split(',') || [],
                  studio_services: searchParams.get('services')?.split(',') || [],
                  sortBy: searchParams.get('sortBy') || 'name',
                  sort_order: searchParams.get('sort_order') || 'asc',
                  radius: parseInt(searchParams.get('radius') || '10'),
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
                {/* Desktop: Map Section - Always shown at top */}
                <div className="hidden lg:block h-[400px]">
                  <GoogleMap
                    key={`map-${searchResults.searchCoordinates ? `${searchResults.searchCoordinates.lat}-${searchResults.searchCoordinates.lng}` : 'global'}`}
                    center={searchResults.searchCoordinates 
                      ? { lat: searchResults.searchCoordinates.lat, lng: searchResults.searchCoordinates.lng }
                      : { lat: 20, lng: 0 }
                    }
                    zoom={searchResults.searchCoordinates ? 10 : 2}
                    markers={(searchResults.mapMarkers || searchResults.studios)
                      .filter(studio => studio.latitude && studio.longitude)
                      .map(studio => ({
                        id: studio.id,
                        position: { lat: studio.latitude!, lng: studio.longitude! },
                        title: studio.name,
                        studio_type: studio.studio_studio_types && studio.studio_studio_types.length > 0 && studio.studio_studio_types[0] ? studio.studio_studio_types[0].studio_type : 'VOICEOVER',
                        is_verified: studio.is_verified,
                        onClick: () => {
                          selectStudio(studio.id);
                        },
                        ...('owner' in studio && studio.owner ? {
                          studio: {
                            id: studio.id,
                            name: studio.name,
                            owner: { username: studio.owner.username },
                            studio_images: ('images' in studio && studio.studio_images) ? studio.studio_images: [],
                          }
                        } : {}),
                      }))}
                    searchCenter={searchResults.searchCoordinates || null}
                    searchRadius={parseInt(searchParams.get('radius') || '10')}
                    selectedMarkerId={null}
                    height="100%"
                    className="rounded-lg border border-gray-200"
                  />
                </div>

                {/* Mobile: Conditional Map View */}
                {mobileView === 'map' && (
                  <div className="lg:hidden h-[500px]">
                    <GoogleMap
                      key={`mobile-map-${searchResults.searchCoordinates ? `${searchResults.searchCoordinates.lat}-${searchResults.searchCoordinates.lng}` : 'global'}`}
                      center={searchResults.searchCoordinates 
                        ? { lat: searchResults.searchCoordinates.lat, lng: searchResults.searchCoordinates.lng }
                        : { lat: 20, lng: 0 }
                      }
                      zoom={searchResults.searchCoordinates ? 10 : 2}
                      markers={(() => {
                        const allStudios = (searchResults.mapMarkers || searchResults.studios);
                        const studiosWithCoords = allStudios.filter(studio => studio.latitude && studio.longitude);
                        const studiosWithoutCoords = allStudios.filter(studio => !studio.latitude || !studio.longitude);
                        
                        if (studiosWithoutCoords.length > 0) {
                          console.warn('⚠️ Studios missing coordinates:', studiosWithoutCoords.map(s => ({ 
                            id: s.id, 
                            name: s.name, 
                            address: s.address,
                            lat: s.latitude,
                            lng: s.longitude 
                          })));
                        }
                        
                        console.log(`📍 Map markers: ${studiosWithCoords.length}/${allStudios.length} studios have coordinates`);
                        
                        return studiosWithCoords.map(studio => ({
                        id: studio.id,
                        position: { lat: studio.latitude!, lng: studio.longitude! },
                        title: studio.name,
                        studio_type: studio.studio_studio_types && studio.studio_studio_types.length > 0 && studio.studio_studio_types[0] ? studio.studio_studio_types[0].studio_type : 'VOICEOVER',
                        is_verified: studio.is_verified,
                        onClick: () => {
                          // Switch to list view and select studio (with page navigation if needed)
                          setMobileView('list');
                            setTimeout(() => {
                              selectStudio(studio.id);
                            }, 100);
                          },
                          ...('owner' in studio && studio.owner ? {
                            studio: {
                              id: studio.id,
                              name: studio.name,
                              owner: { username: studio.owner.username },
                              studio_images: ('images' in studio && studio.studio_images) ? studio.studio_images: [],
                            }
                          } : {}),
                        }));
                      })()}
                      searchCenter={searchResults.searchCoordinates || null}
                      searchRadius={parseInt(searchParams.get('radius') || '10')}
                      selectedMarkerId={null}
                      height="100%"
                      className="rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                {/* Results Header with Active Filters - Below map, above cards */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <p className="text-black">
                      Showing {searchResults.pagination.totalCount === 0 ? '0-0' : `${((searchResults.pagination.page - 1) * searchResults.pagination.limit) + 1}-${Math.min(searchResults.pagination.page * searchResults.pagination.limit, searchResults.pagination.totalCount)}`} of {searchResults.pagination.totalCount} studios
                    </p>
                    {/* Active Filters Display */}
                    {(searchParams.get('location') || searchParams.get('studio_type') || searchParams.get('services') || searchParams.get('radius')) && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-secondary">•</span>
                        <div className="flex flex-wrap gap-2">
                          {searchParams.get('location') && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-black">
                              📍 {abbreviateAddress(searchParams.get('location')!)}
                            </span>
                          )}
                          {searchParams.get('studio_type') && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              🎙️ {searchParams.get('studio_type')?.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Studio
                            </span>
                          )}
                          {searchParams.get('services') && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              ⚙️ {searchParams.get('services')?.split(',').length} Service{searchParams.get('services')?.split(',').length !== 1 ? 's' : ''}
                            </span>
                          )}
                          {searchParams.get('radius') && searchParams.get('location') && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              📏 {searchParams.get('radius')} miles
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Studios List - Desktop: Always shown, Mobile: Only in list view */}
                <div className={`${mobileView === 'map' ? 'hidden lg:block' : 'block'}`}>
                  <StudiosList
                    studios={searchResults.studios}
                    pagination={searchResults.pagination}
                    onPageChange={handlePageChange}
                  />
                </div>
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

