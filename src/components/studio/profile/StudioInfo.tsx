'use client';

import { Mic, Wifi, Headphones, Calendar } from 'lucide-react';

interface StudioInfoProps {
  studio: {
    id: string;
    name: string;
    description: string;
    studioTypes?: Array<{ studioType: string }>;
    services: Array<{ service: string }>;
    created_at: Date;
  };
}

export function StudioInfo({ studio }: StudioInfoProps) {
  const serviceIcons: Record<string, any> = {
    ISDN: Wifi,
    SOURCE_CONNECT: Wifi,
    SOURCE_CONNECT_NOW: Wifi,
    CLEANFEED: Wifi,
    SESSION_LINK_PRO: Wifi,
    ZOOM: Headphones,
    SKYPE: Headphones,
    TEAMS: Headphones,
  };

  const formatServiceName = (service: string) => {
    return service.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Services & Equipment */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center">
          <Mic className="w-5 h-5 mr-2" />
          Services & Equipment
        </h3>
        
        {studio.services.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {studio.services.map((service, index) => {
              const IconComponent = serviceIcons[service.service] || Mic;
              return (
                <div
                  key={index}
                  className="flex items-center p-3 bg-gray-50 rounded-lg"
                >
                  <IconComponent className="w-5 h-5 text-primary-600 mr-3 flex-shrink-0" />
                  <span className="text-sm font-medium text-text-primary">
                    {formatServiceName(service.service)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-text-secondary">No services listed</p>
        )}
      </div>

      {/* Studio Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">Studio Details</h3>
        
        <div className="space-y-4">
          {studio.studioTypes && studio.studioTypes.length > 0 && (
            <div className="flex items-start text-sm">
              <span className="font-medium text-text-primary w-24">Types:</span>
              <div className="flex flex-wrap gap-1">
                {studio.studioTypes.map((type, index) => (
                  <span 
                    key={index}
                    className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700"
                  >
                    {type.studioType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center text-sm">
            <Calendar className="w-4 h-4 mr-2 text-text-secondary" />
            <span className="font-medium text-text-primary w-22">Listed:</span>
            <span className="text-text-secondary">
              {new Date(studio.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">About This Studio</h3>
        <div className="prose prose-sm text-text-secondary">
          {studio.description.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-3 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
