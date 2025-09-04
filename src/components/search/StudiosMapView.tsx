'use client';

import { useState, useEffect } from 'react';
import { GoogleMap } from '@/components/maps/GoogleMap';
import { MapLocation } from '@/lib/maps';

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
}

export function StudiosMapView({ studios }: StudiosMapViewProps) {
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null);
  const [mapCenter, setMapCenter] = useState<MapLocation>({ lat: 51.5074, lng: -0.1278 }); // Default to London

  // Calculate map center based on studios with coordinates
  useEffect(() => {
    const studiosWithCoords = studios.filter(studio => studio.latitude && studio.longitude);
    
    if (studiosWithCoords.length > 0) {
      const avgLat = studiosWithCoords.reduce((sum, studio) => sum + (studio.latitude || 0), 0) / studiosWithCoords.length;
      const avgLng = studiosWithCoords.reduce((sum, studio) => sum + (studio.longitude || 0), 0) / studiosWithCoords.length;
      setMapCenter({ lat: avgLat, lng: avgLng });
    }
  }, [studios]);

  // Create markers for studios with coordinates
  const markers = studios
    .filter(studio => studio.latitude && studio.longitude)
    .map(studio => ({
      id: studio.id,
      position: { lat: studio.latitude!, lng: studio.longitude! },
      title: studio.name,
      onClick: () => setSelectedStudio(studio),
    }));

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Map */}
        <div className="lg:col-span-2">
          <GoogleMap
            center={mapCenter}
            zoom={6}
            markers={markers}
            height="100%"
            className="rounded-lg border border-gray-200"
          />
        </div>

        {/* Studio Details Panel */}
        <div className="lg:col-span-1">
          {selectedStudio ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 h-full overflow-y-auto">
              <div className="flex items-start space-x-4 mb-4">
                {selectedStudio.images.length > 0 && selectedStudio.images[0] ? (
                  <img
                    src={selectedStudio.images[0].imageUrl}
                    alt={selectedStudio.images[0].altText || selectedStudio.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No Image</span>
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {selectedStudio.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    by {selectedStudio.owner.displayName}
                  </p>
                  <div className="flex items-center space-x-2">
                    {selectedStudio.isPremium && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Premium
                      </span>
                    )}
                    {selectedStudio.isVerified && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Description</h4>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {selectedStudio.description}
                  </p>
                </div>

                {selectedStudio.address && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Address</h4>
                    <p className="text-sm text-gray-600">{selectedStudio.address}</p>
                  </div>
                )}

                {selectedStudio.services.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Services</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedStudio.services.slice(0, 4).map((service, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {service.service.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {selectedStudio.services.length > 4 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          +{selectedStudio.services.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <a
                    href={`/studio/${selectedStudio.id}`}
                    className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors inline-block text-center"
                  >
                    View Studio Details
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6 h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium mb-1">Select a studio</p>
                <p className="text-xs">Click on a map marker to view studio details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Studios without coordinates message */}
      {studios.some(studio => !studio.latitude || !studio.longitude) && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> {studios.filter(studio => !studio.latitude || !studio.longitude).length} studio(s) 
            don't have location coordinates and won't appear on the map. They may still be available in the list view.
          </p>
        </div>
      )}
    </div>
  );
}
