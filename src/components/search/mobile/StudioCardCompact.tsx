/**
 * StudioCardCompact - Mobile-Optimized Studio Card
 * 
 * Compact card design for mobile studio listings:
 * - Full width with 16px padding
 * - 16:9 image aspect ratio (~180px height)
 * - Essential info only (name, location, types, rating)
 * - Large tap target (entire card clickable)
 * 
 * Only used on mobile (< 768px), feature-gated by Phase 2.
 */
'use client';

import Image from 'next/image';
import { MapPin, Star, BadgeCheck } from 'lucide-react';
import { theme } from '@/lib/theme';

interface Studio {
  id: string;
  name: string;
  description: string;
  studio_studio_types: Array<{ studio_type: string }>;
  address: string;
  city?: string;
  website_url?: string;
  phone?: string;
  is_premium: boolean;
  is_verified: boolean;
  owner?: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
  };
  studio_services: Array<{ service: string }>;
  studio_images: Array<{ image_url: string; alt_text?: string }>;
  _count: { reviews: number };
}

interface StudioCardCompactProps {
  studio: Studio;
  onClick?: () => void;
}

export function StudioCardCompact({ studio, onClick }: StudioCardCompactProps) {
  const primaryImage = studio.studio_images[0]?.image_url || '/images/Featured-Studio-Placeholder.png';
  const studioTypes = studio.studio_studio_types
    .map((st) => st.studio_type)
    .slice(0, 2); // Show max 2 types on mobile

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (studio.owner?.username) {
      window.open(`/${studio.owner.username}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow-sm hover:shadow-md active:shadow-lg border border-gray-200 overflow-hidden transition-all duration-200 cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`View ${studio.name}`}
    >
      {/* Studio Image - 16:9 aspect ratio */}
      <div className="relative w-full aspect-video bg-gray-100">
        <Image
          src={primaryImage}
          alt={studio.studio_images[0]?.alt_text || `${studio.name} studio`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={false}
        />
        
        {/* Verified Badge Overlay */}
        {studio.is_verified && (
          <div className="absolute top-2 right-2 bg-white bg-opacity-95 rounded-full p-1.5 shadow-md">
            <BadgeCheck className="w-4 h-4" style={{ color: theme.colors.primary }} aria-hidden="true" />
            <span className="sr-only">Verified studio</span>
          </div>
        )}
      </div>

      {/* Studio Info */}
      <div className="p-3 space-y-2">
        {/* Name */}
        <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
          {studio.name}
        </h3>

        {/* Location */}
        <div className="flex items-center space-x-1.5 text-sm text-gray-600">
          <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">
            {studio.city || studio.address}
          </span>
        </div>

        {/* Studio Types */}
        {studioTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {studioTypes.map((type) => (
              <span
                key={type}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
              >
                {type.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Rating & Reviews (if available) */}
        {studio._count.reviews > 0 && (
          <div className="flex items-center space-x-1 text-sm">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
            <span className="font-medium text-gray-900">5.0</span>
            <span className="text-gray-500">
              ({studio._count.reviews} {studio._count.reviews === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
