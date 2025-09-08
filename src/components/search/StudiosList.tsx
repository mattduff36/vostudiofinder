'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { MapPin, Star, Users, Globe, Phone, Crown, Clock } from 'lucide-react';
import { cleanDescription } from '@/lib/utils/text';
import { colors } from '@/components/home/HomePage';

interface Studio {
  id: string;
  name: string;
  description: string;
  studioType: string;
  address: string;
  websiteUrl?: string;
  phone?: string;
  isPremium: boolean;
  isVerified: boolean;
  owner: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  services: Array<{ service: string }>;
  images: Array<{ imageUrl: string; altText?: string }>;
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
        <h3 className="text-lg font-medium mb-2" style={{ color: colors.textPrimary }}>No Studios Found</h3>
        <p style={{ color: colors.textSecondary }}>
          Try adjusting your search criteria or browse all studios.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Studios Grid - Using FeaturedStudios card design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              
              {/* Studio Type Badge */}
              <div className="absolute bottom-2 right-2">
                <span className="inline-block px-2 py-1 text-xs font-medium rounded shadow-lg" style={{ backgroundColor: '#f3f4f6', color: '#000000', border: 'none' }}>
                  {studio.studioType.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
              </div>

              {/* Premium Badge */}
              {studio.isPremium && (
                <div className="absolute top-2 left-2">
                  <div className="flex items-center bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 flex flex-col flex-grow max-h-[340px]">
              {/* Studio Name */}
              <h3 className="text-xl font-semibold line-clamp-1 mb-3" style={{ color: colors.textPrimary, margin: '0 0 12px 0' }}>
                {studio.name}
              </h3>

              {/* Location and Description */}
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
                      maxHeight: studio.address && studio.address.trim() ? '4.5rem' : '6rem',
                      lineHeight: '1.5rem'
                    }}
                    title={cleanDescription(studio.description)}
                  >
                    {(() => {
                      const description = cleanDescription(studio.description);
                      const availableLines = studio.address && studio.address.trim() ? 3 : 4;
                      const seeMoreText = '..... See More';
                      const maxChars = (availableLines * 45) - seeMoreText.length;
                      
                      if (description.length > maxChars) {
                        const truncated = description.substring(0, maxChars).trim();
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
          
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <Button
                key={pageNum}
                variant={pageNum === pagination.page ? 'primary' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                style={pageNum === pagination.page ? { backgroundColor: colors.primary, color: 'white' } : {}}
              >
                {pageNum}
              </Button>
            );
          })}
          
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
