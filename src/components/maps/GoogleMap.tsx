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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markerClustererRef = useRef<MarkerClusterer | null>(null);
  const circleRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
    
    // Create new markers with simple red dots
    const newMarkers = markerData.map(data => {
      const marker = new window.google.maps.Marker({
        position: { lat: data.position.lat, lng: data.position.lng },
        title: data.title,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: colors.primary,
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
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

    // Create marker clusterer for grouping
    if (newMarkers.length > 0) {
      markerClustererRef.current = new MarkerClusterer({
        markers: newMarkers,
        map: mapInstance,
        renderer: {
          render: ({ count, position }) => {
            return new window.google.maps.Marker({
              position,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: Math.min(count * 2 + 10, 30),
                fillColor: colors.primary,
                fillOpacity: 0.8,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
              },
              label: {
                text: count.toString(),
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
              },
              title: `${count} studios`,
            });
          },
        },
      });
    }
    
    console.log('🎯 Studio markers created successfully!');
  }, []);

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
      // Enable smooth animations
      gestureHandling: 'cooperative',
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

    // If no markers, return early
    if (markers.length === 0) {
      console.log('❌ No markers to display');
      return;
    }
    
    createStudioMarkers(mapInstanceRef.current, markers);
    
    // No cleanup needed for this effect
    return;
  }, [markers, selectedMarkerId, createStudioMarkers]);

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

  // Auto-zoom to fit search radius circle and all studio markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    console.log('🔍 Auto-zoom effect called:', { 
      hasSearchCenter: !!searchCenter, 
      searchRadius, 
      markersCount: markers.length,
      hasCircle: !!circleRef.current,
      hasMarkers: markersRef.current.length > 0
    });

    // Always auto-zoom to show both search radius circle and all studio markers
    if (searchCenter && searchRadius) {
      const bounds = new window.google.maps.LatLngBounds();
      
      // Convert radius from miles to degrees more accurately
      // 1 degree latitude ≈ 69 miles everywhere
      const latRadiusInDegrees = searchRadius / 69;
      
      // 1 degree longitude varies by latitude: 69 * cos(latitude)
      const lngRadiusInDegrees = searchRadius / (69 * Math.cos(searchCenter.lat * Math.PI / 180));
      
      // Add points around the circle to ensure the ENTIRE search radius is visible
      // Use the larger radius to ensure the full circle fits
      const maxRadiusInDegrees = Math.max(latRadiusInDegrees, lngRadiusInDegrees);
      
      // Add points at the extremes of the circle (north, south, east, west)
      bounds.extend(new window.google.maps.LatLng(searchCenter.lat + maxRadiusInDegrees, searchCenter.lng)); // North
      bounds.extend(new window.google.maps.LatLng(searchCenter.lat - maxRadiusInDegrees, searchCenter.lng)); // South  
      bounds.extend(new window.google.maps.LatLng(searchCenter.lat, searchCenter.lng + maxRadiusInDegrees)); // East
      bounds.extend(new window.google.maps.LatLng(searchCenter.lat, searchCenter.lng - maxRadiusInDegrees)); // West
      
      // Also add diagonal points to ensure the full circle is captured
      bounds.extend(new window.google.maps.LatLng(searchCenter.lat + latRadiusInDegrees, searchCenter.lng + lngRadiusInDegrees));
      bounds.extend(new window.google.maps.LatLng(searchCenter.lat - latRadiusInDegrees, searchCenter.lng - lngRadiusInDegrees));
      bounds.extend(new window.google.maps.LatLng(searchCenter.lat + latRadiusInDegrees, searchCenter.lng - lngRadiusInDegrees));
      bounds.extend(new window.google.maps.LatLng(searchCenter.lat - latRadiusInDegrees, searchCenter.lng + lngRadiusInDegrees));
      
      // Also include all studio markers to ensure they're all visible
      markers.forEach(marker => {
        bounds.extend(new window.google.maps.LatLng(marker.position.lat, marker.position.lng));
      });
      
      console.log('🔍 Auto-zooming to fit search radius and markers');
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
            mapInstanceRef.current?.setZoom(15); // Don't zoom in too much
          } else if (currentZoom && currentZoom < 6) {
            mapInstanceRef.current?.setZoom(6); // Don't zoom out too much
          }
        }
      }, 100);
      
    } else if (markers.length > 0) {
      // No search center - fit all studios comfortably in view
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
  }, [searchCenter, searchRadius, markers, circleRef.current, markersRef.current]);

  // Update center when prop changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat: center.lat, lng: center.lng });
    }
  }, [center]);

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
      style={{ height }}
    />
  );
}
