'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Star } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { cleanDescription } from '@/lib/utils/text';
import { colors } from './HomePage';

/*
SAVED CODE - Fade-out gradient feature for future use:
<div className="relative flex-grow mb-4 overflow-hidden">
  <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
    {cleanDescription(studio.description)}
  </p>
  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
</div>
*/

interface Studio {
  id: string;
  name: string;
  description: string;
  studio_studio_types: Array<{ studio_type: string }>;
  location: string;
  city?: string;
  address: string;
  averageRating?: number;
  reviewCount?: number;
  studio_services?: Array<{ service: string }>;
  studio_images?: Array<{
    image_url: string;
    alt_text?: string;
  }>;
  _count?: {
    reviews: number;
  };
  is_verified?: boolean;
  owner?: {
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface FeaturedStudiosProps {
  studios: Studio[];
}

export function FeaturedStudios({ studios }: FeaturedStudiosProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Calculate how many placeholder cards to show (always show 6 total cards)
  const maxCards = 6;
  const realStudiosCount = Math.min(studios.length, 5); // Show max 5 real studios
  const placeholderCount = maxCards - realStudiosCount;
  
  // Take only the first 5 studios
  const displayStudios = studios.slice(0, 5);
  
  // Create placeholder card data
  const placeholders = Array(placeholderCount).fill(null);

  if (studios.length === 0) {
    return (
      <div className="relative py-16 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/background-images/21920-2.jpg"
            alt="Studio background texture"
            fill
            className="object-cover opacity-10"
            priority={false}
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: colors.textPrimary }}>
            Featured Studios
          </h2>
          <p className="mb-8" style={{ color: colors.textSecondary }}>
            No featured studios available yet. Be the first to add your studio!
          </p>
          <Button onClick={() => window.location.href = '/auth/signup'}>
            Add Your Studio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="relative py-8 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-2.jpg"
          alt="Studio background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>
      <div className="relative z-10 pt-0 pb-6 sm:py-8 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className={`text-center mb-8 sm:mb-12 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4" style={{ color: colors.textPrimary }}>
            Featured Studios
          </h2>
          <p className={`text-base sm:text-lg md:text-xl text-center transition-all duration-1000 ease-out px-4 ${
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.2s', color: colors.textSecondary, maxWidth: '768px', margin: '0 auto' }}>
            These are a handful of some of our favourite studios listed.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Real Studio Cards */}
          {displayStudios.map((studio) => (
              <div
                key={studio.id}
                onClick={() => window.location.href = `/${studio.owner?.username}`}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg hover:border-primary-200 hover:scale-[1.02] transition-all duration-300 flex flex-col h-full cursor-pointer group"
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
                  
                  {/* Studio Types Badges - show up to 2 types plus count */}
                  <div className="absolute bottom-2 right-2 flex flex-wrap gap-1">
                    {studio.studio_studio_types.slice(0, 2).map((type, index) => (
                      <span 
                        key={index}
                        className="inline-block px-2 py-1 text-xs font-medium rounded shadow-lg" 
                        style={{ backgroundColor: '#f3f4f6', color: '#000000', border: 'none' }}
                      >
                        {type.studio_type.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                    ))}
                    {studio.studio_studio_types.length > 2 && (
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
                  {/* Studio Name with Avatar and Verified Badge - matching StudiosList styling */}
                  <div className="flex items-center gap-2 mb-2">
                    {/* Avatar - Small square image on the left */}
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
                      className="flex-1"
                      style={{ 
                        color: colors.textPrimary,
                        fontSize: '14px',
                        fontWeight: 700,
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
                      {/* Location - Show city if available, otherwise fall back to location */}
                      {(studio.city || studio.location) && (
                        <div className="flex items-start mb-1.5">
                          <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{studio.city || studio.location}</span>
                        </div>
                      )}
                      
                      {/* Description with line limit - only show if content exists */}
                      {(() => {
                        const description = cleanDescription(studio.description);
                        if (!description) return null;
                        
                        return (
                          <div 
                            className="line-clamp-3 text-sm leading-snug"
                            style={{ color: 'inherit' }}
                            title={description}
                          >
                            {description}
                          </div>
                        );
                      })()}
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
                  <div className="flex items-center justify-between mt-auto pt-2">
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
          ))}
          
          {/* Placeholder Cards */}
          {placeholders.map((_, index) => (
            <div
              key={`placeholder-${index}`}
              onClick={() => window.location.href = '/auth/signup'}
              className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-lg shadow-sm hover:shadow-lg hover:border-primary-300 hover:scale-[1.02] transition-all duration-300 flex flex-col h-full cursor-pointer group"
            >
              {/* Placeholder Image Area */}
              <div className="aspect-[25/12] bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg overflow-hidden relative flex items-center justify-center">
                <div className="text-center px-4">
                  <svg 
                    className="w-16 h-16 mx-auto mb-2 text-gray-400 group-hover:text-primary transition-colors" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
                    />
                  </svg>
                </div>
              </div>

              <div className="p-3 sm:p-4 flex flex-col flex-grow justify-center text-center">
                {/* Placeholder Title - styled like H3 but using p tag for SEO */}
                <p 
                  className="text-lg font-bold mb-3"
                  style={{ color: colors.textPrimary }}
                >
                  Add Your Studio Here
                </p>

                {/* Placeholder Description */}
                <p className="text-sm mb-4 leading-relaxed" style={{ color: colors.textSecondary }}>
                  Get featured on the homepage from day one. Reach thousands of voiceovers searching for recording spaces.
                </p>

                {/* CTA Button */}
                <div className="mt-auto">
                  <div 
                    className="px-4 py-2 text-white text-sm font-medium rounded transition-all group-hover:shadow-md" 
                    style={{ backgroundColor: colors.primary }}
                  >
                    List Your Studio
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Studios Button */}
        <div className="text-center mt-12">
          <button 
            onClick={() => window.location.href = '/studios'}
            className="px-8 py-3 font-medium rounded-lg transition-all duration-300 hover:shadow-lg" 
            style={{ border: `1px solid ${colors.primary}`, color: colors.primary, backgroundColor: 'transparent' }}
          >
            View All Studios
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
