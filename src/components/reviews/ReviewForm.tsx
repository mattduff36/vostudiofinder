'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Star } from 'lucide-react';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  content: z.string().min(10, 'Review must be at least 10 characters long').max(2000),
  isAnonymous: z.boolean(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  studio_id: string;
  studioName: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ReviewForm({ studioId, studioName, onSubmit, onCancel }: ReviewFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      content: '',
      isAnonymous: false,
    },
  });

  const rating = watch('rating');

  const handleRatingClick = (selectedRating: number) => {
    setValue('rating', selectedRating);
  };

  const submitReview = async (data: ReviewFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studioId,
          ...data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit review');
      }

      onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-text-primary mb-4">
        Write a Review for {studioName}
      </h3>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(submitReview)} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Overall Rating *
          </label>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingClick(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(null)}
                className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-3 text-sm text-text-secondary">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </span>
            )}
          </div>
          {errors.rating && (
            <p className="mt-1 text-sm text-red-600">{errors.rating.message}</p>
          )}
        </div>

        {/* Review Content */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Your Review *
          </label>
          <textarea
            rows={5}
            placeholder="Share your experience with this studio. What did you like? How was the equipment? Would you recommend it to other voice professionals?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            {...register('content')}
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
          )}
          <p className="mt-2 text-xs text-text-secondary">
            Be specific and honest. Your review helps other voice professionals make informed decisions.
          </p>
        </div>

        {/* Anonymous Option */}
        <div className="flex items-center">
          <input
            id="anonymous"
            type="checkbox"
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            {...register('isAnonymous')}
          />
          <label htmlFor="anonymous" className="ml-2 text-sm text-text-primary">
            Post this review anonymously
          </label>
        </div>

        {/* Guidelines */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-text-primary mb-2">Review Guidelines</h4>
          <ul className="text-xs text-text-secondary space-y-1">
            <li>• Be honest and constructive in your feedback</li>
            <li>• Focus on your experience with the studio and equipment</li>
            <li>• Avoid personal attacks or inappropriate language</li>
            <li>• Include specific details that would help other users</li>
            <li>• Reviews are moderated and may take time to appear</li>
          </ul>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </form>
    </div>
  );
}

