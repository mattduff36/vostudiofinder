/**
 * MapCollapsible - Collapsible Map View for Mobile
 * 
 * Collapsed state: 60px "Show Map" bar
 * Expanded state: 240px embedded map view
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 2.
 */
'use client';

import { useState } from 'react';
import { Map, MapPin, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { GoogleMap } from '@/components/maps/GoogleMap';
import { isMobileFeatureEnabled } from '@/lib/feature-flags';

interface MapCollapsibleProps {
  markers: Array<{
    id: string;
    name: string;
    latitude?: number | null;
    longitude?: number | null;
    studio_studio_types: Array<{ studio_type: string }>;
    is_verified: boolean;
    users?: {
      username?: string | null;
      avatar_url?: string | null;
    };
    studio_images?: Array<{ image_url: string; alt_text?: string }>;
  }>;
  center: { lat: number; lng: number };
  zoom: number;
  searchCenter?: { lat: number; lng: number } | null;
  searchRadius?: number | null;
  onMarkerClick: (data: any, event: any) => void;
  onBoundsChanged?: ((bounds: { north: number; south: number; east: number; west: number }) => void) | undefined;
  selectedMarkerId?: string | null;
  initiallyExpanded?: boolean;
}

export function MapCollapsible({
  markers,
  center,
  zoom,
  searchCenter,
  searchRadius,
  onMarkerClick,
  onBoundsChanged,
  selectedMarkerId,
  initiallyExpanded = false,
}: MapCollapsibleProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  // Phase 2 feature gate
  if (!isMobileFeatureEnabled(2)) {
    return null;
  }

  const markerCount = markers.length;

  // Transform markers to GoogleMap format
  const transformedMarkers = markers
    .filter((m) => m.latitude && m.longitude)
    .map((marker) => ({
      id: marker.id,
      position: { lat: marker.latitude!, lng: marker.longitude! },
      title: marker.name,
      studio_type: marker.studio_studio_types[0]?.studio_type || 'VOICEOVER',
      is_verified: marker.is_verified,
      onClick: (event: any) => onMarkerClick(marker, event),
      ...(marker.users?.username ? {
        studio: {
          id: marker.id,
          name: marker.name,
          owner: {
            username: marker.users.username,
            avatar_url: marker.users.avatar_url || undefined,
          },
          images: marker.studio_images?.map(img => ({
            imageUrl: img.image_url,
            ...(img.alt_text ? { alt_text: img.alt_text } : {}),
          })) || [],
        }
      } : {}),
    }));

  return (
    <div className="md:hidden bg-white border-y border-gray-200">
      {/* Collapsed Bar */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          aria-label="Show map"
          aria-expanded="false"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#d42027] bg-opacity-10 rounded-lg flex items-center justify-center">
              <Map className="w-5 h-5 text-[#d42027]" aria-hidden="true" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">View Map</p>
              <p className="text-xs text-gray-500">
                {markerCount} {markerCount === 1 ? 'studio' : 'studios'} in this area
              </p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-gray-400" aria-hidden="true" />
        </button>
      )}

      {/* Expanded Map View */}
      {isExpanded && (
        <div className="relative">
          {/* Map Container */}
          <div className="relative h-60 bg-gray-100">
            <GoogleMap
              center={center}
              zoom={zoom}
              markers={transformedMarkers}
              searchCenter={searchCenter || null}
              searchRadius={searchRadius || null}
              selectedMarkerId={selectedMarkerId || null}
              {...(onBoundsChanged ? { onBoundsChanged } : {})}
              height="240px"
            />

            {/* Overlay Controls */}
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
              {/* Map Info Badge */}
              <div className="bg-white rounded-lg shadow-md px-3 py-2 pointer-events-auto">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-[#d42027]" aria-hidden="true" />
                  <span className="text-xs font-medium text-gray-900">
                    {markerCount} {markerCount === 1 ? 'Studio' : 'Studios'}
                  </span>
                </div>
              </div>

              {/* Full Screen Button (Future) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement full-screen map view in Phase 2.5
                  alert('Full-screen map coming soon!');
                }}
                className="bg-white rounded-lg shadow-md p-2 pointer-events-auto hover:bg-gray-50 transition-colors"
                aria-label="Expand to full screen"
                title="Full screen map (coming soon)"
              >
                <Maximize2 className="w-4 h-4 text-gray-600" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Collapse Bar */}
          <button
            onClick={() => setIsExpanded(false)}
            className="w-full px-4 py-3 flex items-center justify-center space-x-2 bg-white border-t border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Hide map"
            aria-expanded="true"
          >
            <span className="text-sm font-medium text-gray-700">Hide Map</span>
            <ChevronUp className="w-4 h-4 text-gray-500" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
