'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { MapPin, Star, Users } from 'lucide-react';
import { cleanDescription } from '@/lib/utils/text';
import { theme } from '@/lib/theme';

const colors = theme.colors;

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

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  hasMore?: boolean;
}

interface StudiosListProps {
  studios: Studio[];
  pagination: Pagination;
  onLoadMore: () => void;
  loadingMore: boolean;
}

export function StudiosList({ studios, pagination, onLoadMore, loadingMore }: StudiosListProps) {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 justify-items-center">
        {studios.map((studio) => (
          <div
            key={studio.id}
            id={`studio-${studio.id}`}
            onClick={() => {
              if (studio.owner?.username) {
                window.open(`/${studio.owner.username}`, '_blank', 'noopener,noreferrer');
              }
            }}
            className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg hover:border-primary-200 hover:scale-[1.02] transition-all duration-300 flex flex-col ${studio.owner?.username ? 'cursor-pointer' : 'cursor-default'} group w-full`}
            style={{
              minHeight: '360px'
            }}
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
                    src="/images/voiceover-studio-finder-logo-black-BIG.png"
                    alt="VoiceoverStudioFinder Logo"
                    width={120}
                    height={40}
                    className="opacity-30"
                  />
                </div>
              )}
              
              {/* Studio Types Badges */}
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
              {/* Studio Name with Avatar and Verified Badge */}
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
                
                {/* Studio Name - H3 for SEO */}
                <h3 
                  className="flex-1 text-sm font-bold"
                  style={{ 
                    color: colors.textPrimary,
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
                  {/* Location - Show city if available, otherwise fall back to address */}
                  {(studio.city || studio.address) && (
                    <div className="flex items-start mb-1.5">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{studio.city || studio.address}</span>
                    </div>
                  )}
                  
                    {/* Description with line limit - only show if content exists */}
                    {(() => {
                      const description = cleanDescription(studio.description);
                      if (!description) return null;

                      return (
                        <div
                          className="line-clamp-5 text-sm leading-snug"
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
              <div className="flex items-center justify-between mt-auto pt-1">
                <div className="flex items-center space-x-3 text-sm" style={{ color: colors.textSecondary }}>
                  {(studio._count?.reviews ?? 0) > 0 && (
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      <span>{studio._count.reviews}</span>
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
      </div>

      {/* Show More Button */}
      {pagination.hasMore && (
        <div className="flex items-center justify-center mt-8">
          <Button
            variant="primary"
            size="lg"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-8 py-3 min-w-[200px]"
            style={{ backgroundColor: colors.primary, color: 'white' }}
          >
            {loadingMore ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2 inline-block"></div>
                Loading...
              </>
            ) : (
              'Load More Studios'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
