/**
 * CompactHero - Mobile-Optimized Profile Hero Section
 * 
 * Two-part design:
 * 1. Full-width hero image (no overlay text)
 * 2. Avatar and basic info section below
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 3.
 */
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, MapPin } from 'lucide-react';
import { isMobileFeatureEnabled } from '@/lib/feature-flags';

interface CompactHeroProps {
  studioName: string;
  ownerDisplayName: string;
  ownerUsername: string;
  ownerAvatarUrl?: string | undefined;
  heroImage?: string | undefined;
  isVerified: boolean;
  abbreviatedAddress?: string | undefined;
  showAddress?: boolean | null | undefined;
}

export function CompactHero({
  studioName,
  ownerDisplayName,
  ownerAvatarUrl,
  heroImage,
  isVerified,
  abbreviatedAddress,
  showAddress = true,
}: CompactHeroProps) {
  const [imageError, setImageError] = useState(false);

  // Phase 3 feature gate
  if (!isMobileFeatureEnabled(3)) {
    return null;
  }

  const heroImageUrl = heroImage || '/images/placeholder-studio.jpg';
  const shouldShowAddress = showAddress !== false;

  return (
    <div className="md:hidden bg-white">
      {/* Hero Image - Full Width */}
      <div className="relative w-full aspect-[16/9] bg-gray-200">
        <Image
          src={heroImageUrl}
          alt={`${studioName} hero image`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
          onError={() => setImageError(true)}
        />
      </div>

      {/* Studio Info Card */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm bg-gray-100">
              {ownerAvatarUrl && !imageError ? (
                <Image
                  src={ownerAvatarUrl}
                  alt={ownerDisplayName}
                  width={64}
                  height={64}
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#d42027] text-white text-xl font-bold">
                  {ownerDisplayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Studio Name & Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-gray-900 font-bold text-xl leading-tight">
                {studioName}
              </h1>
              {isVerified && (
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 flex-shrink-0 ml-1"
                  title="Verified studio — approved by our team"
                >
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              )}
            </div>
            
            {/* Abbreviated Address */}
            {shouldShowAddress && abbreviatedAddress && (
              <div className="flex items-center space-x-1.5 mt-2">
                <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-600">{abbreviatedAddress}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
