'use client';

import { MapPin, Star, Users } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';

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
}

interface FeaturedStudiosProps {
  studios: Studio[];
}

export function FeaturedStudios({ studios }: FeaturedStudiosProps) {
  if (studios.length === 0) {
    return (
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
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
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
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
              className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg hover:border-primary-200 transition-all duration-300"
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

              <div className="p-6">
                {/* Studio Name & Type */}
                <div className="mb-3">
                  <h3 className="text-xl font-semibold text-text-primary mb-1">
                    {studio.name}
                  </h3>
                  <span className="inline-block px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded">
                    {studio.studioType.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center text-text-secondary mb-3">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="text-sm">{studio.address}</span>
                </div>

                {/* Description */}
                <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                  {studio.description}
                </p>

                {/* Services */}
                {studio.services && studio.services.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {studio.services.slice(0, 3).map((service: any, index: number) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {service.service.replace('_', ' ')}
                        </span>
                      ))}
                      {studio.services.length > 3 && (
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          +{studio.services.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats & CTA */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-text-secondary">
                    {studio._count?.reviews && studio._count.reviews > 0 && (
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span>{studio._count.reviews} reviews</span>
                      </div>
                    )}
                    {studio.isVerified && (
                      <span className="text-green-600 font-medium">✓ Verified</span>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => window.location.href = `/studio/${studio.id}`}
                  >
                    View Details
                  </Button>
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
