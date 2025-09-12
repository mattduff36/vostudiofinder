'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

// Google Maps types
declare global {
  interface Window {
    google: any;
  }
}
import { MapLocation } from '@/lib/maps';
import { colors } from '@/components/home/HomePage';

interface GoogleMapProps {
  center: MapLocation;
  zoom?: number;
  markers?: Array<{
    id: string;
    position: MapLocation;
    title: string;
    studioType?: string;
    isVerified?: boolean;
    onClick?: () => void;
  }>;
  searchCenter?: MapLocation | null;
  searchRadius?: number | null;
  onLocationSelect?: (location: MapLocation) => void;
  height?: string;
  className?: string;
  selectedMarkerId?: string | null;
}

export function GoogleMap({
  center,
  zoom = 13,
  markers = [],
  searchCenter,
  searchRadius,
  onLocationSelect,
  height = '400px',
  className = '',
  selectedMarkerId,
}: GoogleMapProps) {
  
  
  // Debug logging
  useEffect(() => {
    console.log('🗺️ GoogleMap props:', {
      searchCenter,
      searchRadius,
      hasSearchCenter: !!searchCenter,
      hasSearchRadius: !!searchRadius
    });
  }, [searchCenter, searchRadius]);

  // Reset user interaction state when new search parameters are provided
  useEffect(() => {
    if (searchCenter && searchRadius) {
      console.log('🔄 New search parameters detected - resetting user interaction state');
      setHasUserInteracted(false);
      setMarkersReady(false); // Reset markers ready state for new search
    }
  }, [searchCenter, searchRadius]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markerClustererRef = useRef<MarkerClusterer | null>(null);
  const circleRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [markersReady, setMarkersReady] = useState(false);


  // Helper function to create circle and marker
  const createCircleAndMarker = useCallback((mapInstance: any, center: MapLocation, radius: number) => {
    // Clear existing circle and center marker
    if (circleRef.current) {
      console.log('🗑️ Clearing existing circle');
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
    if (centerMarkerRef.current) {
      console.log('🗑️ Clearing existing center marker');
      centerMarkerRef.current.setMap(null);
      centerMarkerRef.current = null;
    }

    console.log('✅ Creating circle and center marker:', { center, radius });
    
    // Add the search radius circle
    const circle = new window.google.maps.Circle({
      strokeColor: colors.primary,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: colors.primary,
      fillOpacity: 0.15,
      map: mapInstance,
      center: { lat: center.lat, lng: center.lng },
      radius: radius * 1609.34, // Convert miles to meters
    });

    // Add the center pin (standard Google Maps red pin)
    const centerMarker = new window.google.maps.Marker({
      position: { lat: center.lat, lng: center.lng },
      map: mapInstance,
      title: 'Search Center',
      // Use default Google Maps red pin (no custom icon needed)
    });

    circleRef.current = circle;
    centerMarkerRef.current = centerMarker;
    
    console.log('🎯 Circle and marker created successfully!');
  }, []);

  // Helper function to create studio markers
  const createStudioMarkers = useCallback((mapInstance: any, markerData: any[]) => {
    console.log('🏭 Creating studio markers:', markerData.length);
    
    // Create new markers with custom marker image
    const newMarkers = markerData.map(data => {
      const marker = new window.google.maps.Marker({
        position: { lat: data.position.lat, lng: data.position.lng },
        title: data.title,
        icon: {
          url: '/images/marker.png',
          scaledSize: new window.google.maps.Size(32, 32), // Adjust size as needed
          anchor: new window.google.maps.Point(16, 32), // Anchor point (center bottom)
        },
        map: mapInstance,
        optimized: false, // Ensure markers render immediately
      });

      // Add click listener
      if (data.onClick) {
        marker.addListener('click', data.onClick);
      }

      return marker;
    });

    markersRef.current = newMarkers;

    // Create marker clusterer for grouping with custom cluster marker
    if (newMarkers.length > 0) {
      markerClustererRef.current = new MarkerClusterer({
        markers: newMarkers,
        map: mapInstance,
        renderer: {
          render: ({ count, position }) => {
            console.log('🔢 Creating cluster marker for', count, 'studios at', position);
            
            // Create a canvas to combine the marker2 image with custom text
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 40;
            
            canvas.width = size;
            canvas.height = size;
            
            if (ctx) {
              // Create the marker with the canvas-based icon
              const img = new Image();
              img.onload = () => {
                // Clear canvas
                ctx.clearRect(0, 0, size, size);
                
                // Draw the marker2 background image
                ctx.drawImage(img, 0, 0, size, size);
                
                // Draw white circular background for the number
                // Position it in the center of the transparent circle in marker2
                const circleX = size / 2; // Center horizontally  
                const circleY = size / 2 - 6; // Move up a bit more from center for perfect alignment
                const circleRadius = 9; // Size of the white circle
                
                ctx.beginPath();
                ctx.arc(circleX, circleY, circleRadius, 0, 2 * Math.PI);
                ctx.fillStyle = '#FFFFFF'; // White background
                ctx.fill();
                
                // Draw the count number in brand red
                ctx.fillStyle = '#d42027'; // Brand red color
                ctx.font = 'bold 12px Arial'; // Increased font size from 11px to 12px
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(count.toString(), circleX, circleY);
                
                // Update the marker icon with the new canvas
                marker.setIcon({
                  url: canvas.toDataURL(),
                  scaledSize: new window.google.maps.Size(40, 40),
                  anchor: new window.google.maps.Point(20, 40),
                });
              };
              img.src = '/images/marker2.png';
            }
            
            // Create the marker initially with just the base image
            const marker = new window.google.maps.Marker({
              position,
              icon: {
                url: '/images/marker2.png',
                scaledSize: new window.google.maps.Size(40, 40),
                anchor: new window.google.maps.Point(20, 40),
              },
              title: `${count} studios`,
            });
            
            console.log('✅ Cluster marker created successfully');
            return marker;
          },
        },
      });
    }
    
    console.log('🎯 Studio markers created successfully!');
    
    // Trigger auto-zoom after markers are created
    if (searchCenter && searchRadius && markerData.length > 0 && !hasUserInteracted) {
      console.log('🔍 Triggering auto-zoom from marker creation');
      setTimeout(() => {
        if (mapInstance && !hasUserInteracted) {
          const bounds = new window.google.maps.LatLngBounds();
          
          // Center the map on the search location
          bounds.extend(new window.google.maps.LatLng(searchCenter.lat, searchCenter.lng));
          
          // Include ALL studio markers to ensure they're all visible (this is the priority)
          markerData.forEach(marker => {
            bounds.extend(new window.google.maps.LatLng(marker.position.lat, marker.position.lng));
          });
          
          console.log('🔍 Auto-zooming to fit all studios within search radius (from marker creation)');
          mapInstance.fitBounds(bounds, {
            top: 50,
            right: 50,
            bottom: 50,
            left: 50
          });
          
          // Force map refresh and ensure reasonable zoom levels
          setTimeout(() => {
            if (mapInstance) {
              window.google.maps.event.trigger(mapInstance, 'resize');
              
              const currentZoom = mapInstance?.getZoom();
              if (currentZoom && currentZoom > 15) {
                mapInstance?.setZoom(15); // Don't zoom in too much for privacy
              } else if (currentZoom && currentZoom < 6) {
                mapInstance?.setZoom(6); // Don't zoom out too much
              }
            }
          }, 100);
        }
      }, 200); // Small delay to ensure markers are fully rendered
    }
  }, [searchCenter, searchRadius, hasUserInteracted]);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not configured');
      return;
    }

    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    // Check if any markers are HOME studios to determine max zoom
    const hasHomeStudios = markers.some(marker => marker.studioType === 'HOME');
    const maxZoom = hasHomeStudios ? 15 : 20; // Limit zoom for privacy when HOME studios are present

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: center.lat, lng: center.lng },
      zoom,
      maxZoom,
      // Enable smooth animations with proper scroll wheel behavior
      gestureHandling: 'greedy', // Allow all gestures without requiring Ctrl key
      scrollwheel: true, // Enable scroll wheel zoom when hovering over map
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
      },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP,
      },
      // Custom styling
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'transit',
          elementType: 'labels',
          stylers: [{ visibility: 'simplified' }],
        },
      ],
    });

    mapInstanceRef.current = map;

    // Add user interaction listeners to track when user manipulates the map
    let isUserInitiated = false;
    
    const handleUserInteraction = () => {
      if (!hasUserInteracted && isUserInitiated) {
        console.log('👤 User interaction detected - disabling auto-zoom');
        setHasUserInteracted(true);
      }
    };

    // Listen for user-initiated interactions only
    map.addListener('dragstart', () => {
      isUserInitiated = true;
      handleUserInteraction();
    });
    
    map.addListener('zoom_changed', () => {
      // Only count as user interaction if it's not programmatic
      if (isUserInitiated) {
        handleUserInteraction();
      }
    });
    
    map.addListener('center_changed', () => {
      // Only count as user interaction if it's not programmatic
      if (isUserInitiated) {
        handleUserInteraction();
      }
    });
    
    // Reset the flag after a short delay to allow for programmatic changes
    map.addListener('idle', () => {
      setTimeout(() => {
        isUserInitiated = false;
      }, 100);
    });
    
    // Track mouse interactions
    map.addListener('mousedown', () => {
      isUserInitiated = true;
    });
    
    map.addListener('wheel', () => {
      isUserInitiated = true;
      handleUserInteraction();
    });

    // Add click listener for location selection
    if (onLocationSelect) {
      map.addListener('click', (event: any) => {
        if (event.latLng) {
          onLocationSelect({
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          });
        }
      });
    }

    // Add zoom change listener to update clustering
    map.addListener('zoom_changed', () => {
      // Force re-render of clusterer when zoom changes
      if (markerClustererRef.current) {
        markerClustererRef.current.render();
      }
    });
  }, [isLoaded, center, zoom, onLocationSelect, markers]);


  // Update markers with clustering and enhanced features
  useEffect(() => {
    console.log('🎯 Markers useEffect called:', { 
      hasMap: !!mapInstanceRef.current, 
      markersCount: markers.length,
      willCreateMarkers: !!(mapInstanceRef.current && markers.length > 0)
    });
    
    if (!mapInstanceRef.current) {
      console.log('❌ No map instance for markers, skipping');
      // If we have markers but no map yet, retry after a short delay
      if (markers.length > 0) {
        console.log('⏳ Retrying marker creation in 100ms...');
        const retryTimeout = setTimeout(() => {
          if (mapInstanceRef.current && markers.length > 0) {
            console.log('🔄 Retry: Creating markers after map loaded');
            // Trigger marker creation by calling this effect again
            // We'll do this by clearing and recreating markers
            if (markerClustererRef.current) {
              markerClustererRef.current.clearMarkers();
              markerClustererRef.current = null;
            }
            markersRef.current.forEach(marker => marker.setMap(null));
            markersRef.current = [];
            
            createStudioMarkers(mapInstanceRef.current, markers);
          }
        }, 100);
        return () => clearTimeout(retryTimeout);
      }
      return;
    }

    // Clear existing markers and clusterer
    if (markerClustererRef.current) {
      markerClustererRef.current.clearMarkers();
      markerClustererRef.current = null;
    }
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    // Reset markers ready state when clearing
    setMarkersReady(false);

    // If no markers, return early
    if (markers.length === 0) {
      console.log('❌ No markers to display');
      return;
    }
    
    createStudioMarkers(mapInstanceRef.current, markers);
    
    // Set markers as ready after creation
    setMarkersReady(true);
    
    // No cleanup needed for this effect
    return;
  }, [markers, selectedMarkerId]);

  // Update search radius circle and center marker
  useEffect(() => {
    console.log('🔵 Circle useEffect called:', { 
      hasMap: !!mapInstanceRef.current, 
      searchCenter, 
      searchRadius,
      willCreateCircle: !!(searchCenter && searchRadius && mapInstanceRef.current)
    });
    
    if (!mapInstanceRef.current) {
      console.log('❌ No map instance, skipping circle creation');
      // If we have search data but no map yet, retry after a short delay
      if (searchCenter && searchRadius) {
        console.log('⏳ Retrying circle creation in 100ms...');
        const retryTimeout = setTimeout(() => {
          if (mapInstanceRef.current && searchCenter && searchRadius) {
            console.log('🔄 Retry: Creating circle after map loaded');
            createCircleAndMarker(mapInstanceRef.current, searchCenter, searchRadius);
          }
        }, 100);
        return () => clearTimeout(retryTimeout);
      }
      return;
    }

    // Add new circle and center marker if we have search center and radius
    if (searchCenter && searchRadius) {
      createCircleAndMarker(mapInstanceRef.current, searchCenter, searchRadius);
    } else {
      console.log('❌ Not creating circle - missing searchCenter or searchRadius:', { searchCenter, searchRadius });
    }
    
    // No cleanup needed for this effect
    return;
  }, [searchCenter, searchRadius, markers]);

  // Auto-zoom to fit all studios within search radius optimally (Rules 1 & 2)
  useEffect(() => {
    if (!mapInstanceRef.current) {
      console.log('🚫 Auto-zoom skipped: No map instance');
      return;
    }
    
    console.log('🔍 Auto-zoom effect called:', { 
      hasSearchCenter: !!searchCenter, 
      searchRadius, 
      markersCount: markers.length,
      hasCircle: !!circleRef.current,
      hasMarkers: markersRef.current.length > 0,
      hasUserInteracted,
      markersReady
    });

    // RULE 1 & 2: When location search is performed, show all studios within search radius, zoomed as close as possible
    // Center the search location on the map, don't worry about fitting the entire circle
    // IMPORTANT: Only auto-zoom when there's actually a search center (location search performed) AND user hasn't interacted AND markers are ready
    if (searchCenter && searchRadius && markers.length > 0 && !hasUserInteracted && markersReady) {
      const bounds = new window.google.maps.LatLngBounds();
      
      // Center the map on the search location
      bounds.extend(new window.google.maps.LatLng(searchCenter.lat, searchCenter.lng));
      
      // Include ALL studio markers to ensure they're all visible (this is the priority)
      markers.forEach(marker => {
        bounds.extend(new window.google.maps.LatLng(marker.position.lat, marker.position.lng));
      });
      
      console.log('🔍 Auto-zooming to fit all studios within search radius (prioritizing studio visibility)');
      mapInstanceRef.current.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      });
      
      // Force map refresh and ensure reasonable zoom levels
      setTimeout(() => {
        if (mapInstanceRef.current) {
          // Force map refresh to prevent scroll-to-update issue
          window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
          
          const currentZoom = mapInstanceRef.current?.getZoom();
          if (currentZoom && currentZoom > 15) {
            mapInstanceRef.current?.setZoom(15); // Don't zoom in too much for privacy
          } else if (currentZoom && currentZoom < 6) {
            mapInstanceRef.current?.setZoom(6); // Don't zoom out too much
          }
          
          // Auto-zoom completed
        }
      }, 100);
      
    } else if (markers.length > 0 && !hasUserInteracted && markersReady) {
      // No search center - fit all studios comfortably in view (only if user hasn't interacted and markers are ready)
      const bounds = new window.google.maps.LatLngBounds();
      
      markers.forEach(marker => {
        bounds.extend(new window.google.maps.LatLng(marker.position.lat, marker.position.lng));
      });
      
      console.log('🔍 Auto-zooming to fit all studio markers');
      mapInstanceRef.current.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      });
      
      // Force map refresh and ensure minimum zoom level for better UX
      setTimeout(() => {
        if (mapInstanceRef.current) {
          // Force map refresh to prevent scroll-to-update issue
          window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
          
          const currentZoom = mapInstanceRef.current?.getZoom();
          if (currentZoom && currentZoom < 2) {
            mapInstanceRef.current?.setZoom(2);
          }
        }
      }, 100);
    }
    
    // No cleanup needed for this effect
    return;
  }, [searchCenter, searchRadius, markers, circleRef.current, markersRef.current, hasUserInteracted, markersReady]);

  // Update center when prop changes (only if user hasn't interacted)
  useEffect(() => {
    if (mapInstanceRef.current && !hasUserInteracted) {
      console.log('🎯 Updating map center to:', center);
      mapInstanceRef.current.setCenter({ lat: center.lat, lng: center.lng });
    } else if (hasUserInteracted) {
      console.log('🚫 Skipping center update - user has interacted with map');
    }
  }, [center, hasUserInteracted]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🗺️</div>
          <p className="text-sm">Google Maps API key not configured</p>
          <p className="text-xs mt-1">Map functionality will be available once configured</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef}
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ 
        height,
        position: 'relative',
        zIndex: 1,
        // Ensure map captures mouse events properly
        pointerEvents: 'auto'
      }}
      data-testid="google-map"
    />
  );
}
