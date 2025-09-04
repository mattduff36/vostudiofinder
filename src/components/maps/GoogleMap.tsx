'use client';

import { useEffect, useRef, useState } from 'react';

// Google Maps types
declare global {
  interface Window {
    google: any;
  }
}
import { MapLocation } from '@/lib/maps';

interface GoogleMapProps {
  center: MapLocation;
  zoom?: number;
  markers?: Array<{
    id: string;
    position: MapLocation;
    title: string;
    onClick?: () => void;
  }>;
  onLocationSelect?: (location: MapLocation) => void;
  height?: string;
  className?: string;
}

export function GoogleMap({
  center,
  zoom = 13,
  markers = [],
  onLocationSelect,
  height = '400px',
  className = '',
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
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

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: center.lat, lng: center.lng },
      zoom,
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
  }, [isLoaded, center, zoom, onLocationSelect]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    markers.forEach(markerData => {
      const marker = new window.google.maps.Marker({
        position: { lat: markerData.position.lat, lng: markerData.position.lng },
        map: mapInstanceRef.current,
        title: markerData.title,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#7C3AED',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      if (markerData.onClick) {
        marker.addListener('click', markerData.onClick);
      }

      markersRef.current.push(marker);
    });
  }, [markers]);

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
