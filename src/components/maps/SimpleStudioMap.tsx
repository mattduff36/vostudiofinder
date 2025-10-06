'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

interface SimpleStudioMapProps {
  latitude?: number | undefined;
  longitude?: number | undefined;
  address: string;
  height?: string;
  className?: string;
}

export function SimpleStudioMap({
  latitude,
  longitude,
  address,
  height = '300px',
  className = '',
}: SimpleStudioMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not configured');
      setHasError(true);
      return;
    }

    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setHasError(true);
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current || !latitude || !longitude) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: latitude, lng: longitude },
      zoom: 15,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    // Add marker
    new window.google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map: map,
      title: address,
    });

    mapInstanceRef.current = map;
  }, [isLoaded, latitude, longitude, address]);

  if (hasError || !latitude || !longitude) {
    return (
      <div 
        className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <MapPin className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Map unavailable</p>
          <p className="text-xs text-gray-400">{address}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className={`rounded-lg ${className}`}
      style={{ height }}
    />
  );
}

