'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Star, Users } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { cleanDescription } from '@/lib/utils/text';
import { colors } from './HomePage';

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
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className={`text-center mb-12 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <h2 className="text-3xl font-bold mb-4" style={{ color: colors.textPrimary }}>
            Featured Recording Studios
          </h2>
          <p className={`text-xl max-w-3xl mx-auto transition-all duration-1000 ease-out ${
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.2s', color: colors.textSecondary }}>
            Discover professional recording studios with verified locations, 
            top-rated equipment, and experienced engineers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                    <span className="inline-block px-2 py-1 text-white text-xs font-medium rounded shadow-lg" style={{ backgroundColor: 'transparent', border: '1px solid #ffffff' }}>
                      {studio.studioType.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-grow max-h-[500px]">
                  {/* Studio Name - badge moved to image */}
                  <div className="mb-3">
                    <h3 className="text-xl font-semibold line-clamp-1" style={{ color: colors.textPrimary }}>
                      {studio.name}
                    </h3>
                  </div>

                  {/* Location - only show if address exists */}
                  {studio.address && studio.address.trim() && (
                    <div className="flex items-start mb-3" style={{ color: colors.textSecondary }}>
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm line-clamp-2">{studio.address}</span>
                    </div>
                  )}

                  {/* Description - dynamic height within max constraint */}
                  <div className="relative flex-grow mb-4 overflow-hidden">
                    <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                      {cleanDescription(studio.description)}
                    </p>
                    {/* Improved vertical fade-out - starts at 50% and gradually fades to 100% at bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
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
  );
}
