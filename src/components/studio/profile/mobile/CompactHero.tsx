/**
 * CompactHero - Mobile-Optimized Profile Hero Section
 * 
 * Compact 120px height vs desktop's larger hero
 * 80x80px avatar positioned bottom-left
 * Name overlay with shadow for readability
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 3.
 */
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BadgeCheck, Star } from 'lucide-react';
import { isMobileFeatureEnabled } from '@/lib/feature-flags';

interface CompactHeroProps {
  studioName: string;
  ownerDisplayName: string;
  ownerUsername: string;
  ownerAvatarUrl?: string | undefined;
  heroImage?: string | undefined;
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
}

export function CompactHero({
  studioName,
  ownerDisplayName,
  ownerAvatarUrl,
  heroImage,
  isVerified,
  averageRating,
  reviewCount,
}: CompactHeroProps) {
  const [imageError, setImageError] = useState(false);

  // Phase 3 feature gate
  if (!isMobileFeatureEnabled(3)) {
    return null;
  }

  const heroImageUrl = heroImage || '/images/placeholder-studio.jpg';

  return (
    <div className="md:hidden relative w-full h-[120px] bg-gray-900">
      {/* Hero Background Image */}
      <div className="absolute inset-0">
        <Image
          src={heroImageUrl}
          alt={`${studioName} hero image`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
          onError={() => setImageError(true)}
        />
        {/* Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70" />
      </div>

      {/* Content Overlay */}
      <div className="relative h-full flex items-end p-4">
        <div className="flex items-end space-x-3 w-full">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-200">
              {ownerAvatarUrl && !imageError ? (
                <Image
                  src={ownerAvatarUrl}
                  alt={ownerDisplayName}
                  width={80}
                  height={80}
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#d42027] text-white text-2xl font-bold">
                  {ownerDisplayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Studio Name & Info */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-white font-bold text-xl leading-tight truncate">
                {studioName}
              </h1>
              {isVerified && (
                <BadgeCheck
                  className="w-5 h-5 text-blue-400 flex-shrink-0"
                  aria-label="Verified studio"
                />
              )}
            </div>

            {/* Rating */}
            {reviewCount > 0 && (
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" aria-hidden="true" />
                <span className="text-white text-sm font-medium">
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-white/80 text-xs">
                  ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
