'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchFilters } from './SearchFilters';
import { StudiosList } from './StudiosList';
import { GoogleMap } from '@/components/maps/GoogleMap';
import { abbreviateAddress } from '@/lib/utils/address';
import Image from 'next/image';
import { StudioMarkerModal } from '@/components/maps/StudioMarkerModal';
import { Footer } from '@/components/home/Footer';
import { SelectedStudioDetails } from './SelectedStudioDetails';

interface Studio {
  id: string;
  name: string;
  description: string;
  studio_studio_types: Array<{ studio_type: string }>;
  address: string;
  city?: string;
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
  studio_images: Array<{ image_url: string; alt_text?: string }>;
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
    offset: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    hasMore?: boolean; // New flag for load-more pattern
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFilterSticky, setIsFilterSticky] = useState(false);
  const [stickyStyles, setStickyStyles] = useState<{width: number; left: number} | null>(null);
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [viewedStudioIds, setViewedStudioIds] = useState<string[]>([]); // Track viewing history
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Studio marker modal state
  const [modalStudio, setModalStudio] = useState<{
    id: string;
    name: string;
    users?: { username: string };
    studio_images?: Array<{ image_url: string; alt_text?: string }>;
    position: { x: number; y: number };
  } | null>(null);

  // Generate dynamic H1 text based on location
  const dynamicH1Text = useMemo(() => {
    const location = searchParams.get('location');
    if (location && location.trim()) {
      return `Studios Available in ${location}`;
    }
    return 'Studios Available Worldwide';
  }, [searchParams]);

  // Function to close the modal
  const handleCloseModal = useCallback(() => {
    setModalStudio(null);
    // Keep the outline on the card when modal closes
  }, []);

  // Stable marker click handler (doesn't depend on selectedStudioId)
  const handleMarkerClick = useCallback((studioData: any, event: any) => {
    // Close any existing modal
    setModalStudio(null);
    
    // Clear previous selection outline
    setSelectedStudioId(prev => {
      if (prev) {
        const previousElement = document.getElementById(`studio-${prev}`);
        if (previousElement) {
          previousElement.style.outline = '';
          previousElement.style.outlineOffset = '';
          previousElement.classList.remove('animate-bounce-once');
        }
        
        // Add to viewing history
        if (prev !== studioData.id) {
          setViewedStudioIds(prevIds => {
            const filtered = prevIds.filter(id => id !== prev);
            return [prev, ...filtered];
          });
        }
      }
      return studioData.id;
    });
    
    // Apply outline to newly selected studio card if it exists on current page
    // Use setTimeout to ensure the DOM is ready after state update
    setTimeout(() => {
      const newElement = document.getElementById(`studio-${studioData.id}`);
      if (newElement) {
        newElement.style.outline = '2px solid #dc2626'; // red-600
        newElement.style.outlineOffset = '2px';
      }
    }, 0);
    
    // Open modal
    const markerPosition = {
      x: event?.clientX || window.innerWidth / 2,
      y: event?.clientY || window.innerHeight / 2,
    };
    
    setModalStudio({
      id: studioData.id,
      name: studioData.name,
      users: studioData.users,
      studio_images: studioData.studio_images,
      position: markerPosition,
    });
  }, []); // No dependencies - uses setters with callbacks

  // Memoize markers array to prevent unnecessary re-renders
  const memoizedMarkers = useMemo(() => {
    if (!searchResults) return [];
    
    const allStudios = searchResults.mapMarkers || searchResults.studios;
    
    return allStudios
      .filter(studio => studio.latitude && studio.longitude)
      .map(studio => ({
        id: studio.id,
        position: { lat: studio.latitude!, lng: studio.longitude! },
        title: studio.name,
        studio_type: studio.studio_studio_types && studio.studio_studio_types.length > 0 && studio.studio_studio_types[0] ? studio.studio_studio_types[0].studio_type : 'VOICEOVER',
        is_verified: studio.is_verified,
        onClick: (event: any) => {
          const studioData: any = studio;
          // mapMarkers use 'users', studios use 'owner'
          const userData = studioData.users || studioData.owner;
          handleMarkerClick({
            id: studio.id,
            name: studio.name,
            users: userData?.username ? { 
              username: userData.username,
              avatar_url: userData.avatar_url 
            } : undefined,
            studio_images: studioData.studio_images || [],
          }, event);
        },
        ...((() => {
          const studioData: any = studio;
          // mapMarkers use 'users', studios use 'owner'
          const userData = studioData.users || studioData.owner;
          return userData?.username ? {
            studio: {
              id: studio.id,
              name: studio.name,
              owner: { 
                username: userData.username,
                avatar_url: userData.avatar_url 
              },
              studio_images: studioData.studio_images || [],
            }
          } : {};
        })()),
      }));
  }, [searchResults, handleMarkerClick]);

  // Reorder studios based on viewing history, and exclude currently selected studio
  const displayStudios = useMemo(() => {
    if (!searchResults) return [];
    
    // Filter out the currently selected studio (it will be shown in the filter sidebar)
    const studiosForGrid = searchResults.studios.filter(
      studio => studio.id !== selectedStudioId
    );
    
    // Separate viewed and not-viewed studios
    const viewedStudios: Studio[] = [];
    const otherStudios: Studio[] = [];
    
    studiosForGrid.forEach(studio => {
      if (viewedStudioIds.includes(studio.id)) {
        viewedStudios.push(studio);
      } else {
        otherStudios.push(studio);
      }
    });
    
    // Sort viewed studios by their position in viewedStudioIds array
    viewedStudios.sort((a, b) => {
      const indexA = viewedStudioIds.indexOf(a.id);
      const indexB = viewedStudioIds.indexOf(b.id);
      return indexA - indexB;
    });
    
    // Return viewed studios first, then other studios
    return [...viewedStudios, ...otherStudios];
  }, [searchResults, selectedStudioId, viewedStudioIds]);

  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const filterSidebarRef = useRef<HTMLDivElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // Search function - for initial load or filter changes
  const performSearch = async (params: URLSearchParams, resetOffset: boolean = true) => {
    setLoading(true);
    if (resetOffset) {
      params.set('offset', '0');
      params.set('limit', '18'); // Initial load: 18 studios
    }
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

  // Load more function - append results
  const loadMore = async () => {
    if (!searchResults || loadingMore || !searchResults.pagination.hasMore) return;
    
    setLoadingMore(true);
    // Use the actual number of studios currently loaded as the offset
    const newOffset = searchResults.studios.length;
    const limit = 12; // Load 12 more studios each time
    
    try {
      const params = new URLSearchParams();
      
      // Copy all current search params
      searchParams.forEach((value, key) => {
        if (key !== 'offset' && key !== 'limit') {
          params.set(key, value);
        }
      });
      
      params.set('offset', newOffset.toString());
      params.set('limit', limit.toString());
      
      const response = await fetch(`/api/studios/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(prev => {
          if (!prev) return data;
          return {
            ...data,
            studios: [...prev.studios, ...data.studios], // Append new studios
          };
        });
      } else {
        console.error('Load more failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoadingMore(false);
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
            if (!heroSectionRef.current || !filterSidebarRef.current || !footerRef.current) {
              ticking = false;
              return;
            }
            
            const heroSection = heroSectionRef.current;
            const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
            const navbarHeight = 80; // Approximate navbar height
            const scrollPosition = window.scrollY + navbarHeight;
            
            // Check if we're past the hero section
            const isPastHero = scrollPosition >= heroBottom;
            
            // Check if the sidebar would overlap the footer
            const footer = footerRef.current;
            const footerTop = footer.offsetTop;
            const sidebarElement = filterSidebarRef.current;
            const sidebarHeight = sidebarElement.offsetHeight;
            
            // Calculate where the bottom of the sidebar would be if it's sticky
            const stickyTop = navbarHeight + 32; // 80px navbar + 32px padding (top-8)
            const sidebarBottom = window.scrollY + stickyTop + sidebarHeight;
            
            // Sidebar should be sticky if:
            // 1. We're past the hero section AND
            // 2. The sidebar bottom wouldn't overlap the footer (with 32px buffer)
            const shouldBeSticky = isPastHero && (sidebarBottom < footerTop - 32);
            
            // Only update if state actually changes
            if (shouldBeSticky !== isFilterSticky) {
              // Calculate dimensions when transitioning to sticky
              if (shouldBeSticky) {
                const sidebarRect = sidebarElement.getBoundingClientRect();
                const sidebarLeft = sidebarRect.left;
                
                setStickyStyles({
                  width: sidebarRect.width,
                  left: sidebarLeft
                });
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

  // Clear selection and viewing history when search parameters change (new search from URL)
  useEffect(() => {
    if (selectedStudioId) {
      const previousElement = document.getElementById(`studio-${selectedStudioId}`);
      if (previousElement) {
        previousElement.style.outline = '';
        previousElement.style.outlineOffset = '';
        previousElement.classList.remove('animate-bounce-once');
      }
    }
    setSelectedStudioId(null);
    setViewedStudioIds([]); // Clear viewing history on new search
  }, [searchParams.toString()]);

  // Handle pending studio selection after navigation
  // Removed old pendingStudioSelection logic - no longer needed with modal approach

  const handleSearch = (filters: Record<string, any>) => {
    console.log('🔍 HandleSearch called with filters:', filters);
    
    // Clear any selected studio and viewing history when performing a new search
    if (selectedStudioId) {
      const previousElement = document.getElementById(`studio-${selectedStudioId}`);
      if (previousElement) {
        previousElement.style.outline = '';
        previousElement.style.outlineOffset = '';
        previousElement.classList.remove('animate-bounce-once');
      }
    }
    setSelectedStudioId(null);
    setViewedStudioIds([]); // Clear viewing history on new search
    
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
            // Normalize studio_studio_types to studioTypes for URL
            const paramKey = key === 'studio_studio_types' ? 'studioTypes' : key;
            params.set(paramKey, value.join(','));
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
        <div className="relative z-10 max-w-7xl mx-auto px-6 flex items-center justify-center" style={{ height: '120px' }}>
          <div className="text-center">
            <h1 
              className="font-bold" 
              style={{ 
                color: '#ffffff',
                fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', // Responsive: 24px (mobile) to 32px (desktop) - reduced desktop
                marginTop: '0.25rem', // Reduced from mt-2 (0.5rem) by 50%
                whiteSpace: 'normal' // Allow text wrapping for long location names
              }}
            >
              {dynamicH1Text}
            </h1>
            <h2 
              className="font-normal"
              style={{ 
                color: '#ffffff',
                fontSize: 'clamp(0.75rem, 1.5vw, 1rem)', // Responsive: 12px (mobile) to 16px (desktop) - increased desktop
                marginTop: '-1rem', // Increased negative margin to pull even closer
                marginBottom: '0.5rem' // Added bottom padding (same as original mt-2)
              }}
            >
              Find voiceover, recording and podcast studios near you
            </h2>
          </div>
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

              {/* Selected Studio Card - Shows when a map marker is clicked */}
              {selectedStudioId && searchResults && (() => {
                // First try to find in paginated studios (has full data)
                let selectedStudio = searchResults.studios.find(s => s.id === selectedStudioId);
                
                // If not in paginated studios, look in mapMarkers (all studios, limited fields)
                if (!selectedStudio && searchResults.mapMarkers) {
                  const markerData = searchResults.mapMarkers.find(m => m.id === selectedStudioId);
                  if (markerData) {
                    // Convert mapMarker data to studio format (with limited fields)
                    selectedStudio = {
                      id: markerData.id,
                      name: markerData.name,
                      description: '', // Not available in mapMarkers
                      studio_studio_types: markerData.studio_studio_types || [],
                      address: '', // Not available in mapMarkers
                      city: undefined,
                      is_verified: markerData.is_verified,
                      latitude: markerData.latitude,
                      longitude: markerData.longitude,
                      owner: markerData.users ? {
                        id: '', // Not available in mapMarkers
                        display_name: '', // Not available in mapMarkers
                        username: markerData.users.username || '',
                        avatar_url: markerData.users.avatar_url,
                      } : {
                        id: '',
                        display_name: '',
                        username: '',
                      },
                      studio_services: [], // Not available in mapMarkers
                      studio_images: markerData.studio_images || [],
                      _count: { reviews: 0 }, // Not available in mapMarkers
                      is_premium: false,
                      website_url: undefined,
                      phone: undefined,
                    };
                  }
                }
                
                if (!selectedStudio) return null;
                
                return (
                  <SelectedStudioDetails
                    studio={{
                      id: selectedStudio.id,
                      name: selectedStudio.name,
                      description: selectedStudio.description,
                      city: selectedStudio.city,
                      address: selectedStudio.address,
                      is_verified: selectedStudio.is_verified,
                      owner: selectedStudio.owner,
                      studio_studio_types: selectedStudio.studio_studio_types,
                      studio_services: selectedStudio.studio_services,
                      studio_images: selectedStudio.studio_images,
                      _count: selectedStudio._count,
                    }}
                  />
                );
              })()}
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
                    markers={memoizedMarkers}
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
                      markers={memoizedMarkers}
                      searchCenter={searchResults.searchCoordinates || null}
                      searchRadius={parseInt(searchParams.get('radius') || '10')}
                      selectedMarkerId={null}
                      height="100%"
                      className="rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                {/* Active Filters Display - Below map, above cards */}
                {(searchParams.get('location') || searchParams.get('studio_type') || searchParams.get('services') || searchParams.get('radius')) && (
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
                )}

                {/* Studios List - Desktop: Always shown, Mobile: Only in list view */}
                <div className={`${mobileView === 'map' ? 'hidden lg:block' : 'block'}`}>
                  <StudiosList
                    studios={displayStudios}
                    pagination={searchResults.pagination}
                    onLoadMore={loadMore}
                    loadingMore={loadingMore}
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
      
      {/* Studio Marker Modal */}
      {modalStudio && (
        <StudioMarkerModal
          studio={{
            id: modalStudio.id,
            name: modalStudio.name,
            ...(modalStudio.users && { users: modalStudio.users }),
            ...(modalStudio.studio_images && { studio_images: modalStudio.studio_images }),
          }}
          position={modalStudio.position}
          onClose={handleCloseModal}
        />
      )}
      
      {/* Footer */}
      <div ref={footerRef}>
        <Footer />
      </div>
    </div>
  );
}

