'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { isCompleteAddress } from '@/lib/utils/address';

interface SimpleStudioMapProps {
  latitude?: number | undefined;
  longitude?: number | undefined;
  address: string;
  fullAddress?: string;
  useCoordinates?: boolean; // Force using coordinates instead of address
  height?: string;
  className?: string;
}

export function SimpleStudioMap({
  latitude,
  longitude,
  address,
  fullAddress,
  useCoordinates = false,
  height = '300px',
  className = '',
}: SimpleStudioMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [geocodedLocation, setGeocodedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

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

  // Determine whether to use address or coordinates
  const addressToUse = fullAddress || address;
  const shouldUseAddress = !useCoordinates && 
                          addressToUse && 
                          isCompleteAddress(addressToUse);

  // Geocode address if we should use it and haven't geocoded yet
  useEffect(() => {
    if (!isLoaded || !shouldUseAddress || geocodedLocation || isGeocoding || !addressToUse) return;

    const googleMaps = window.google.maps as any;
    
    if (!geocoderRef.current) {
      geocoderRef.current = new googleMaps.Geocoder();
    }

    setIsGeocoding(true);
    geocoderRef.current.geocode(
      { address: addressToUse },
      (results: any[], status: string) => {
        setIsGeocoding(false);
        if (status === 'OK' && results && results.length > 0) {
          const location = results[0].geometry.location;
          setGeocodedLocation({
            lat: location.lat(),
            lng: location.lng(),
          });
        } else {
          // If geocoding fails, fall back to coordinates
          console.warn('Geocoding failed, falling back to coordinates');
        }
      }
    );
  }, [isLoaded, shouldUseAddress, addressToUse, geocodedLocation, isGeocoding]);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    // Determine final location to use
    let finalLat: number | null = null;
    let finalLng: number | null = null;

    if (useCoordinates && latitude && longitude) {
      // Force using coordinates
      finalLat = latitude;
      finalLng = longitude;
    } else if (shouldUseAddress && geocodedLocation) {
      // Use geocoded address location
      finalLat = geocodedLocation.lat;
      finalLng = geocodedLocation.lng;
    } else if (latitude && longitude) {
      // Fall back to provided coordinates
      finalLat = latitude;
      finalLng = longitude;
    } else {
      // No location available yet - wait for geocoding or coordinates
      if (shouldUseAddress && !geocodedLocation && !isGeocoding) {
        // Still waiting for geocoding, don't render yet
        return;
      }
      // No location available
      return;
    }

    if (!finalLat || !finalLng) return;

    // Clear existing map instance if it exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current = null;
    }

    const googleMaps = window.google.maps as any;
    const map = new googleMaps.Map(mapRef.current, {
      center: { lat: finalLat, lng: finalLng },
      zoom: 9, // Shows wider area around postcode/coordinates for privacy
      minZoom: 2, // Prevent zooming out too far
      maxZoom: 12, // Limit zoom for privacy - prevent zooming in too close (1 step closer than before)
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false, // Disabled - using custom fullscreen button on mobile
      gestureHandling: 'cooperative', // Require two-finger scroll on mobile, Ctrl+scroll on desktop
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    // Add marker
    new googleMaps.Marker({
      position: { lat: finalLat, lng: finalLng },
      map: map,
      title: addressToUse || address,
    });

    mapInstanceRef.current = map;
  }, [isLoaded, useCoordinates, shouldUseAddress, geocodedLocation, isGeocoding, latitude, longitude, addressToUse, address]);

  // Check if we have a valid location
  const hasValidLocation = useCoordinates 
    ? (latitude && longitude) 
    : (shouldUseAddress && geocodedLocation) || (latitude && longitude);

  if (hasError || !hasValidLocation) {
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

