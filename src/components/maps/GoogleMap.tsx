'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { createRoot } from 'react-dom/client';
import { StudioMarkerTooltip } from './StudioMarkerTooltip';
import { MapLocation } from '@/lib/maps';
import { colors } from '@/components/home/HomePage';

interface GoogleMapProps {
  center: MapLocation;
  zoom?: number;
  markers?: Array<{
    id: string;
    position: MapLocation;
    title: string;
    studio_type?: string;
    is_verified?: boolean;
    onClick?: (event: { clientX: number; clientY: number }) => void;
    studio?: {
      id: string;
      name: string;
      owner?: {
        username: string;
      };
      images?: Array<{
        imageUrl: string;
        alt_text?: string;
      }>;
    };
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
      hasUserInteractedRef.current = false;
      setMarkersReady(false); // Reset markers ready state for new search
    }
  }, [searchCenter, searchRadius]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markerClustererRef = useRef<MarkerClusterer | null>(null);
  const circleRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const clusterRenderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeInfoWindowRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // Track if user has interacted with the map (use ref for synchronous updates)
  const hasUserInteractedRef = useRef(false);
  const [markersReady, setMarkersReady] = useState(false);
  const [scrollZoomEnabled, setScrollZoomEnabled] = useState(false);


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
    const googleMaps = window.google.maps as any;
    const circle = new googleMaps.Circle({
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
    const centerMarker = new googleMaps.Marker({
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
    console.log('📊 Current map zoom level:', mapInstance.getZoom());
    
    // Determine the actual max zoom based on studio types (same logic as map initialization)
    const hasHomeStudios = markerData.some(marker => marker.studio_type === 'HOME');
    const actualMaxZoom = hasHomeStudios ? 13 : 15;
    console.log('🔍 Clustering config:', { hasHomeStudios, actualMaxZoom, clusterMaxZoom: actualMaxZoom - 1 });
    console.log('📍 Marker data:', markerData.map(m => ({ 
      id: m.id, 
      name: m.title, 
      lat: m.position.lat, 
      lng: m.position.lng 
    })));
    
    const googleMaps = window.google.maps as any;
    
    // Create new markers with custom marker image
    const newMarkers = markerData.map(data => {
      const marker = new googleMaps.Marker({
        position: { lat: data.position.lat, lng: data.position.lng },
        title: data.title,
        icon: {
          url: '/images/marker.png',
          scaledSize: new googleMaps.Size(32, 32), // Adjust size as needed
          anchor: new googleMaps.Point(16, 32), // Anchor point (center bottom)
        },
        map: mapInstance,
        optimized: false, // Ensure markers render immediately
      });

      // Add click listener for card selection
      if (data.onClick) {
        marker.addListener('click', (e: any) => {
          // Prevent default map behavior (panning/zooming)
          if (e.stop) {
            e.stop();
          }
          
          // Mark that user has interacted with the map (disable auto-zoom)
          if (!hasUserInteractedRef.current) {
            console.log('👤 User clicked marker - disabling auto-zoom');
            hasUserInteractedRef.current = true;
          }
          
          // Get screen coordinates from the click event
          const clickEvent = {
            clientX: e.domEvent?.clientX || window.innerWidth / 2,
            clientY: e.domEvent?.clientY || window.innerHeight / 2,
          };
          data.onClick!(clickEvent);
        });
      }

      // Add click listener for info window (only if no onClick handler is provided)
      // This prevents conflict between modal and info window
      if (data.studio && !data.onClick) {
        marker.addListener('click', () => {
          // Close existing info window
          if (activeInfoWindowRef.current) {
            activeInfoWindowRef.current.close();
          }

          // Create new info window
          const infoWindow = new googleMaps.InfoWindow();
          
          // Create container for React component
          const container = document.createElement('div');
          const root = createRoot(container);
          
          // Render the tooltip component
          root.render(
            <StudioMarkerTooltip 
              studio={data.studio!}
              showCloseButton={true}
              isPopup={true}
              onClose={() => {
                infoWindow.close();
                activeInfoWindowRef.current = null;
              }}
            />
          );
          
          infoWindow.setContent(container);
          infoWindow.open(mapInstance, marker);
          
          // Update active info window ref
          activeInfoWindowRef.current = infoWindow;
          
          // Add listener to clear ref when info window is closed
          infoWindow.addListener('closeclick', () => {
            activeInfoWindowRef.current = null;
          });
        });
      }

      return marker;
    });

    markersRef.current = newMarkers;
    
    console.log(`✅ Created ${newMarkers.length} individual markers`);

    // Detect browser zoom level and adjust grid size accordingly
    const devicePixelRatio = window.devicePixelRatio || 1;
    const browserZoomLevel = Math.round(devicePixelRatio * 100);
    console.log('🔍 Browser zoom detected:', browserZoomLevel + '%', 'devicePixelRatio:', devicePixelRatio);
    
    // Adjust grid size for clustering based on browser zoom to ensure proper clustering
    // Default gridSize is 60px, but we need to scale it with devicePixelRatio
    // At 90% zoom (0.9 ratio), use larger grid; at 110% zoom (1.1 ratio), use smaller grid
    const adjustedGridSize = Math.round(60 / devicePixelRatio);
    console.log('📐 Adjusted grid size for clustering:', adjustedGridSize, 'px (default: 60px)');

    // Create marker clusterer for grouping with custom cluster marker
    if (newMarkers.length > 0) {
      console.log('🔧 Initializing MarkerClusterer with maxZoom:', actualMaxZoom - 1, 'gridSize:', adjustedGridSize);
      markerClustererRef.current = new MarkerClusterer({
        markers: newMarkers,
        map: mapInstance,
        algorithm: new SuperClusterAlgorithm({ 
          maxZoom: actualMaxZoom - 1,
          radius: adjustedGridSize // SuperCluster uses radius instead of gridSize
        }),
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
                const gmaps = window.google.maps as any;
                marker.setIcon({
                  url: canvas.toDataURL(),
                  scaledSize: new gmaps.Size(40, 40),
                  anchor: new gmaps.Point(20, 40),
                });
              };
              img.src = '/images/marker2.png';
            }
            
            // Create the marker initially with just the base image
            const gmaps = window.google.maps as any;
            const marker = new gmaps.Marker({
              position,
              icon: {
                url: '/images/marker2.png',
                scaledSize: new gmaps.Size(40, 40),
                anchor: new gmaps.Point(20, 40),
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
    
    // Clear any existing cluster render timeout before creating a new one
    if (clusterRenderTimeoutRef.current !== null) {
      clearTimeout(clusterRenderTimeoutRef.current);
      clusterRenderTimeoutRef.current = null;
      console.log('🧹 Cleared previous cluster render timeout');
    }
    
    // Ensure clusters render on initial load
    // Check current zoom level and trigger cluster render if needed
    const currentZoom = mapInstance.getZoom();
    console.log('📊 Current zoom after marker creation:', currentZoom);
    
    // Check if zoom is a valid number (including 0) and below threshold
    if (typeof currentZoom === 'number' && currentZoom < 10) {
      // At low zoom levels, ensure clusters are calculated
      // Use longer timeout to ensure the MarkerClusterer has finished its internal setup
      // and React's strict mode double-render has completed
      clusterRenderTimeoutRef.current = setTimeout(() => {
        if (markerClustererRef.current) {
          console.log('🔄 Low zoom detected, triggering cluster render');
          markerClustererRef.current.render();
        } else {
          console.warn('⚠️ MarkerClusterer ref is null, cannot trigger initial render');
        }
        clusterRenderTimeoutRef.current = null; // Clear ref after timeout fires
      }, 250);
    }
    
    // Trigger auto-zoom after markers are created
    if (searchCenter && searchRadius && markerData.length > 0 && !hasUserInteractedRef.current) {
      console.log('🔍 Triggering auto-zoom from marker creation');
      setTimeout(() => {
        if (mapInstance && !hasUserInteractedRef.current) {
          const bounds = new (window.google.maps as any).LatLngBounds();
          
          // Center the map on the search location
          bounds.extend(new (window.google.maps as any).LatLng(searchCenter.lat, searchCenter.lng));
          
          // Include ALL studio markers to ensure they're all visible (this is the priority)
          markerData.forEach(marker => {
            bounds.extend(new (window.google.maps as any).LatLng(marker.position.lat, marker.position.lng));
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
              (window.google.maps as any).event.trigger(mapInstance, 'resize');
              
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
  }, [searchCenter, searchRadius]);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not configured');
      return;
    }

    if (window.google && (window.google.maps as any)) {
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
    const hasHomeStudios = markers.some(marker => marker.studio_type === 'HOME');
    const maxZoom = hasHomeStudios ? 14 : 16; // +1 zoom level with privacy-protecting styles

    const googleMaps = window.google.maps as any;
    const map = new googleMaps.Map(mapRef.current, {
      center: { lat: center.lat, lng: center.lng },
      zoom,
      minZoom: 2, // Prevent zooming out beyond the initial global view
      maxZoom,
      // Enable smooth animations with proper scroll wheel behavior
      gestureHandling: 'cooperative', // Require 2-finger scroll on mobile, Ctrl+scroll on desktop
      scrollwheel: false, // Disable scroll wheel zoom by default
      zoomControl: true,
      zoomControlOptions: {
        position: googleMaps.ControlPosition.RIGHT_BOTTOM,
      },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: googleMaps.ControlPosition.RIGHT_TOP,
      },
      // Custom styling - hide labels for privacy while maintaining map usability
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }], // Hide points of interest labels
        },
        {
          featureType: 'transit',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }], // Hide transit labels
        },
        {
          featureType: 'road',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }], // Hide all road/street names
        },
        {
          featureType: 'administrative',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }], // Hide neighborhood, district names
        },
        {
          featureType: 'administrative.locality',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }], // Keep city names visible for orientation
        },
        {
          featureType: 'water',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }], // Keep water body names for orientation
        },
      ],
    });

    mapInstanceRef.current = map;

    // Create custom scroll zoom toggle button
    const scrollZoomToggleDiv = document.createElement('div');
    scrollZoomToggleDiv.style.margin = '10px';
    scrollZoomToggleDiv.style.cursor = 'pointer';
    
    const scrollZoomButton = document.createElement('button');
    scrollZoomButton.style.backgroundColor = '#fff';
    scrollZoomButton.style.border = '2px solid #fff';
    scrollZoomButton.style.borderRadius = '3px';
    scrollZoomButton.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    scrollZoomButton.style.color = 'rgb(25,25,25)';
    scrollZoomButton.style.cursor = 'pointer';
    scrollZoomButton.style.fontFamily = 'Roboto,Arial,sans-serif';
    scrollZoomButton.style.fontSize = '16px';
    scrollZoomButton.style.lineHeight = '38px';
    scrollZoomButton.style.margin = '0';
    scrollZoomButton.style.padding = '0 17px';
    scrollZoomButton.style.textAlign = 'center';
    scrollZoomButton.textContent = '🖱️ Scroll Zoom: Off';
    scrollZoomButton.title = 'Click to enable scroll wheel zoom';
    scrollZoomButton.type = 'button';

    // Add hover effect
    scrollZoomButton.addEventListener('mouseenter', () => {
      scrollZoomButton.style.backgroundColor = '#f5f5f5';
    });
    scrollZoomButton.addEventListener('mouseleave', () => {
      scrollZoomButton.style.backgroundColor = '#fff';
    });

    // Add click handler to toggle scroll zoom
    scrollZoomButton.addEventListener('click', () => {
      setScrollZoomEnabled(prev => !prev);
    });

    scrollZoomToggleDiv.appendChild(scrollZoomButton);
    map.controls[googleMaps.ControlPosition.TOP_LEFT].push(scrollZoomToggleDiv);

    // Store button reference for updates
    (map as any).scrollZoomButton = scrollZoomButton;

    // Add user interaction listeners to track when user manipulates the map
    let isUserInitiated = false;
    
    const handleUserInteraction = () => {
      if (!hasUserInteractedRef.current && isUserInitiated) {
        console.log('👤 User interaction detected - disabling auto-zoom');
        hasUserInteractedRef.current = true;
      }
    };

    // Listen for user-initiated interactions only
    map.addListener('dragstart', () => {
      isUserInitiated = true;
      handleUserInteraction();
    });
    
    map.addListener('zoom_changed', () => {
      const currentZoom = map.getZoom();
      const markerCount = markersRef.current?.length || 0;
      const clusterCount = markerClustererRef.current ? 'active' : 'inactive';
      console.log('🔎 Zoom changed:', { 
        zoom: currentZoom, 
        markers: markerCount,
        clusterer: clusterCount,
        userInteracted: hasUserInteractedRef.current 
      });
      
      // Only count as user interaction if it's not programmatic
      if (isUserInitiated) {
        handleUserInteraction();
      }
    });
    
    // Also consider any click on the map as user interaction
    map.addListener('click', () => {
      if (!hasUserInteractedRef.current) {
        console.log('👤 User clicked map - disabling auto-zoom');
        hasUserInteractedRef.current = true;
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

    // Add click listener for location selection and info window closing
    map.addListener('click', (event: any) => {
      // Close active info window when clicking on map
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
      }
      
      // Handle location selection
      if (onLocationSelect && event.latLng) {
        onLocationSelect({
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        });
      }
    });

    // Add zoom change listener to update clustering
    map.addListener('zoom_changed', () => {
      // Force re-render of clusterer when zoom changes
      if (markerClustererRef.current) {
        markerClustererRef.current.render();
      }
    });
  }, [isLoaded, center, zoom, onLocationSelect, markers]);

  // Handle scroll zoom toggle
  useEffect(() => {
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      map.setOptions({ scrollwheel: scrollZoomEnabled });
      
      // Update button text and style
      const scrollZoomButton = (map as any).scrollZoomButton;
      if (scrollZoomButton) {
        scrollZoomButton.textContent = scrollZoomEnabled ? '🖱️ Scroll Zoom: On' : '🖱️ Scroll Zoom: Off';
        scrollZoomButton.title = scrollZoomEnabled 
          ? 'Click to disable scroll wheel zoom' 
          : 'Click to enable scroll wheel zoom';
        scrollZoomButton.style.backgroundColor = scrollZoomEnabled ? '#e8f5e9' : '#fff';
        scrollZoomButton.style.color = scrollZoomEnabled ? '#2e7d32' : 'rgb(25,25,25)';
        
        // Update hover effect based on state
        scrollZoomButton.onmouseenter = () => {
          scrollZoomButton.style.backgroundColor = scrollZoomEnabled ? '#c8e6c9' : '#f5f5f5';
        };
        scrollZoomButton.onmouseleave = () => {
          scrollZoomButton.style.backgroundColor = scrollZoomEnabled ? '#e8f5e9' : '#fff';
        };
      }
      
      console.log(`🖱️ Scroll zoom ${scrollZoomEnabled ? 'enabled' : 'disabled'}`);
    }
  }, [scrollZoomEnabled]);

  // Update markers with clustering and enhanced features
  useEffect(() => {
    console.log('🎯 Markers useEffect called:', { 
      hasMap: !!mapInstanceRef.current, 
      markersCount: markers.length,
      willCreateMarkers: !!(mapInstanceRef.current && markers.length > 0)
    });
    
    // Define cleanup function to be used by all code paths
    const cleanupClusterTimeout = () => {
      if (clusterRenderTimeoutRef.current !== null) {
        clearTimeout(clusterRenderTimeoutRef.current);
        clusterRenderTimeoutRef.current = null;
        console.log('🧹 Cleared cluster render timeout on cleanup');
      }
    };
    
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
        return () => {
          clearTimeout(retryTimeout);
          cleanupClusterTimeout();
        };
      }
      return cleanupClusterTimeout;
    }

    // Clear existing markers and clusterer
    console.log('🧹 Clearing existing markers. Current count:', markersRef.current.length);
    if (markerClustererRef.current) {
      console.log('🧹 Clearing marker clusterer');
      markerClustererRef.current.clearMarkers();
      markerClustererRef.current = null;
    }
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    // Reset markers ready state when clearing
    setMarkersReady(false);

    // If no markers, return early with cleanup
    if (markers.length === 0) {
      console.log('❌ No markers to display');
      return cleanupClusterTimeout;
    }
    
    console.log('✨ Creating new markers. Count:', markers.length);
    
    // Create studio markers (cluster render timeout is managed via ref internally)
    createStudioMarkers(mapInstanceRef.current, markers);
    
    // Set markers as ready after creation
    setMarkersReady(true);
    
    // Return cleanup function
    return cleanupClusterTimeout;
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
      hasUserInteracted: hasUserInteractedRef.current,
      markersReady
    });

    // RULE 1 & 2: When location search is performed, show all studios within search radius, zoomed as close as possible
    // Center the search location on the map, don't worry about fitting the entire circle
    // IMPORTANT: Only auto-zoom when there's actually a search center (location search performed) AND user hasn't interacted AND markers are ready
    if (searchCenter && searchRadius && markers.length > 0 && !hasUserInteractedRef.current && markersReady) {
      const bounds = new (window.google.maps as any).LatLngBounds();
      
      // Center the map on the search location
      bounds.extend(new (window.google.maps as any).LatLng(searchCenter.lat, searchCenter.lng));
      
      // Include ALL studio markers to ensure they're all visible (this is the priority)
      markers.forEach(marker => {
        bounds.extend(new (window.google.maps as any).LatLng(marker.position.lat, marker.position.lng));
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
          (window.google.maps as any).event.trigger(mapInstanceRef.current, 'resize');
          
          const currentZoom = mapInstanceRef.current?.getZoom();
          if (currentZoom && currentZoom > 13) {
            mapInstanceRef.current?.setZoom(13); // Don't zoom in too much for privacy
          } else if (currentZoom && currentZoom < 6) {
            mapInstanceRef.current?.setZoom(6); // Don't zoom out too much
          }
          
          // Auto-zoom completed
        }
      }, 100);
      
    } else if (markers.length > 0 && !hasUserInteractedRef.current && markersReady) {
      // No search center - fit all studios comfortably in view (only if user hasn't interacted and markers are ready)
      const bounds = new (window.google.maps as any).LatLngBounds();
      
      markers.forEach(marker => {
        bounds.extend(new (window.google.maps as any).LatLng(marker.position.lat, marker.position.lng));
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
          (window.google.maps as any).event.trigger(mapInstanceRef.current, 'resize');
          
          const currentZoom = mapInstanceRef.current?.getZoom();
          if (currentZoom && currentZoom < 2) {
            mapInstanceRef.current?.setZoom(2);
          }
        }
      }, 100);
    }
    
    // No cleanup needed for this effect
    return;
  }, [searchCenter, searchRadius, markers, circleRef.current, markersRef.current, markersReady]);

  // Update center when prop changes (only if user hasn't interacted)
  useEffect(() => {
    if (mapInstanceRef.current && !hasUserInteractedRef.current) {
      console.log('🎯 Updating map center to:', center);
      mapInstanceRef.current.setCenter({ lat: center.lat, lng: center.lng });
    } else if (hasUserInteractedRef.current) {
      console.log('🚫 Skipping center update - user has interacted with map');
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
