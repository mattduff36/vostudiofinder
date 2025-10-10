'use client';

import { Star, Users } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  content: string;
  isAnonymous: boolean;
  created_at: Date;
  reviewer: {
    display_name: string;
    avatar_url?: string;
  };
}

interface ReviewsListProps {
  reviews: Review[];
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="divide-y divide-gray-200">
      {reviews.map((review) => (
        <div key={review.id} className="p-6">
          <div className="flex items-start space-x-4">
            {/* Reviewer Avatar */}
            <div className="flex-shrink-0">
              {!review.isAnonymous && review.reviewer.avatar_url ? (
                <img
                  src={review.reviewer.avatar_url}
                  alt={review.reviewer.display_name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
              )}
            </div>

            {/* Review Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {review.isAnonymous ? 'Anonymous User' : review.reviewer.display_name}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= review.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-text-secondary">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Text */}
              <div className="text-sm text-text-secondary">
                {review.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-2 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
