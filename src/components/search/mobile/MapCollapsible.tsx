/**
 * MapCollapsible - Full-Screen Map View for Mobile
 * 
 * Always expanded on Map View tab, fills remaining viewport space
 * 
 * Only visible on mobile (< 768px).
 */
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapPin, Maximize2, Minimize2 } from 'lucide-react';
import { GoogleMap } from '@/components/maps/GoogleMap';

interface MapCollapsibleProps {
  markers: Array<{
    id: string;
    name: string;
    latitude?: number | null;
    longitude?: number | null;
    studio_studio_types: Array<{ studio_type: string }>;
    is_verified: boolean;
    users?: {
      username?: string | null;
      avatar_url?: string | null;
    };
    studio_images?: Array<{ image_url: string; alt_text?: string }>;
  }>;
  center: { lat: number; lng: number };
  zoom: number;
  searchCenter?: { lat: number; lng: number } | null;
  searchRadius?: number | null;
  onMarkerClick: (data: any, event: any) => void;
  onBoundsChanged?: ((bounds: { north: number; south: number; east: number; west: number }) => void) | undefined;
  selectedMarkerId?: string | null;
}

export function MapCollapsible({
  markers,
  center,
  zoom,
  searchCenter,
  searchRadius,
  onMarkerClick,
  onBoundsChanged,
  selectedMarkerId,
}: MapCollapsibleProps) {
  const markerCount = markers.length;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [supportsNativeFullscreen, setSupportsNativeFullscreen] = useState(false);
  
  // Use actual viewport height for iOS compatibility
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  
  useEffect(() => {
    // Function to get the actual visible viewport height
    const updateHeight = () => {
      // Use window.innerHeight which gives the actual visible viewport on iOS
      setViewportHeight(window.innerHeight);
    };
    
    // Set initial height
    updateHeight();
    
    // Check if native fullscreen API is supported (for Android/Desktop)
    setSupportsNativeFullscreen(!!document.documentElement.requestFullscreen);
    
    // Update on resize (when iOS toolbar shows/hides or orientation changes)
    window.addEventListener('resize', updateHeight);
    
    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Handle native fullscreen changes (Android/Desktop only)
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Only update if using native fullscreen (not iOS CSS-based)
      if (supportsNativeFullscreen) {
        setIsFullscreen(!!document.fullscreenElement);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [supportsNativeFullscreen]);

  // Lock body scroll when in CSS-based fullscreen (iOS)
  useEffect(() => {
    if (!supportsNativeFullscreen && isFullscreen) {
      // Prevent body scroll on iOS
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
      };
    }
    return undefined;
  }, [supportsNativeFullscreen, isFullscreen]);

  // Fullscreen toggle function - memoized to prevent recreation
  const toggleFullscreen = useCallback(async () => {
    if (supportsNativeFullscreen) {
      // Use native Fullscreen API (Android/Desktop)
      try {
        if (!document.fullscreenElement) {
          await mapContainerRef.current?.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.error('Error toggling fullscreen:', err);
      }
    } else {
      // Use CSS-based fullscreen (iOS)
      setIsFullscreen(!isFullscreen);
    }
  }, [supportsNativeFullscreen, isFullscreen]);

  // Wrap onMarkerClick to exit fullscreen before navigation - memoized to prevent recreation
  const handleMarkerClick = useCallback((data: any, event: any) => {
    // Exit fullscreen before opening modal/navigating
    if (supportsNativeFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (!supportsNativeFullscreen && isFullscreen) {
      // Exit CSS-based fullscreen on iOS
      setIsFullscreen(false);
    }
    onMarkerClick(data, event);
  }, [onMarkerClick, supportsNativeFullscreen, isFullscreen]);

  // Transform markers to GoogleMap format - memoized to prevent unnecessary recalculation
  const transformedMarkers = useMemo(() => {
    return markers
      .filter((m) => m.latitude && m.longitude)
      .map((marker) => ({
        id: marker.id,
        position: { lat: marker.latitude!, lng: marker.longitude! },
        title: marker.name,
        studio_type: marker.studio_studio_types[0]?.studio_type || 'VOICEOVER',
        is_verified: marker.is_verified,
        onClick: (event: any) => handleMarkerClick(marker, event),
        ...(marker.users?.username ? {
          studio: {
            id: marker.id,
            name: marker.name,
            owner: {
              username: marker.users.username,
              avatar_url: marker.users.avatar_url || undefined,
            },
            images: marker.studio_images?.map(img => ({
              imageUrl: img.image_url,
              ...(img.alt_text ? { alt_text: img.alt_text } : {}),
            })) || [],
          }
        } : {}),
      }));
  }, [markers, handleMarkerClick]);

  // Calculate map height using actual viewport for iOS compatibility - memoized
  const mapHeight = useMemo(() => {
    return viewportHeight 
      ? `${viewportHeight - 180 - 67 - 64 - 32}px` // Use measured viewport height
      : 'calc(100vh - 343px)'; // Fallback for SSR/initial render
  }, [viewportHeight]);

  return (
    <div 
      ref={mapContainerRef}
      className={`md:hidden bg-white overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[9999]' : 'border-y border-gray-200'}`}
      style={{
        // In fullscreen (CSS or native): Fill entire viewport
        // Normal mode: Calculate height minus other elements
        height: isFullscreen 
          ? (viewportHeight ? `${viewportHeight}px` : '100vh')
          : mapHeight,
        minHeight: isFullscreen ? undefined : '300px',
        width: isFullscreen ? '100vw' : undefined,
      }}
    >
      {/* Full-Screen Map View */}
      <div className="relative w-full h-full overflow-hidden">
        {/* Map Container */}
        <div className="relative w-full h-full bg-gray-100">
          <GoogleMap
            center={center}
            zoom={zoom}
            markers={transformedMarkers}
            searchCenter={searchCenter || null}
            searchRadius={searchRadius || null}
            selectedMarkerId={selectedMarkerId || null}
            {...(onBoundsChanged ? { onBoundsChanged } : {})}
            height="100%"
          />

          {/* Overlay Controls */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
            {/* Map Info Badge */}
            <div className="bg-white rounded-lg shadow-md px-3 py-2 pointer-events-auto">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-[#d42027]" aria-hidden="true" />
                <span className="text-xs font-medium text-gray-900">
                  {markerCount} {markerCount === 1 ? 'Studio' : 'Studios'}
                </span>
              </div>
            </div>

            {/* Full Screen Button - Works on all devices (native API or CSS-based) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="bg-white rounded-lg shadow-md p-2 pointer-events-auto hover:bg-gray-50 transition-colors"
              aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
              title={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-gray-600" aria-hidden="true" />
              ) : (
                <Maximize2 className="w-4 h-4 text-gray-600" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
