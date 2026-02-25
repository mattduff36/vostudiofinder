/**
 * Geocoding utilities for admin studio updates
 * Handles coordinate parsing, manual override detection, and address geocoding
 */

import { logger } from '@/lib/logger';
import type { AdminStudioUpdateInput } from './types';

type ExistingStudio = {
  full_address: string | null;
  latitude: any;
  longitude: any;
}

/**
 * Detects if coordinates are being manually overridden by the user
 */
export function detectManualCoordinateOverride(
  existingLat: number | null,
  existingLng: number | null,
  requestLat: number | null,
  requestLng: number | null
): boolean {
  if ((requestLat !== null || requestLng !== null) && existingLat === null && existingLng === null) {
    return true;
  }
  const epsilon = 0.000001;
  const latChanged = requestLat !== null && existingLat !== null && Math.abs(requestLat - existingLat) > epsilon;
  const lngChanged = requestLng !== null && existingLng !== null && Math.abs(requestLng - existingLng) > epsilon;
  return latChanged || lngChanged;
}

/**
 * Parses coordinates from request body (handles string | number types)
 */
export function parseRequestCoordinates(
  latitude: string | number | null | undefined,
  longitude: string | number | null | undefined
): { lat: number | null; lng: number | null } {
  let lat: number | null = null;
  let lng: number | null = null;
  
  if (latitude !== undefined && latitude !== null && latitude !== '') {
    lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  }
  if (longitude !== undefined && longitude !== null && longitude !== '') {
    lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
  }
  
  return { lat, lng };
}

/**
 * Determines if geocoding should happen and performs it if needed
 * Returns updated coordinate data or empty object
 */
export async function maybeGeocodeStudioAddress(
  existingStudio: ExistingStudio,
  requestBody: AdminStudioUpdateInput
): Promise<Partial<{ latitude: number | null; longitude: number | null; city?: string; location?: string }>> {
  
  const newFullAddress = requestBody._meta?.full_address;
  
  // No address in request, skip
  if (newFullAddress === undefined || !newFullAddress) {
    return {};
  }
  
  const fullAddressChanged = newFullAddress !== existingStudio.full_address;
  
  if (fullAddressChanged) {
    // Address changed - check if coordinates are being manually changed
    const existingLat = existingStudio.latitude ? parseFloat(existingStudio.latitude.toString()) : null;
    const existingLng = existingStudio.longitude ? parseFloat(existingStudio.longitude.toString()) : null;
    
    const { lat: requestLat, lng: requestLng } = parseRequestCoordinates(
      requestBody._meta?.latitude,
      requestBody._meta?.longitude
    );
    
    const coordinatesManuallyChanged = detectManualCoordinateOverride(
      existingLat,
      existingLng,
      requestLat,
      requestLng
    );
    
    // Only geocode if coordinates aren't being manually changed
    if (!coordinatesManuallyChanged) {
      logger.log(`[Geocoding] Full address changed, geocoding: ${newFullAddress}`);
      const { geocodeAddress } = await import('@/lib/maps');
      const geocodeResult = await geocodeAddress(newFullAddress);
      
      if (geocodeResult) {
        logger.log(`[Geocoding] Success: lat=${geocodeResult.lat}, lng=${geocodeResult.lng}, city=${geocodeResult.city}, country=${geocodeResult.country}`);
        
        const updates: any = {
          latitude: geocodeResult.lat,
          longitude: geocodeResult.lng,
        };
        
        // Auto-populate city and location (country) if not explicitly being changed
        if (requestBody._meta?.city === undefined && geocodeResult.city) {
          updates.city = geocodeResult.city;
        }
        if (requestBody._meta?.location === undefined && geocodeResult.country) {
          updates.location = geocodeResult.country;
        }
        
        return updates;
      } else {
        logger.log(`[Geocoding] Failed to geocode address: ${newFullAddress} - clearing coordinates`);
        // Clear coordinates on geocode failure
        return { latitude: null, longitude: null };
      }
    } else {
      logger.log(`[Geocoding] Skipped - coordinates manually changed`);
      return {};
    }
  } else if (!existingStudio.latitude || !existingStudio.longitude) {
    const { lat: requestLat, lng: requestLng } = parseRequestCoordinates(
      requestBody._meta?.latitude,
      requestBody._meta?.longitude
    );
    if (requestLat !== null && requestLng !== null) {
      logger.log(`[Geocoding] Skipped - request provides coordinates: lat=${requestLat}, lng=${requestLng}`);
      return {};
    }

    // Address hasn't changed but coordinates are empty - geocode anyway
    logger.log(`[Geocoding] Coordinates empty, geocoding existing address: ${newFullAddress}`);
    const { geocodeAddress } = await import('@/lib/maps');
    const geocodeResult = await geocodeAddress(newFullAddress);
    
    if (geocodeResult) {
      logger.log(`[Geocoding] Success: lat=${geocodeResult.lat}, lng=${geocodeResult.lng}, city=${geocodeResult.city}, country=${geocodeResult.country}`);
      
      const updates: any = {
        latitude: geocodeResult.lat,
        longitude: geocodeResult.lng,
      };
      
      // Auto-populate city and location (country) if not explicitly being changed
      if (requestBody._meta?.city === undefined && geocodeResult.city) {
        updates.city = geocodeResult.city;
      }
      if (requestBody._meta?.location === undefined && geocodeResult.country) {
        updates.location = geocodeResult.country;
      }
      
      return updates;
    } else {
      logger.log(`[Geocoding] Failed to geocode address: ${newFullAddress}`);
      // Clear coordinates on failure
      return { latitude: null, longitude: null };
    }
  }
  
  return {};
}
