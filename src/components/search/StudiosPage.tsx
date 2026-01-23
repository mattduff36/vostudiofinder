'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchFilters } from './SearchFilters';
import { StudiosList } from './StudiosList';
import { GoogleMap } from '@/components/maps/GoogleMap';
import { FilterDrawer } from './mobile/FilterDrawer';
import { MapCollapsible } from './mobile/MapCollapsible';
import { abbreviateAddress } from '@/lib/utils/address';
import Image from 'next/image';
import { StudioMarkerModal } from '@/components/maps/StudioMarkerModal';
import { logger } from '@/lib/logger';
import { Footer } from '@/components/home/Footer';
import { SelectedStudioDetails } from './SelectedStudioDetails';
import { Button } from '@/components/ui/Button';
import { showWarning } from '@/lib/toast';
import { formatStudioTypeLabel } from '@/lib/utils/studio-types';
import { useScrollDrivenNav } from '@/hooks/useScrollDrivenNav';

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
  owner?: {
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
    show_exact_location: boolean;
    studio_studio_types: Array<{ studio_type: string }>;
    is_verified: boolean;
    users?: {
      username?: string | null;
      avatar_url?: string | null;
    };
    studio_images?: Array<{ image_url: string; alt_text?: string }>;
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
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [viewedStudioIds, setViewedStudioIds] = useState<string[]>([]); // Track viewing history
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isFilteringByMapArea, setIsFilteringByMapArea] = useState(false);
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Studio marker modal state
  const [modalStudio, setModalStudio] = useState<{
    id: string;
    name: string;
    users?: { username: string };
    studio_images?: Array<{ image_url: string; alt_text?: string }>;
    position: { x: number; y: number };
  } | null>(null);
  
  // Check if we're on mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Mobile-only: Smooth scroll-driven animation to sync with top navbar
  const { translateY: navTranslateY } = useScrollDrivenNav({ 
    navHeight: 64, // Mobile navbar height (matches top-16 = 4rem = 64px)
    scrollThreshold: 3,
    enabled: isMobile
  });

  // Generate dynamic H1 text based on location and studio type
  const dynamicH1Text = useMemo(() => {
    const location = searchParams.get('location');
    const studioTypesParam = searchParams.get('studioTypes');
    const studioTypes = studioTypesParam ? studioTypesParam.split(',').filter(Boolean) : [];
    
    // If exactly one studio type is selected, use it in the heading
    if (studioTypes.length === 1 && studioTypes[0]) {
      const studioTypeLabel = formatStudioTypeLabel(studioTypes[0]) || 'Studio';
      const pluralLabel = studioTypeLabel.includes('Studio') 
        ? studioTypeLabel + 's' // e.g., "Home Studios"
        : studioTypeLabel + ' Studios'; // e.g., "Audio Producer Studios"
      
      if (location && location.trim()) {
        return `${pluralLabel} Available in ${location}`;
      }
      return `${pluralLabel} Available Worldwide`;
    }
    
    // Default behavior for no types or multiple types selected
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

  // Fetch a single studio and add it to results (similar to Load More)
  const fetchAndAddStudio = async (studioId: string) => {
    if (!searchResults) return;
    
    // Double-check if studio already exists before fetching
    const alreadyExists = searchResults.studios.some(s => s.id === studioId);
    if (alreadyExists) {
      logger.log('⏭️ Studio already in results, skipping fetch');
      return;
    }
    
    try {
      logger.log(`📡 Fetching studio ${studioId} to add to results...`);
      
      // Use the existing search API with current filters but target the specific studio
      const params = new URLSearchParams();
      searchParams.forEach((value, key) => {
        params.set(key, value);
      });
      
      // Search for this specific studio ID
      params.set('studioId', studioId);
      params.set('limit', '1');
      
      const response = await fetch(`/api/studios/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.studios && data.studios.length > 0) {
          const fetchedStudio = data.studios[0];
          
          // Add the fetched studio to the existing results
          setSearchResults(prev => {
            if (!prev) return data;
            
            // Final check to prevent duplicates (in case of race conditions)
            const stillExists = prev.studios.some(s => s.id === fetchedStudio.id);
            if (stillExists) {
              logger.log('⚠️ Race condition: Studio already added, skipping');
              return prev;
            }
            
            return {
              ...prev,
              studios: [...prev.studios, fetchedStudio], // Add to end of array
            };
          });
          logger.log('✅ Studio added to results');
        } else {
          console.warn('⚠️ No studio data returned from API');
        }
      } else {
        logger.error('❌ API request failed:', response.status);
      }
    } catch (error) {
      logger.error('❌ Error fetching studio:', error);
    }
  };

  // Stable marker click handler (doesn't depend on selectedStudioId)
  const handleMarkerClick = useCallback(async (studioData: any, event: any) => {
    // Close any existing modal
    setModalStudio(null);
    
    // Clear previous selection outline and update history
    setSelectedStudioId(prev => {
      if (prev) {
        const previousElement = document.getElementById(`studio-${prev}`);
        if (previousElement) {
          previousElement.style.outline = '';
          previousElement.style.outlineOffset = '';
          previousElement.classList.remove('animate-bounce-once');
        }
      }
      return studioData.id;
    });
    
    // Update viewing history separately (no race condition)
    setViewedStudioIds(prevIds => {
      const filtered = prevIds.filter(id => id !== studioData.id);
      return [studioData.id, ...filtered];
    });
    
    // Check if studio is in current results, if not fetch it
    if (searchResults) {
      const studioInResults = searchResults.studios.find(s => s.id === studioData.id);
      if (!studioInResults) {
        await fetchAndAddStudio(studioData.id);
      }
    }
    
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
  }, [searchResults, searchParams]); // Dependencies for fetchAndAddStudio

  // Monitor fullscreen state for hiding mobile controls
  useEffect(() => {
    const checkFullscreen = () => {
      setIsMapFullscreen(document.documentElement.hasAttribute('data-map-fullscreen'));
    };

    // Check initially
    checkFullscreen();

    // Create observer for attribute changes
    const observer = new MutationObserver(checkFullscreen);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-map-fullscreen']
    });

    return () => observer.disconnect();
  }, []);

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
        show_exact_location: (studio as any).show_exact_location ?? true,
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

  // Count visible markers on the map (for showing/hiding Filter by Map Area button)
  const visibleMarkerCount = useMemo(() => {
    if (!mapBounds || !memoizedMarkers.length) return memoizedMarkers.length;
    
    return memoizedMarkers.filter(marker => {
      const lat = marker.position.lat;
      const lng = marker.position.lng;
      
      return (
        lat >= mapBounds.south &&
        lat <= mapBounds.north &&
        lng >= mapBounds.west &&
        lng <= mapBounds.east
      );
    }).length;
  }, [memoizedMarkers, mapBounds]);

  // Calculate studio type counts from all map markers (for filter result counts)
  const studioTypeCounts = useMemo(() => {
    if (!searchResults?.mapMarkers) return {};
    
    const counts: Record<string, number> = {};
    
    searchResults.mapMarkers.forEach(marker => {
      marker.studio_studio_types.forEach(({ studio_type }) => {
        counts[studio_type] = (counts[studio_type] || 0) + 1;
      });
    });
    
    return counts;
  }, [searchResults?.mapMarkers]);

  // Studios filtered by map area - fetched separately
  const [mapAreaStudios, setMapAreaStudios] = useState<Studio[]>([]);
  const [loadingMapArea, setLoadingMapArea] = useState(false);

  // Fetch studios by their IDs when filtering by map area
  useEffect(() => {
    if (!isFilteringByMapArea || !mapBounds || !memoizedMarkers.length) {
      setMapAreaStudios([]);
      return;
    }

    const fetchMapAreaStudios = async () => {
      setLoadingMapArea(true);
      logger.log('🗺️ Fetching studios for map area filter');
      
      // Get all marker IDs within map bounds
      const studioIdsInBounds = memoizedMarkers
        .filter(marker => {
          const lat = marker.position.lat;
          const lng = marker.position.lng;
          return (
            lat >= mapBounds.south &&
            lat <= mapBounds.north &&
            lng >= mapBounds.west &&
            lng <= mapBounds.east
          );
        })
        .map(marker => marker.id);

      logger.log(`📍 Found ${studioIdsInBounds.length} markers in map bounds`);

      if (studioIdsInBounds.length === 0) {
        setMapAreaStudios([]);
        setLoadingMapArea(false);
        return;
      }

      try {
        // Fetch all studios with those IDs
        const params = new URLSearchParams();
        params.set('ids', studioIdsInBounds.join(','));
        params.set('limit', '1000'); // Get all studios
        
        const response = await fetch(`/api/studios/search?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          logger.log(`✅ Fetched ${data.studios.length} studios for map area`);
          setMapAreaStudios(data.studios);
        } else {
          logger.error('❌ Failed to fetch map area studios');
          setMapAreaStudios([]);
        }
      } catch (error) {
        logger.error('❌ Error fetching map area studios:', error);
        setMapAreaStudios([]);
      } finally {
        setLoadingMapArea(false);
      }
    };

    fetchMapAreaStudios();
  }, [isFilteringByMapArea, mapBounds, memoizedMarkers]);

  // Reorder studios based on viewing history, and exclude currently selected studio
  const displayStudios = useMemo(() => {
    if (!searchResults) return [];
    
    // When filtering by map area, use the fetched map area studios
    let studiosForGrid: Studio[];
    
    if (isFilteringByMapArea && mapAreaStudios.length > 0) {
      logger.log(`🗺️ Using ${mapAreaStudios.length} studios from map area filter`);
      studiosForGrid = mapAreaStudios.filter(studio => studio.id !== selectedStudioId);
    } else if (isFilteringByMapArea && loadingMapArea) {
      // Still loading map area studios
      return [];
    } else {
      // Normal mode: use search results and filter out selected studio
      studiosForGrid = searchResults.studios.filter(
        studio => studio.id !== selectedStudioId
      );
    }
    
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
  }, [searchResults, selectedStudioId, viewedStudioIds, isFilteringByMapArea, mapAreaStudios, loadingMapArea]);

  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  // Auto-clear map-area filtering when returning to Map tab on mobile
  useEffect(() => {
    if (mobileView === 'map' && isFilteringByMapArea) {
      setIsFilteringByMapArea(false);
    }
  }, [mobileView, isFilteringByMapArea]);

  // Allow document scroll on mobile to enable iOS toolbar auto-hide
  // The map view is now properly constrained without blocking document scroll

  // Search function - for initial load or filter changes
  const performSearch = async (params: URLSearchParams, resetOffset: boolean = true) => {
    setLoading(true);
    if (resetOffset) {
      params.set('offset', '0');
      params.set('limit', '30'); // Initial load: 30 studios
    }
    try {
      const response = await fetch(`/api/studios/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        logger.error('Search failed:', response.status, response.statusText);
      }
    } catch (error) {
      logger.error('Search error:', error);
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
        logger.error('Load more failed:', response.status, response.statusText);
      }
    } catch (error) {
      logger.error('Load more error:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Initial search on component mount
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    performSearch(params);
  }, [searchParams.toString()]);


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

  // Handle map bounds changes
  const handleBoundsChanged = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    logger.log('🗺️ Map bounds changed:', bounds);
    // Only update if bounds have changed significantly (to avoid infinite loops during animations)
    setMapBounds(prevBounds => {
      if (!prevBounds) return bounds;
      
      const threshold = 0.0001; // ~11 meters
      const hasChanged = 
        Math.abs(prevBounds.north - bounds.north) > threshold ||
        Math.abs(prevBounds.south - bounds.south) > threshold ||
        Math.abs(prevBounds.east - bounds.east) > threshold ||
        Math.abs(prevBounds.west - bounds.west) > threshold;
      
      return hasChanged ? bounds : prevBounds;
    });
  }, []);

  // Toggle filtering by map area
  const handleFilterByMapArea = useCallback(() => {
    setIsFilteringByMapArea(prev => {
      const newValue = !prev;
      logger.log('🗺️ Filtering by map area:', newValue);
      logger.log('📍 Current mapBounds:', mapBounds);
      logger.log('📊 Total studios in search results:', searchResults?.studios.length || 0);
      
      // If enabling filtering but mapBounds is null, warn the user
      if (newValue && !mapBounds) {
        logger.warn('⚠️ mapBounds is null! Attempting to get current bounds from map...');
        // The map bounds should update shortly via the bounds_changed listener
        // Return false to prevent enabling until bounds are available
        showWarning('Please wait for the map to fully load before filtering by map area.');
        return false;
      }
      
      return newValue;
    });
  }, [mapBounds, searchResults]);

  const handleSearch = (filters: Record<string, any>) => {
    logger.log('🔍 HandleSearch called with filters:', filters);
    
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
          logger.log(`📍 Added coordinate ${key}: ${value}`);
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
      logger.log('📍 Preserved coordinates from URL:', { lat: currentLat, lng: currentLng });
    } else if (filters.hasOwnProperty('lat') && filters.lat === undefined) {
      logger.log('📍 Coordinates explicitly cleared - not preserving from URL');
    }

    // Reset to first page when searching
    params.set('page', '1');
    
    logger.log('🚀 Final URL params:', params.toString());
    router.push(`/studios?${params.toString()}`);
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
    <div className={`${mobileView === 'map' ? 'min-h-0 md:min-h-screen' : 'min-h-screen'} flex flex-col bg-white relative -mt-20 overflow-x-hidden w-full max-w-full ${mobileView === 'map' ? '-mb-16 md:mb-0' : ''}`}>
      {/* Background Image for main content */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none overflow-hidden">
        <Image
          src="/background-images/21920-5.jpg"
          alt="Studios page background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1">
        {/* Header Section - Simplified */}
        <div className="relative overflow-hidden pt-20" style={{ height: '180px' }}>
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
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-center" style={{ height: '100px' }}>
          <div className="text-center">
            <h1 
              className="font-bold px-2" 
              style={{ 
                color: '#ffffff',
                fontSize: 'clamp(1.25rem, 3.5vw, 2rem)', // Responsive: 20px (mobile) to 32px (desktop)
                marginTop: '0.25rem',
                whiteSpace: 'normal', // Allow text wrapping for long location names
                lineHeight: '1.2'
              }}
            >
              {dynamicH1Text}
            </h1>
            <h2 
              className="font-normal px-2 hidden sm:block"
              style={{ 
                color: '#ffffff',
                fontSize: 'clamp(0.75rem, 1.5vw, 1rem)', // Responsive: 12px (mobile) to 16px (desktop)
                marginTop: '0.5rem',
                marginBottom: '0.5rem'
              }}
            >
              Find voiceover, recording and podcast studios near you
            </h2>
          </div>
        </div>
      </div>


      {/* Mobile Controls */}
      <div 
        className={`lg:hidden sticky top-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 shadow-sm ${isMapFullscreen ? 'hidden' : 'z-30'}`}
        style={isMobile ? {
          transform: `translateY(-${navTranslateY}px)`,
          transition: 'none', // Let scroll drive the animation
        } : undefined}
      >
        <div className="flex space-x-2 sm:space-x-3">
          {/* Filter Button - changes to "Filter by Visible Studios" on Map tab when ≤30 markers visible */}
          {(() => {
            const canFilterByVisibleStudios = !loading && !!mapBounds && visibleMarkerCount <= 30;
            
            const showFilterByVisibleStudios = 
              mobileView === 'map' && 
              canFilterByVisibleStudios && 
              !isFilteringByMapArea;
            
            const handleClick = () => {
              if (showFilterByVisibleStudios) {
                // Run map area filter and switch to list view
                handleFilterByMapArea();
                setMobileView('list');
              } else {
                // Normal behavior: open filter drawer
                setShowMobileFilters(true);
              }
            };
            
            if (showFilterByVisibleStudios) {
              // Use Button component with outline variant for red styling to match desktop
              return (
                <div className="flex-1">
                  <Button
                    onClick={handleClick}
                    variant="outline"
                    className="w-full py-2.5 sm:py-3 text-sm sm:text-base"
                    aria-label="Filter by visible studios"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Filter by Visible Studios
                  </Button>
                </div>
              );
            }
            
            // Normal filters button
            return (
              <button
                onClick={handleClick}
                className="flex items-center justify-center flex-1 py-2.5 sm:py-3 px-3 sm:px-4 bg-white border-2 border-gray-300 rounded-lg font-medium text-sm sm:text-base text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 relative"
                aria-label="Open filters"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                </svg>
                Filters
              </button>
            );
          })()}

          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMobileView('list')}
              className={`flex items-center justify-center px-2.5 sm:px-3 py-2 rounded-md font-medium text-xs sm:text-sm transition-all duration-200 ${
                mobileView === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-label="List view"
              aria-pressed={mobileView === 'list'}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="hidden xs:inline">List</span>
            </button>
            <button
              onClick={() => setMobileView('map')}
              className={`flex items-center justify-center px-2.5 sm:px-3 py-2 rounded-md font-medium text-xs sm:text-sm transition-all duration-200 ${
                mobileView === 'map'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-label="Map view"
              aria-pressed={mobileView === 'map'}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="hidden xs:inline">Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer - Phase 2 */}
      <FilterDrawer
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        initialFilters={mobileFiltersInitialState}
        onSearch={handleSearch}
        onFilterByMapArea={handleFilterByMapArea}
        isFilteringByMapArea={isFilteringByMapArea}
        visibleMarkerCount={visibleMarkerCount}
        filterByMapAreaMaxMarkers={30}
        isMapReady={!loading && !!mapBounds}
        studioTypeCounts={studioTypeCounts}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1 hidden lg:block">
            <div>
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
              onFilterByMapArea={handleFilterByMapArea}
              isFilteringByMapArea={isFilteringByMapArea}
              visibleMarkerCount={visibleMarkerCount}
              filterByMapAreaMaxMarkers={30}
              isMapReady={!loading && !!mapBounds}
              studioTypeCounts={studioTypeCounts}
            />

              {/* Selected Studio Card - Shows when a map marker is clicked */}
              {selectedStudioId && searchResults && (() => {
                const selectedStudio = searchResults.studios.find(s => s.id === selectedStudioId);
                
                if (!selectedStudio) {
                  // Show loading state while studio is being fetched
                  return (
                    <div className="mt-4">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Selected Studio
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 shadow-lg px-6 py-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderBottomColor: '#d42027' }}></div>
                        <p className="mt-4 text-sm text-gray-500">Loading studio details...</p>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <SelectedStudioDetails
                    studio={selectedStudio}
                  />
                );
              })()}
            </div>
          </aside>

          {/* Results Area */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderBottomColor: '#d42027' }}></div>
                <p className="mt-4 text-text-secondary">Searching studios...</p>
              </div>
            ) : searchResults ? (
              <div className={`${mobileView === 'map' ? 'md:space-y-6' : 'space-y-6'}`}>
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
                    onBoundsChanged={handleBoundsChanged}
                    height="100%"
                    className="rounded-lg border border-gray-200"
                  />
                </div>

                {/* Mobile: Map - Only show on Map View tab */}
                {mobileView === 'map' && (
                  <MapCollapsible
                      markers={searchResults.mapMarkers || searchResults.studios}
                      center={searchResults.searchCoordinates 
                        ? { lat: searchResults.searchCoordinates.lat, lng: searchResults.searchCoordinates.lng }
                        : { lat: 20, lng: 0 }
                      }
                      zoom={searchResults.searchCoordinates ? 10 : 2}
                      searchCenter={searchResults.searchCoordinates || null}
                      searchRadius={parseInt(searchParams.get('radius') || '10')}
                      onMarkerClick={handleMarkerClick}
                      onBoundsChanged={handleBoundsChanged}
                      selectedMarkerId={null}
                    />
                  )
                }

                {/* Active Filters Display - Below map, above cards */}
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Studios Found Badge - Show when we have results and not loading */}
                  {!loading && 
                   searchResults && 
                   searchResults.pagination && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-50 text-red-700 border border-red-200">
                      {isFilteringByMapArea && mapAreaStudios.length > 0 
                        ? `${mapAreaStudios.length} ${mapAreaStudios.length === 1 ? 'Studio' : 'Studios'} Found`
                        : `${searchResults.pagination.totalCount} ${searchResults.pagination.totalCount === 1 ? 'Studio' : 'Studios'} Found`
                      }
                    </span>
                  )}
                  
                  {/* Filter badges - Only show when filters are applied */}
                  {(searchParams.get('location') || searchParams.get('studioTypes') || searchParams.get('studio_type') || searchParams.get('services') || searchParams.get('radius')) && (
                    <>
                    {searchParams.get('location') && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-black">
                        📍 {abbreviateAddress(searchParams.get('location')!)}
                      </span>
                    )}
                    {searchParams.get('studio_type') && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        🎙️ {formatStudioTypeLabel(searchParams.get('studio_type')!)}
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
                    </>
                  )}
                </div>

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
      </main>
      
      {/* Footer - Desktop only */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}

