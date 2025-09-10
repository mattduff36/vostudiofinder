'use client';

import { useEffect, useRef, useState } from 'react';

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
    onClick?: () => void;
  }>;
  searchCenter?: MapLocation | null;
  searchRadius?: number | null;
  onLocationSelect?: (location: MapLocation) => void;
  height?: string;
  className?: string;
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
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circleRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
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
  }, [isLoaded, center, zoom, onLocationSelect, markers]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers with site colors
    markers.forEach(markerData => {
      const marker = new window.google.maps.Marker({
        position: { lat: markerData.position.lat, lng: markerData.position.lng },
        map: mapInstanceRef.current,
        title: markerData.title,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: colors.primary,
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
      });

      if (markerData.onClick) {
        marker.addListener('click', markerData.onClick);
      }

      markersRef.current.push(marker);
    });
  }, [markers]);

  // Update search radius circle and center marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing circle and center marker
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
    if (centerMarkerRef.current) {
      centerMarkerRef.current.setMap(null);
      centerMarkerRef.current = null;
    }

    // Add new circle and center marker if we have search center and radius
    if (searchCenter && searchRadius) {
      // Add the search radius circle
      const circle = new window.google.maps.Circle({
        strokeColor: colors.primary,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: colors.primary,
        fillOpacity: 0.15,
        map: mapInstanceRef.current,
        center: { lat: searchCenter.lat, lng: searchCenter.lng },
        radius: searchRadius * 1609.34, // Convert miles to meters
      });

      // Add the center pin (standard Google Maps red pin)
      const centerMarker = new window.google.maps.Marker({
        position: { lat: searchCenter.lat, lng: searchCenter.lng },
        map: mapInstanceRef.current,
        title: 'Search Center',
        // Use default Google Maps red pin (no custom icon needed)
      });

      circleRef.current = circle;
      centerMarkerRef.current = centerMarker;

      // Fit the map to show the entire circle and all markers with some padding
      const bounds = new window.google.maps.LatLngBounds();
      const radiusInDegrees = searchRadius / 69; // Rough conversion: 1 degree ≈ 69 miles
      
      // Add points around the circle to the bounds
      bounds.extend(new window.google.maps.LatLng(searchCenter.lat + radiusInDegrees, searchCenter.lng));
      bounds.extend(new window.google.maps.LatLng(searchCenter.lat - radiusInDegrees, searchCenter.lng));
      bounds.extend(new window.google.maps.LatLng(searchCenter.lat, searchCenter.lng + radiusInDegrees));
      bounds.extend(new window.google.maps.LatLng(searchCenter.lat, searchCenter.lng - radiusInDegrees));
      
      // Also include all studio markers in the bounds
      markers.forEach(marker => {
        bounds.extend(new window.google.maps.LatLng(marker.position.lat, marker.position.lng));
      });
      
      // Fit the map to these bounds with padding
      mapInstanceRef.current.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      });
    } else if (markers.length > 0) {
      // No search center - fit all studios comfortably in view
      const bounds = new window.google.maps.LatLngBounds();
      
      // Add all studio markers to the bounds
      markers.forEach(marker => {
        bounds.extend(new window.google.maps.LatLng(marker.position.lat, marker.position.lng));
      });
      
      // Fit the map to show all studios with comfortable padding
      mapInstanceRef.current.fitBounds(bounds, {
        top: 80,
        right: 80,
        bottom: 80,
        left: 80
      });
      
      // Ensure minimum zoom level for better UX (don't zoom out too far)
      window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'bounds_changed', () => {
        const currentZoom = mapInstanceRef.current?.getZoom();
        if (currentZoom && currentZoom < 2) {
          mapInstanceRef.current?.setZoom(2);
        }
      });
    }
  }, [searchCenter, searchRadius, markers]);

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
