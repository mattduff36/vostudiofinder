/**
 * ReviewsCompact - Mobile-Optimized Reviews Display
 * 
 * Shows top 3 reviews initially
 * Expandable to show all reviews
 * Compact card layout optimized for mobile
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 3.
 */
'use client';

import { useState } from 'react';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import { isMobileFeatureEnabled } from '@/lib/feature-flags';

interface Review {
  id: string;
  rating: number;
  content: string;
  created_at: Date;
  reviewer: {
    display_name: string;
  };
}

interface ReviewsCompactProps {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
}

export function ReviewsCompact({
  reviews,
  averageRating,
  totalReviews,
}: ReviewsCompactProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Phase 3 feature gate
  if (!isMobileFeatureEnabled(3)) {
    return null;
  }

  if (reviews.length === 0) {
    return (
      <div className="md:hidden bg-white p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Reviews</h3>
        <p className="text-sm text-gray-500">No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  const visibleReviews = isExpanded ? reviews : reviews.slice(0, 3);
  const hasMore = reviews.length > 3;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-0.5" aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  };

  return (
    <div className="md:hidden bg-white border-b border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Reviews</h3>
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" aria-hidden="true" />
            <span className="text-lg font-bold text-gray-900">
              {averageRating.toFixed(1)}
            </span>
            <span className="text-sm text-gray-500">
              ({totalReviews})
            </span>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="divide-y divide-gray-100">
        {visibleReviews.map((review) => (
          <div key={review.id} className="p-4">
            {/* Reviewer Info */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {review.reviewer.display_name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(review.created_at)}
                </p>
              </div>
              <div className="ml-2 flex-shrink-0">
                {renderStars(review.rating)}
              </div>
            </div>

            {/* Review Content */}
            <p className="text-sm text-gray-700 leading-relaxed">
              {review.content}
            </p>
          </div>
        ))}
      </div>

      {/* Show More / Show Less Button */}
      {hasMore && (
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center w-full py-2 text-sm font-medium text-[#d42027] hover:bg-gray-50 rounded-lg transition-colors"
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <>
                <span>Show less</span>
                <ChevronUp className="w-4 h-4 ml-1" aria-hidden="true" />
              </>
            ) : (
              <>
                <span>Show all reviews ({reviews.length})</span>
                <ChevronDown className="w-4 h-4 ml-1" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
