'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { GoogleMap } from '@/components/maps/GoogleMap';
import { MapLocation } from '@/lib/maps';
import { MapPin } from 'lucide-react';
import { colors } from '@/components/home/HomePage';
import { cleanDescription } from '@/lib/utils/text';

interface Studio {
  id: string;
  name: string;
  description: string;
  studioType: string;
  address: string;
  websiteUrl?: string;
  phone?: string;
  isPremium: boolean;
  isVerified: boolean;
  latitude?: number;
  longitude?: number;
  owner: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  services: Array<{ service: string }>;
  images: Array<{ imageUrl: string; altText?: string }>;
  _count: { reviews: number };
}

interface StudiosMapViewProps {
  studios: Studio[];
  searchCoordinates?: { lat: number; lng: number } | null | undefined;
  searchRadius?: number | null | undefined;
}

export function StudiosMapView({ studios, searchCoordinates, searchRadius }: StudiosMapViewProps) {
  const searchParams = useSearchParams();
  const [selectedStudios, setSelectedStudios] = useState<Studio[]>([]);
  const [mapCenter, setMapCenter] = useState<MapLocation>({ lat: 51.5074, lng: -0.1278 }); // Default to London
  const [mapZoom, setMapZoom] = useState<number>(6);

  // Set map center based on search center or studios
  useEffect(() => {
    // Try to get coordinates from API response first, then fall back to URL params
    let coords = searchCoordinates;
    let radius = searchRadius;
    
    if (!coords) {
      // Fall back to URL parameters (for backward compatibility)
      const lat = searchParams.get('lat');
      const lng = searchParams.get('lng');
      if (lat && lng) {
        coords = { lat: parseFloat(lat), lng: parseFloat(lng) };
      }
    }
    
    if (!radius) {
      const urlRadius = searchParams.get('radius');
      if (urlRadius) {
        radius = parseInt(urlRadius);
      }
    }
    
    if (coords) {
      // Use search center if available
      setMapCenter({ lat: coords.lat, lng: coords.lng });
      setMapZoom(10); // Default zoom, will be overridden by fitBounds in GoogleMap
    } else {
      // No search location - show global view of all studios
      setMapCenter({ lat: 20, lng: 0 }); // Center on world map
      setMapZoom(2); // Global zoom level to show the world
    }
  }, [studios, searchCoordinates, searchRadius, searchParams]);

  // Create markers for studios with coordinates
  const markers = studios
    .filter(studio => studio.latitude && studio.longitude)
    .map(studio => ({
      id: studio.id,
      position: { lat: studio.latitude!, lng: studio.longitude! },
      title: studio.name,
      studioType: studio.studioType,
      isVerified: studio.isVerified,
      onClick: () => setSelectedStudios([studio]),
    }));


  return (
    <div className="h-full space-y-6">
      {/* Map - Full Width */}
      <div className="h-[500px]">
        <GoogleMap
          center={mapCenter}
          zoom={mapZoom}
          markers={markers}
          searchCenter={searchCoordinates || (searchParams.get('lat') && searchParams.get('lng') ? {
            lat: parseFloat(searchParams.get('lat')!),
            lng: parseFloat(searchParams.get('lng')!)
          } : null)}
          searchRadius={searchRadius || (searchParams.get('radius') ? parseInt(searchParams.get('radius')!) : null)}
          selectedMarkerId={selectedStudios[0]?.id || null}
          height="100%"
          className="rounded-lg border border-gray-200"
        />
      </div>

      {/* Selected Studio Details - Full Width Under Map */}
      <div>
        {selectedStudios.length > 0 ? (
          <div className="space-y-4">
            {selectedStudios.map((studio) => (
              <div 
                key={studio.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg hover:border-primary-200 transition-all duration-300 flex overflow-hidden h-[280px] cursor-pointer"
                onClick={() => window.location.href = `/${studio.owner?.username}`}
              >
            {/* Studio Image - 50% width, square aspect ratio */}
            <div className="w-1/2 relative bg-gray-200 flex items-center justify-center">
              <div className="w-full h-full relative">
                {studio.images.length > 0 && studio.images[0] ? (
                  <img
                    src={studio.images[0].imageUrl}
                    alt={studio.images[0].altText || studio.name}
                    className="w-full h-full object-cover rounded-l-lg"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center rounded-l-lg">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                )}
                
                {/* Studio Type Badge - Bottom Right of Image */}
                <div className="absolute bottom-2 right-2">
                  <span className="inline-block px-2 py-1 text-xs font-medium rounded shadow-lg bg-gray-100 text-black">
                    {studio.studioType.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Studio Info - 50% width */}
            <div className="w-1/2 p-4 flex flex-col relative">
              {/* Studio Name - Fixed positioning */}
              <h3 className="text-sm sm:text-base md:text-lg font-semibold line-clamp-1 mb-3" style={{ color: colors.textPrimary, margin: '0 0 12px 0' }}>
                {studio.name}
              </h3>
              
              {/* Location and Description */}
              <div className="mb-4">
                <div className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                  {/* Location */}
                  {studio.address && studio.address.trim() && (
                    <div className="flex items-start mb-2">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{studio.address}</span>
                    </div>
                  )}
                  
                  {/* Description with 4-line limit and "... See More" - exactly like list cards */}
                  <div 
                    className="overflow-hidden"
                    style={{ 
                      maxHeight: studio.address && studio.address.trim() ? '4.5rem' : '6rem',
                      lineHeight: '1.5rem'
                    }}
                    title={cleanDescription(studio.description)}
                  >
                    {(() => {
                      const description = cleanDescription(studio.description);
                      const availableLines = studio.address && studio.address.trim() ? 3 : 4;
                      const seeMoreText = '..... See More';
                      const maxChars = (availableLines * 45) - seeMoreText.length;
                      
                      if (description.length > maxChars) {
                        const truncated = description.substring(0, maxChars).trim();
                        const lastSpace = truncated.lastIndexOf(' ');
                        const finalText = lastSpace > maxChars - 15 ? truncated.substring(0, lastSpace) : truncated;
                        return finalText + seeMoreText;
                      }
                      return description;
                    })()}
                  </div>
                </div>
              </div>
              
              {/* Services */}
              {studio.services.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {studio.services.slice(0, 3).map((service, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 text-xs font-medium rounded"
                      style={{ backgroundColor: '#f3f4f6', color: '#000000' }}
                    >
                      {service.service.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {studio.services.length > 3 && (
                    <span
                      className="inline-block px-2 py-1 text-xs font-medium rounded"
                      style={{ backgroundColor: '#f3f4f6', color: '#000000' }}
                    >
                      +{studio.services.length - 3} more
                    </span>
                  )}
                </div>
              )}
              
              {/* Bottom Row - Verified Badge and View Details Button */}
              <div className="flex items-center justify-between mt-auto">
                {/* Verified Badge - Bottom Left - Same styling as list cards */}
                <div>
                  {studio.isVerified && (
                    <span className="text-green-600 font-medium text-xs">✓ Verified</span>
                  )}
                </div>
                
                {/* View Details Button - Bottom Right */}
                <div
                  className="px-3 py-1.5 text-white text-sm font-medium rounded transition-colors pointer-events-none"
                  style={{ backgroundColor: colors.primary }}
                >
                  View Details
                </div>
              </div>
            </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Select a studio</h3>
            <p className="text-sm text-gray-500">Click on a map marker to view studio details</p>
          </div>
        )}
      </div>

      {/* Studios without coordinates message */}
      {studios.some(studio => !studio.latitude || !studio.longitude) && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> {studios.filter(studio => !studio.latitude || !studio.longitude).length} studio(s) 
            don't have location coordinates and won't appear on the map. They may still be available in the list view.
          </p>
        </div>
      )}
    </div>
  );
}
