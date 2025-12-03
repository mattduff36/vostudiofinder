'use client';

import { MapPin } from 'lucide-react';
import Image from 'next/image';
import { colors } from '../home/HomePage';

interface SelectedStudioDetailsProps {
  studio: {
    id: string;
    name: string;
    description?: string;
    city?: string;
    address?: string;
    is_verified?: boolean;
    owner?: {
      display_name: string;
      avatar_url?: string;
    };
    studio_studio_types?: Array<{ studio_type: string }>;
    studio_services?: Array<{ service: string }>;
  };
}

// Helper function to clean description
function cleanDescription(description: string | undefined): string {
  if (!description) return '';
  
  // Remove HTML tags
  let cleaned = description.replace(/<[^>]*>/g, '');
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Remove common placeholder text
  const placeholderTexts = [
    'add studio description here',
    'studio description',
    'description here',
    'enter description'
  ];
  
  const lowerCleaned = cleaned.toLowerCase();
  if (placeholderTexts.some(placeholder => lowerCleaned.includes(placeholder))) {
    return '';
  }
  
  return cleaned;
}

export function SelectedStudioDetails({ studio }: SelectedStudioDetailsProps) {
  const description = cleanDescription(studio.description);

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 mt-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Selected Studio
      </div>

      {/* Studio Name with Avatar and Verified Badge */}
      <div className="flex items-center gap-2 mb-3">
        {/* Avatar */}
        {studio.owner?.avatar_url && (
          <Image
            src={studio.owner.avatar_url}
            alt={`${studio.owner.display_name || studio.name} avatar`}
            width={32}
            height={32}
            className="rounded-md object-cover flex-shrink-0"
          />
        )}
        
        {/* Studio Name */}
        <div 
          className="flex-1 text-base font-bold"
          style={{ 
            color: colors.textPrimary,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            lineHeight: 1.3
          }}
        >
          <span>{studio.name}</span>
          {studio.is_verified && (
            <span 
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 flex-shrink-0" 
              title="Verified studio — approved by our team"
            >
              <svg className="w-2.5 h-2.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M5 13l4 4L19 7"></path>
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Location */}
      {(studio.city || studio.address) && (
        <div className="flex items-start mb-2">
          <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style={{ color: colors.textSecondary }} />
          <span className="text-sm" style={{ color: colors.textSecondary }}>
            {studio.city || studio.address}
          </span>
        </div>
      )}

      {/* Description */}
      {description && (
        <div 
          className="text-sm leading-relaxed mb-3 line-clamp-4"
          style={{ color: colors.textSecondary }}
        >
          {description}
        </div>
      )}

      {/* Studio Types */}
      {studio.studio_studio_types && studio.studio_studio_types.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {studio.studio_studio_types.map((type, index) => (
              <span 
                key={index}
                className="inline-block px-2 py-1 text-xs font-medium rounded" 
                style={{ backgroundColor: '#f3f4f6', color: '#000000' }}
              >
                {type.studio_type.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      {studio.studio_services && studio.studio_services.length > 0 && (
        <div>
          <div className="text-xs font-semibold mb-2" style={{ color: colors.textPrimary }}>
            Services:
          </div>
          <div className="flex flex-wrap gap-1">
            {studio.studio_services.slice(0, 3).map((service: any, index: number) => (
              <span
                key={index}
                className="inline-block px-2 py-1 bg-gray-100 text-xs rounded"
                style={{ color: colors.textSecondary }}
              >
                {service.service.replace(/_/g, ' ')}
              </span>
            ))}
            {studio.studio_services.length > 3 && (
              <span className="inline-block px-2 py-1 bg-gray-100 text-xs rounded" style={{ color: colors.textSecondary }}>
                +{studio.studio_services.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

