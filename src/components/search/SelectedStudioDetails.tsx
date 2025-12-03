'use client';

import { useEffect, useState } from 'react';
import { MapPin, Star } from 'lucide-react';
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
      username: string;
      avatar_url?: string;
    };
    studio_studio_types?: Array<{ studio_type: string }>;
    studio_services?: Array<{ service: string }>;
    studio_images?: Array<{ image_url: string; alt_text?: string }>;
    _count?: { reviews: number };
  };
}

// Helper function to clean description
function cleanDescription(description: string | undefined): string {
  if (!description) return '';
  
  // Remove HTML tags
  let cleaned = description.replace(/<[^>]*>/g, '');
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Remove common placeholder text - only if description is essentially JUST placeholder text
  const placeholderTexts = [
    'add studio description here',
    'studio description',
    'description here',
    'enter description',
    'add description',
    'description',
    'enter your description'
  ];
  
  const lowerCleaned = cleaned.toLowerCase().trim();
  // Check if the entire description is essentially just placeholder text
  // (exact match or placeholder text with minimal additional characters)
  if (placeholderTexts.some(placeholder => lowerCleaned === placeholder || lowerCleaned === placeholder + '.')) {
    return '';
  }
  
  // Also check if description is extremely short (likely placeholder)
  if (lowerCleaned.length < 10 && placeholderTexts.some(placeholder => lowerCleaned.includes(placeholder))) {
    return '';
  }
  
  return cleaned;
}

export function SelectedStudioDetails({ studio }: SelectedStudioDetailsProps) {
  const description = cleanDescription(studio.description);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Keep animation class applied for full duration
  useEffect(() => {
    // Use requestAnimationFrame to ensure the animation starts after initial render
    requestAnimationFrame(() => {
      const timer = setTimeout(() => {
        setHasAnimated(true);
      }, 800); // Match animation duration
      
      return () => clearTimeout(timer);
    });
  }, []); // Empty dependency array - runs once on mount only

  const handleCardClick = () => {
    if (studio.owner?.username) {
      window.open(`/${studio.owner.username}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="mt-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Selected Studio
      </div>

      {/* Full Studio Card - matching StudiosList design with red border to indicate selection */}
      <div
        onClick={handleCardClick}
        className={`bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col w-full ${studio.owner?.username ? 'cursor-pointer' : 'cursor-default'} ${!hasAnimated ? 'animate-expand-center' : ''}`}
        style={{
          border: '3px solid #EF4444', // Red border directly on edge
          minHeight: '360px'
        }}
      >
        {/* Studio Image */}
        <div className="aspect-[25/12] bg-gray-200 rounded-t-lg overflow-hidden relative">
          {studio.studio_images?.[0]?.image_url ? (
            <Image
              src={studio.studio_images[0].image_url}
              alt={studio.studio_images[0].alt_text || studio.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <Image
                src="/images/voiceover-studio-finder-header-logo2-black.png"
                alt="VoiceoverStudioFinder Logo"
                width={120}
                height={40}
                className="opacity-30"
              />
            </div>
          )}
          
          {/* Studio Types Badges */}
          <div className="absolute bottom-2 right-2 flex flex-wrap gap-1">
            {studio.studio_studio_types?.slice(0, 2).map((type, index) => (
              <span 
                key={index}
                className="inline-block px-2 py-1 text-xs font-medium rounded shadow-lg" 
                style={{ backgroundColor: '#f3f4f6', color: '#000000', border: 'none' }}
              >
                {type.studio_type.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </span>
            ))}
            {studio.studio_studio_types && studio.studio_studio_types.length > 2 && (
              <span 
                className="inline-block px-2 py-1 text-xs font-medium rounded shadow-lg" 
                style={{ backgroundColor: '#f3f4f6', color: '#000000', border: 'none' }}
              >
                +{studio.studio_studio_types.length - 2}
              </span>
            )}
          </div>
        </div>

        <div className="p-3 sm:p-4 flex flex-col flex-grow">
          {/* Studio Name with Avatar and Verified Badge */}
          <div className="flex items-center gap-2 mb-2">
            {/* Avatar */}
            {studio.owner?.avatar_url && (
              <Image
                src={studio.owner.avatar_url}
                alt={`${studio.owner.display_name || studio.name} avatar`}
                width={28}
                height={28}
                className="rounded-md object-cover flex-shrink-0"
              />
            )}
            
            {/* Studio Name */}
            <h3 
              className="flex-1 text-sm font-bold"
              style={{ 
                color: colors.textPrimary,
                margin: 0,
                padding: 0,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{studio.name}</span>
              {studio.is_verified && (
                <span 
                  className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-green-600 hover:bg-red-600 transition-colors cursor-help flex-shrink-0" 
                  title="Verified studio — approved by our team"
                >
                  <svg className="w-2 h-2 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </span>
              )}
            </h3>
          </div>

          {/* Location and Description */}
          <div className="mb-3">
            <div className="text-sm leading-snug" style={{ color: colors.textSecondary }}>
              {/* Location */}
              {(studio.city || studio.address) && (
                <div className="flex items-start mb-1.5">
                  <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{studio.city || studio.address}</span>
                </div>
              )}
              
              {/* Description */}
              {description && (
                <div 
                  className="line-clamp-5 text-sm leading-snug"
                  style={{ color: 'inherit' }}
                  title={description}
                >
                  {description}
                </div>
              )}
            </div>
          </div>

          {/* Services */}
          {studio.studio_services && studio.studio_services.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {studio.studio_services.slice(0, 2).map((service: any, index: number) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-1 bg-gray-100 text-xs rounded"
                    style={{ color: colors.textSecondary }}
                  >
                    {service.service.replace(/_/g, ' ')}
                  </span>
                ))}
                {studio.studio_services.length > 2 && (
                  <span className="inline-block px-2 py-1 bg-gray-100 text-xs rounded" style={{ color: colors.textSecondary }}>
                    +{studio.studio_services.length - 2} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Stats & CTA */}
          <div className="flex items-center justify-between mt-auto pt-1">
            <div className="flex items-center space-x-3 text-sm" style={{ color: colors.textSecondary }}>
              {(studio._count?.reviews ?? 0) > 0 && (
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  <span>{studio._count?.reviews}</span>
                </div>
              )}
            </div>
            
            <div className="px-3 py-1.5 text-white text-sm font-medium rounded transition-colors pointer-events-none" style={{ backgroundColor: colors.primary }}>
              View Details
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

