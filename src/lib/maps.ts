// Google Maps integration utilities

export interface MapLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  country?: string;
}

/**
 * Geocode an address to coordinates using Google Maps API
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  // Use server-side API key (without referrer restrictions) for server-side geocoding
  // Fall back to NEXT_PUBLIC key if server key not available
  const serverKey = process.env.GOOGLE_MAPS_API_KEY;
  const clientKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const apiKey = serverKey || clientKey;
  
  if (!apiKey) {
    console.warn('[Geocoding] Google Maps API key not configured');
    return null;
  }
  
  // Log which key is being used (for debugging) - show masked version
  const maskKey = (key: string) => {
    if (!key || key.length < 8) return '***';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };
  
  if (serverKey) {
    console.log(`[Geocoding] Using server-side API key (GOOGLE_MAPS_API_KEY): ${maskKey(serverKey)}`);
  } else if (clientKey) {
    console.warn(`[Geocoding] WARNING: Using client-side API key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY): ${maskKey(clientKey)} - this may fail if key has referrer restrictions`);
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      
      // Extract city/region and country from address components
      // Priority for city/region: locality > postal_town > administrative_area_level_2 > administrative_area_level_1
      const addressComponents = result.address_components;
      let city = '';
      let country = '';
      
      // Find city/region with priority order
      const cityComponent = addressComponents.find((c: any) => c.types.includes('locality')) ||
                           addressComponents.find((c: any) => c.types.includes('postal_town')) ||
                           addressComponents.find((c: any) => c.types.includes('administrative_area_level_2')) ||
                           addressComponents.find((c: any) => c.types.includes('administrative_area_level_1'));
      
      if (cityComponent) {
        city = cityComponent.long_name;
      }
      
      // Find country
      const countryComponent = addressComponents.find((c: any) => c.types.includes('country'));
      if (countryComponent) {
        country = countryComponent.long_name;
      }
      
      return {
        lat: location.lat,
        lng: location.lng,
        address: result.formatted_address,
        city,
        country,
      };
    }
    
    // Log the error status for debugging
    console.error(`[Geocoding] Google Maps API error: status=${data.status}, error_message=${data.error_message || 'N/A'}`);
    if (data.status === 'ZERO_RESULTS') {
      console.error(`[Geocoding] No results found for address: ${address}`);
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      console.error(`[Geocoding] API quota exceeded`);
    } else if (data.status === 'REQUEST_DENIED') {
      console.error(`[Geocoding] Request denied - check API key and permissions`);
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address using Google Maps API
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates (in kilometers)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get user's current location
 */
export function getCurrentLocation(): Promise<MapLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2592000000, // 30 days
      }
    );
  });
}
