'use client';

import Image from 'next/image';
import { Users, X } from 'lucide-react';

interface StudioMarkerTooltipProps {
  studio: {
    id: string;
    name: string;
    owner?: {
      username: string;
    };
    studio_images?: Array<{
      image_url: string;
      alt_text?: string;
    }>;
  };
  onClose?: () => void;
  showCloseButton?: boolean;
  isPopup?: boolean;
}

export function StudioMarkerTooltip({ 
  studio, 
  onClose, 
  showCloseButton = false,
  isPopup = false 
}: StudioMarkerTooltipProps) {
  const handleProfileClick = () => {
    if (studio.owner?.username) {
      window.location.href = `/${studio.owner.username}`;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${isPopup ? 'p-4 min-w-[280px]' : 'p-3 min-w-[240px]'}`}>
      {/* Close button for popup */}
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      )}

      <div className="flex items-center gap-3">
        {/* Studio Image/Logo - Left */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
            {studio.studio_images?.[0]?.image_url ? (
              <Image
                src={studio.studio_images[0].image_url}
                alt={studio.studio_images[0].alt_text || studio.name}
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Users className="w-6 h-6" />
              </div>
            )}
          </div>
        </div>

        {/* Studio Info - Right */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate text-sm">
            {studio.name}
          </h3>
          {studio.owner?.username && (
            <button
              onClick={handleProfileClick}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium mt-1 transition-colors"
            >
              View Profile →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
