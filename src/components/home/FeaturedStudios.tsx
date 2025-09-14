'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Star, Users } from 'lucide-react';
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
  studioType: string;
  location: string;
  address: string;
  averageRating?: number;
  reviewCount?: number;
  services?: Array<{ service: string }>;
  images?: Array<{
    imageUrl: string;
    altText?: string;
  }>;
  _count?: {
    reviews: number;
  };
  isVerified?: boolean;
  owner?: {
    username: string;
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

  if (studios.length === 0) {
    return (
      <div className="relative py-16 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/bakground-images/21920-2.jpg"
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
    <div ref={sectionRef} className="relative py-16 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/bakground-images/21920-2.jpg"
          alt="Studio background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>
      <div className="relative z-10 pt-0 pb-12 sm:py-16 w-full">
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
          {studios.map((studio) => (
              <div
                key={studio.id}
                onClick={() => window.location.href = `/${studio.owner?.username}`}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg hover:border-primary-200 hover:scale-[1.02] transition-all duration-300 flex flex-col h-full cursor-pointer group"
              >
                {/* Studio Image */}
                <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden relative">
                  {studio.images?.[0]?.imageUrl ? (
                    <Image
                      src={studio.images[0].imageUrl}
                      alt={studio.images[0].altText || studio.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Users className="w-12 h-12" />
                    </div>
                  )}
                  
                  {/* Studio Type Badge - moved to bottom right of image */}
                  <div className="absolute bottom-2 right-2">
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded shadow-lg" style={{ backgroundColor: '#f3f4f6', color: '#000000', border: 'none' }}>
                      {studio.studioType.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-6 flex flex-col flex-grow max-h-[340px]">
                  {/* Studio Name - badge moved to image */}
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold line-clamp-1 mb-2 sm:mb-3" style={{ color: colors.textPrimary, margin: '0 0 8px 0' }}>
                    {studio.name}
                  </h3>

                  {/* Location and Description - combined, limited to 4 lines maximum */}
                  <div className="mb-4">
                    <div className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                      {/* Location */}
                      {studio.address && studio.address.trim() && (
                        <div className="flex items-start mb-2">
                          <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{studio.address}</span>
                        </div>
                      )}
                      
                      {/* Description with line limit */}
                      <div 
                        className="overflow-hidden"
                        style={{ 
                          maxHeight: studio.address && studio.address.trim() ? '4.5rem' : '6rem', // 3 or 4 lines at 1.5rem line-height
                          lineHeight: '1.5rem'
                        }}
                        title={cleanDescription(studio.description)}
                      >
                        {(() => {
                          const description = cleanDescription(studio.description);
                          // Calculate available lines (4 total, minus 1 if location exists)
                          const availableLines = studio.address && studio.address.trim() ? 3 : 4;
                          // More conservative character limit per line (roughly 45 chars per line)
                          const seeMoreText = '..... See More';
                          const maxChars = (availableLines * 45) - seeMoreText.length;
                          
                          if (description.length > maxChars) {
                            const truncated = description.substring(0, maxChars).trim();
                            // Find the last complete word to avoid cutting mid-word
                            const lastSpace = truncated.lastIndexOf(' ');
                            const finalText = lastSpace > maxChars - 15 ? truncated.substring(0, lastSpace) : truncated;
                            return finalText + seeMoreText;
                          }
                          return description;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Services */}
                  {studio.services && studio.services.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {studio.services.slice(0, 2).map((service: any, index: number) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-1 bg-gray-100 text-xs rounded"
                            style={{ color: colors.textSecondary }}
                          >
                            {service.service.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {studio.services.length > 2 && (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-xs rounded" style={{ color: colors.textSecondary }}>
                            +{studio.services.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats & CTA */}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center space-x-3 text-sm" style={{ color: colors.textSecondary }}>
                      {studio._count?.reviews && studio._count.reviews > 0 && (
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 mr-1" />
                          <span>{studio._count.reviews}</span>
                        </div>
                      )}
                      {studio.isVerified && (
                        <span className="text-green-600 font-medium text-xs">✓ Verified</span>
                      )}
                    </div>
                    
                    <div className="px-3 py-1.5 text-white text-sm font-medium rounded transition-colors pointer-events-none" style={{ backgroundColor: colors.primary }}>
                      View Details
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
