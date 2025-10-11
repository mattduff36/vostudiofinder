'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { MapPin, Star, Users, Globe, Phone, Crown } from 'lucide-react';
import { cleanDescription } from '@/lib/utils/text';

interface Studio {
  id: string;
  name: string;
  description: string;
  studio_type: string;
  address: string;
  website_url?: string;
  phone?: string;
  is_premium: boolean;
  is_verified: boolean;
  owner: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
  };
  studio_services: Array<{ service: string }>;
  studio_images: Array<{ imageUrl: string; alt_text?: string }>;
  _count: { reviews: number };
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface StudiosListProps {
  studios: Studio[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

export function StudiosList({ studios, pagination, onPageChange }: StudiosListProps) {
  if (studios.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">No Studios Found</h3>
        <p className="text-text-secondary">
          Try adjusting your search criteria or browse all studios.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} studios
        </p>
      </div>

      {/* Studios Grid */}
      <div className="grid grid-cols-1 gap-6">
        {studios.map((studio) => (
          <div
            key={studio.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-6">
                {/* Studio Image */}
                <div className="flex-shrink-0 mb-4 lg:mb-0">
                  <div className="w-full lg:w-48 h-32 bg-gray-200 rounded-lg overflow-hidden relative">
                    {studio.studio_images?.[0]?.imageUrl ? (
                      <Image
                        src={studio.studio_images[0].imageUrl}
                        alt={studio.studio_images[0].alt_text || studio.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Users className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Studio Info */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-xl font-semibold text-text-primary truncate">
                          {studio.name}
                        </h3>
                        {studio.is_premium && (
                          <Crown className="w-5 h-5 text-yellow-500 flex-shrink-0" aria-label="Premium Studio" />
                        )}
                        {studio.is_verified && (
                          <div className="flex-shrink-0 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            ✓ Verified
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-text-secondary mb-2">
                        <span className="inline-block px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded">
                          {studio.studio_type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        {studio._count.reviews > 0 && (
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 mr-1" />
                            <span>{studio._count.reviews} reviews</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => window.location.href = `/${studio.owner?.username}`}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center text-text-secondary mb-3">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm truncate">{studio.address}</span>
                  </div>

                  {/* Description */}
                  <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                    {cleanDescription(studio.description)}
                  </p>

                  {/* Services */}
                  {studio.services && studio.services.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {studio.services.slice(0, 4).map((service, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {service.service.replace('_', ' ')}
                          </span>
                        ))}
                        {studio.services.length > 4 && (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            +{studio.services.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contact Info & Owner */}
                  <div className="flex items-center justify-between text-sm text-text-secondary">
                    <div className="flex items-center space-x-4">
                      {studio.website_url && (
                        <a
                          href={studio.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center hover:text-primary-600"
                        >
                          <Globe className="w-4 h-4 mr-1" />
                          Website
                        </a>
                      )}
                      {studio.phone && (
                        <a
                          href={`tel:${studio.phone}`}
                          className="flex items-center hover:text-primary-600"
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </a>
                      )}
                    </div>

                    <div className="flex items-center">
                      <span className="text-xs mr-2">Owner:</span>
                      <div className="flex items-center">
                        {studio.owner.avatar_url ? (
                          <div className="relative w-6 h-6 mr-2">
                            <Image
                              src={studio.owner.avatar_url}
                              alt={studio.owner.display_name}
                              fill
                              className="rounded-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-gray-300 rounded-full mr-2 flex items-center justify-center">
                            <Users className="w-3 h-3 text-gray-600" />
                          </div>
                        )}
                        <span className="text-sm font-medium">{studio.owner.display_name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </Button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNumber;
              if (pagination.totalPages <= 5) {
                pageNumber = i + 1;
              } else if (pagination.page <= 3) {
                pageNumber = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNumber = pagination.totalPages - 4 + i;
              } else {
                pageNumber = pagination.page - 2 + i;
              }

              return (
                <Button
                  key={pageNumber}
                  variant={pageNumber === pagination.page ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(pageNumber)}
                  className="w-8 h-8 p-0"
                >
                  {pageNumber}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
