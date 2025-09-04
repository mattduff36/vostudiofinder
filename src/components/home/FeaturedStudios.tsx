'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Star, Users } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { cleanDescription } from '@/lib/utils/text';

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
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Featured Studios
          </h2>
          <p className="text-text-secondary mb-8">
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
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Featured Recording Studios
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
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
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  {/* Studio Name & Type */}
                  <div className="mb-3">
                    <h3 className="text-xl font-semibold text-text-primary mb-2 line-clamp-1">
                      {studio.name}
                    </h3>
                    <span className="inline-block px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded">
                      {studio.studioType.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-start text-text-secondary mb-3">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm line-clamp-2">{studio.address}</span>
                  </div>

                  {/* Description */}
                  <div className="relative mb-4 flex-grow">
                    <p className="text-text-secondary text-sm line-clamp-3">
                      {cleanDescription(studio.description)}
                    </p>
                    {/* Vertical fade-out gradient overlay - subtle fade */}
                    <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>
                  </div>

                  {/* Services */}
                  {studio.services && studio.services.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {studio.services.slice(0, 2).map((service: any, index: number) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {service.service.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {studio.services.length > 2 && (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            +{studio.services.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats & CTA */}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center space-x-3 text-sm text-text-secondary">
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
                    
                    <div className="px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded group-hover:bg-primary-700 transition-colors pointer-events-none">
                      View Details
                    </div>
                  </div>
                </div>
              </div>
          ))}
        </div>

        {/* View All Studios Button */}
        <div className="text-center mt-12">
          <Button
            onClick={() => window.location.href = '/studios'}
            variant="outline"
            className="px-8"
          >
            View All Studios
          </Button>
        </div>
      </div>
    </div>
  );
}
