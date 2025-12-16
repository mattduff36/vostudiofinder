/**
 * MapCollapsible - Full-Screen Map View for Mobile
 * 
 * Always expanded on Map View tab, fills remaining viewport space
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 2.
 */
'use client';

import { MapPin, Maximize2 } from 'lucide-react';
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
}: MapCollapsibleProps) {
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
    <div 
      className="md:hidden bg-white border-y border-gray-200 overflow-hidden"
      style={{
        maxHeight: 'calc(100vh - 312px)', // Full viewport minus header (180px) + filters (67px) + bottom nav (65px)
        height: 'calc(100vh - 312px)',
        minHeight: '300px' // Minimum height for usability
      }}
    >
      {/* Full-Screen Map View */}
      <div className="relative w-full h-full overflow-hidden">
        {/* Map Container */}
        <div className="relative w-full h-full bg-gray-100">
          <GoogleMap
            center={center}
            zoom={zoom}
            markers={transformedMarkers}
            searchCenter={searchCenter || null}
            searchRadius={searchRadius || null}
            selectedMarkerId={selectedMarkerId || null}
            {...(onBoundsChanged ? { onBoundsChanged } : {})}
            height="100%"
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
      </div>
    </div>
  );
}
