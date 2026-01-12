'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { calculateDistance } from '@/lib/utils/address';

interface AddressPreviewMapProps {
  address: string;
  initialLat?: number | null;
  initialLng?: number | null;
  showExactLocation?: boolean;
  onCoordinatesChange: (lat: number, lng: number) => void;
  className?: string;
}

const MAX_DISTANCE_KM = 10; // Maximum distance user can drag pin from geocoded point
const AREA_RADIUS_M = 150; // Radius in meters for approximate location circle

export function AddressPreviewMap({
  address,
  initialLat,
  initialLng,
  showExactLocation = true,
  onCoordinatesChange,
  className = '',
}: AddressPreviewMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(initialLat || null);
  const [currentLng, setCurrentLng] = useState<number | null>(initialLng || null);
  const [geocodedLat, setGeocodedLat] = useState<number | null>(initialLat || null);
  const [geocodedLng, setGeocodedLng] = useState<number | null>(initialLng || null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDistanceWarning, setShowDistanceWarning] = useState(false);
  const lastGeocodedAddressRef = useRef<string>('');
  
  // Use refs for values that need to be accessed in event listeners
  // to avoid closure issues
  const geocodedLatRef = useRef<number | null>(initialLat || null);
  const geocodedLngRef = useRef<number | null>(initialLng || null);
  const currentLatRef = useRef<number | null>(initialLat || null);
  const currentLngRef = useRef<number | null>(initialLng || null);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not configured');
      setErrorMessage('Google Maps API key not configured');
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      console.log('Google Maps already loaded');
      setIsLoaded(true);
      return;
    }

    // Check for existing script
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('Google Maps script exists, waiting for load');
      // Check if it's already loaded
      if (window.google && window.google.maps) {
        setIsLoaded(true);
      } else {
        // Wait for it to load
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps) {
            console.log('Google Maps loaded via existing script');
            setIsLoaded(true);
            clearInterval(checkLoaded);
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => clearInterval(checkLoaded), 10000);
      }
      return;
    }

    // Load the script
    console.log('Loading Google Maps script');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => {
      console.log('Google Maps script loaded successfully');
      setIsLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setErrorMessage('Failed to load Google Maps');
    };
    document.head.appendChild(script);
  }, []);

  // Geocode address when it changes
  useEffect(() => {
    if (!isLoaded || !address || address.trim() === '') {
      lastGeocodedAddressRef.current = '';
      return;
    }

    // Only geocode if the address has actually changed
    if (lastGeocodedAddressRef.current === address) {
      return;
    }

    const googleMaps = window.google.maps as any;
    
    if (!geocoderRef.current) {
      geocoderRef.current = new googleMaps.Geocoder();
    }

    setIsGeocoding(true);
    setErrorMessage(null);
    
    geocoderRef.current.geocode(
      { address },
      (results: any[], status: string) => {
        setIsGeocoding(false);
        
        if (status === 'OK' && results && results.length > 0) {
          const location = results[0].geometry.location;
          const lat = location.lat();
          const lng = location.lng();
          
          console.log('Geocoded address:', address, 'to coordinates:', lat, lng);
          
          // Mark this address as geocoded
          lastGeocodedAddressRef.current = address;
          
          // Update both state and refs
          setGeocodedLat(lat);
          setGeocodedLng(lng);
          geocodedLatRef.current = lat;
          geocodedLngRef.current = lng;
          
          // Always update to the newly geocoded coordinates when address changes
          setCurrentLat(lat);
          setCurrentLng(lng);
          currentLatRef.current = lat;
          currentLngRef.current = lng;
          onCoordinatesChange(lat, lng);
        } else {
          console.error('Geocoding failed:', status, 'for address:', address);
          setErrorMessage('Address not found. Please check the address.');
          setCurrentLat(null);
          setCurrentLng(null);
          setGeocodedLat(null);
          setGeocodedLng(null);
          currentLatRef.current = null;
          currentLngRef.current = null;
          geocodedLatRef.current = null;
          geocodedLngRef.current = null;
          lastGeocodedAddressRef.current = '';
        }
      }
    );
  }, [isLoaded, address, onCoordinatesChange]);

  // Initialize or update map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !currentLat || !currentLng) return;

    const googleMaps = window.google.maps as any;

    // Create map if it doesn't exist
    if (!mapInstanceRef.current) {
      const map = new googleMaps.Map(mapRef.current, {
        center: { lat: currentLat, lng: currentLng },
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'cooperative',
      });

      mapInstanceRef.current = map;

      if (showExactLocation) {
        // Create draggable marker for exact location
        const marker = new googleMaps.Marker({
          position: { lat: currentLat, lng: currentLng },
          map: map,
          draggable: true,
          title: 'Drag to adjust location',
        });

        markerRef.current = marker;
      } else {
        // Create circle for approximate location
        const circle = new googleMaps.Circle({
          strokeColor: '#DC2626',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#DC2626',
          fillOpacity: 0.25,
          map: map,
          center: { lat: currentLat, lng: currentLng },
          radius: AREA_RADIUS_M,
          draggable: true,
        });

        circleRef.current = circle;
      }

      // Handle drag end for marker or circle
      const handleDragEnd = () => {
        const position = showExactLocation && markerRef.current 
          ? markerRef.current.getPosition()
          : circleRef.current?.getCenter();
          
        if (!position) return;
        
        const newLat = position.lat();
        const newLng = position.lng();

        // Check distance from geocoded point (use refs to get current values)
        const geoLat = geocodedLatRef.current;
        const geoLng = geocodedLngRef.current;
        
        if (geoLat !== null && geoLng !== null) {
          const distance = calculateDistance(geoLat, geoLng, newLat, newLng);
          
          console.log('Distance moved:', distance.toFixed(2), 'km from geocoded position (max:', MAX_DISTANCE_KM, 'km)');
          
          if (distance > MAX_DISTANCE_KM) {
            // Snap back to the last valid position
            const snapLat = currentLatRef.current || geoLat;
            const snapLng = currentLngRef.current || geoLng;
            console.log('Distance exceeded, snapping back to:', snapLat, snapLng);
            setShowDistanceWarning(true);
            setTimeout(() => setShowDistanceWarning(false), 3000);
            if (showExactLocation && markerRef.current) {
              markerRef.current.setPosition({ lat: snapLat, lng: snapLng });
            } else if (circleRef.current) {
              circleRef.current.setCenter({ lat: snapLat, lng: snapLng });
            }
            return;
          }
        }

        console.log('Updating position to:', newLat, newLng);
        setCurrentLat(newLat);
        setCurrentLng(newLng);
        currentLatRef.current = newLat;
        currentLngRef.current = newLng;
        onCoordinatesChange(newLat, newLng);
        setShowDistanceWarning(false);
      };

      if (showExactLocation && markerRef.current) {
        markerRef.current.addListener('dragend', handleDragEnd);
      } else if (circleRef.current) {
        circleRef.current.addListener('dragend', handleDragEnd);
      }

      // Handle map click
      map.addListener('click', (e: any) => {
        const clickLat = e.latLng.lat();
        const clickLng = e.latLng.lng();

        // Check distance from geocoded point (use refs to get current values)
        const geoLat = geocodedLatRef.current;
        const geoLng = geocodedLngRef.current;
        
        if (geoLat !== null && geoLng !== null) {
          const distance = calculateDistance(geoLat, geoLng, clickLat, clickLng);
          
          console.log('Click distance from geocoded position:', distance.toFixed(2), 'km (max:', MAX_DISTANCE_KM, 'km)');
          
          if (distance > MAX_DISTANCE_KM) {
            setShowDistanceWarning(true);
            setTimeout(() => setShowDistanceWarning(false), 3000);
            return;
          }
        }

        if (showExactLocation && markerRef.current) {
          markerRef.current.setPosition({ lat: clickLat, lng: clickLng });
        } else if (circleRef.current) {
          circleRef.current.setCenter({ lat: clickLat, lng: clickLng });
        }
        setCurrentLat(clickLat);
        setCurrentLng(clickLng);
        currentLatRef.current = clickLat;
        currentLngRef.current = clickLng;
        onCoordinatesChange(clickLat, clickLng);
        setShowDistanceWarning(false);
      });
    } else {
      // Update existing map and marker/circle
      mapInstanceRef.current.setCenter({ lat: currentLat, lng: currentLng });
      if (showExactLocation && markerRef.current) {
        markerRef.current.setPosition({ lat: currentLat, lng: currentLng });
      } else if (!showExactLocation && circleRef.current) {
        circleRef.current.setCenter({ lat: currentLat, lng: currentLng });
      }
    }
  }, [isLoaded, currentLat, currentLng, geocodedLat, geocodedLng, showExactLocation, onCoordinatesChange]);

  // Handle switching between marker and circle when showExactLocation changes
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !currentLat || !currentLng) return;

    const googleMaps = window.google.maps as any;

    if (showExactLocation) {
      // Switch to marker mode
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      if (!markerRef.current) {
        const marker = new googleMaps.Marker({
          position: { lat: currentLat, lng: currentLng },
          map: mapInstanceRef.current,
          draggable: true,
          title: 'Drag to adjust location',
        });
        markerRef.current = marker;
        
        // Re-add event listener
        marker.addListener('dragend', () => {
          const position = marker.getPosition();
          if (!position) return;
          const newLat = position.lat();
          const newLng = position.lng();
          const geoLat = geocodedLatRef.current;
          const geoLng = geocodedLngRef.current;
          
          if (geoLat !== null && geoLng !== null) {
            const distance = calculateDistance(geoLat, geoLng, newLat, newLng);
            if (distance > MAX_DISTANCE_KM) {
              const snapLat = currentLatRef.current || geoLat;
              const snapLng = currentLngRef.current || geoLng;
              setShowDistanceWarning(true);
              setTimeout(() => setShowDistanceWarning(false), 3000);
              marker.setPosition({ lat: snapLat, lng: snapLng });
              return;
            }
          }
          
          setCurrentLat(newLat);
          setCurrentLng(newLng);
          currentLatRef.current = newLat;
          currentLngRef.current = newLng;
          onCoordinatesChange(newLat, newLng);
          setShowDistanceWarning(false);
        });
      }
    } else {
      // Switch to circle mode
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (!circleRef.current) {
        const circle = new googleMaps.Circle({
          strokeColor: '#DC2626',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#DC2626',
          fillOpacity: 0.25,
          map: mapInstanceRef.current,
          center: { lat: currentLat, lng: currentLng },
          radius: AREA_RADIUS_M,
          draggable: true,
        });
        circleRef.current = circle;
        
        // Re-add event listener
        circle.addListener('dragend', () => {
          const position = circle.getCenter();
          if (!position) return;
          const newLat = position.lat();
          const newLng = position.lng();
          const geoLat = geocodedLatRef.current;
          const geoLng = geocodedLngRef.current;
          
          if (geoLat !== null && geoLng !== null) {
            const distance = calculateDistance(geoLat, geoLng, newLat, newLng);
            if (distance > MAX_DISTANCE_KM) {
              const snapLat = currentLatRef.current || geoLat;
              const snapLng = currentLngRef.current || geoLng;
              setShowDistanceWarning(true);
              setTimeout(() => setShowDistanceWarning(false), 3000);
              circle.setCenter({ lat: snapLat, lng: snapLng });
              return;
            }
          }
          
          setCurrentLat(newLat);
          setCurrentLng(newLng);
          currentLatRef.current = newLat;
          currentLngRef.current = newLng;
          onCoordinatesChange(newLat, newLng);
          setShowDistanceWarning(false);
        });
      }
    }
  }, [showExactLocation, isLoaded, currentLat, currentLng, onCoordinatesChange]);

  if (!address || address.trim() === '') {
    return (
      <div className={className}>
        <div className="bg-gray-50 rounded-lg border border-gray-300 flex items-center justify-center text-center" style={{ minHeight: '250px' }}>
          <div>
            <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">Enter an address to see map preview</p>
          </div>
        </div>
      </div>
    );
  }

  if (isGeocoding) {
    return (
      <div className={className}>
        <div className="bg-gray-50 rounded-lg border border-gray-300 flex items-center justify-center text-center" style={{ minHeight: '250px' }}>
          <div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Locating address...</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className={className}>
        <div className="bg-red-50 rounded-lg border border-red-200 flex items-center justify-center text-center" style={{ minHeight: '250px' }}>
          <div>
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentLat || !currentLng) {
    return (
      <div className={className}>
        <div className="bg-gray-50 rounded-lg border border-gray-300 flex items-center justify-center text-center" style={{ minHeight: '250px' }}>
          <div>
            <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">No location found for this address</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Map */}
      <div className="relative">
        <div 
          ref={mapRef} 
          className="rounded-lg border border-gray-300 w-full h-[250px] md:h-[300px]"
        />
        
        {/* Coordinates overlay */}
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded px-2 py-1 shadow-sm">
          <div className="flex items-center text-xs text-gray-700">
            <MapPin className="w-3 h-3 mr-1 text-primary-600" />
            <span className="font-mono text-xs">
              {!showExactLocation && <span className="font-sans mr-1">Center:</span>}
              {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
            </span>
          </div>
        </div>

        {/* Distance warning */}
        {showDistanceWarning && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-3 py-1.5 rounded shadow-lg text-xs">
            Can't move pin more than {MAX_DISTANCE_KM}km from address
          </div>
        )}
      </div>

      {/* Instructions - plain text like other helper text */}
      <p className="text-xs text-gray-500 mt-2">
        {showExactLocation 
          ? `Drag the pin or click the map to fine-tune your exact location. Limited to ${MAX_DISTANCE_KM}km from the address you entered.`
          : `Showing approximate ${AREA_RADIUS_M}m area for privacy. Drag the circle or click the map to adjust the center. Limited to ${MAX_DISTANCE_KM}km from the address.`
        }
      </p>
    </div>
  );
}
