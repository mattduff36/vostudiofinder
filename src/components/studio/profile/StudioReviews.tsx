'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { ReviewsList } from '@/components/reviews/ReviewsList';
import { Star, Users, Plus } from 'lucide-react';

interface StudioReviewsProps {
  studio: {
    id: string;
    name: string;
    reviews: Array<{
      id: string;
      rating: number;
      content: string;
      isAnonymous: boolean;
      createdAt: Date;
      reviewer: {
        displayName: string;
        avatarUrl?: string;
      };
    }>;
    _count: { reviews: number };
    averageRating: number;
  };
  canReview: boolean;
}

export function StudioReviews({ studio, canReview }: StudioReviewsProps) {
  const { data: session } = useSession();
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
    const count = studio.reviews.filter(review => review.rating === rating).length;
    const percentage = studio.reviews.length > 0 ? (count / studio.reviews.length) * 100 : 0;
    return { rating, count, percentage };
  });

  return (
    <div className="space-y-8">
      {/* Reviews Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Reviews & Ratings</h2>
            <p className="text-text-secondary">
              What voice professionals are saying about {studio.name}
            </p>
          </div>
          
          {canReview && !showReviewForm && (
            <Button
              onClick={() => setShowReviewForm(true)}
              className="mt-4 lg:mt-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Write a Review
            </Button>
          )}
        </div>

        {studio.reviews.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-5xl font-bold text-text-primary mb-2">
                {studio.averageRating.toFixed(1)}
              </div>
              <div className="flex items-center justify-center mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${
                      star <= studio.averageRating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-text-secondary">
                Based on {studio._count.reviews} reviews
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-text-primary w-8">
                    {rating}★
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-text-secondary w-8">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No Reviews Yet</h3>
            <p className="text-text-secondary mb-4">
              Be the first to share your experience with {studio.name}
            </p>
            {canReview && (
              <Button onClick={() => setShowReviewForm(true)}>
                Write the First Review
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Review Form */}
      {showReviewForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <ReviewForm
            studioId={studio.id}
            studioName={studio.name}
            onSubmit={() => {
              setShowReviewForm(false);
              // Refresh reviews - in a real app, you'd refetch data
              window.location.reload();
            }}
            onCancel={() => setShowReviewForm(false)}
          />
        </div>
      )}

      {/* Reviews List */}
      {studio.reviews.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-text-primary">
              Recent Reviews ({studio.reviews.length})
            </h3>
          </div>
          <ReviewsList reviews={studio.reviews} />
        </div>
      )}

      {/* Authentication Prompt */}
      {!session && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Want to leave a review?
          </h3>
          <p className="text-blue-700 mb-4">
            Sign in to share your experience with {studio.name} and help other voice professionals.
          </p>
          <div className="space-x-4">
            <Button
              onClick={() => window.location.href = '/auth/signin'}
              variant="outline"
            >
              Sign In
            </Button>
            <Button
              onClick={() => window.location.href = '/auth/signup'}
            >
              Sign Up
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
