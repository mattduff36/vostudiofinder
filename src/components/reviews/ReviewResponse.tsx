'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

interface ReviewResponseProps {
  reviewId: string;
  studioOwnerId: string;
  existingResponse?: {
    id: string;
    content: string;
    createdAt: string;
  };
  onResponseAdded?: () => void;
}

export function ReviewResponse({
  reviewId,
  studioOwnerId,
  existingResponse,
  onResponseAdded,
}: ReviewResponseProps) {
  const { data: session } = useSession();
  const [isResponding, setIsResponding] = useState(false);
  const [responseContent, setResponseContent] = useState(existingResponse?.content || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const canRespond = session?.user?.id === studioOwnerId;

  const handleSubmitResponse = async () => {
    if (!responseContent.trim() || !canRespond) return;

    setIsSubmitting(true);
    try {
      const url = existingResponse 
        ? `/api/reviews/${reviewId}/response/${existingResponse.id}`
        : `/api/reviews/${reviewId}/response`;
      
      const method = existingResponse ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: responseContent,
        }),
      });

      if (response.ok) {
        setIsResponding(false);
        setIsEditing(false);
        onResponseAdded?.();
      } else {
        throw new Error('Failed to submit response');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Failed to submit response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteResponse = async () => {
    if (!existingResponse || !canRespond) return;

    if (!confirm('Are you sure you want to delete this response?')) return;

    try {
      const response = await fetch(`/api/reviews/${reviewId}/response/${existingResponse.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onResponseAdded?.();
      } else {
        throw new Error('Failed to delete response');
      }
    } catch (error) {
      console.error('Error deleting response:', error);
      alert('Failed to delete response. Please try again.');
    }
  };

  if (!canRespond) {
    return null;
  }

  return (
    <div className="mt-4 pl-4 border-l-2 border-blue-200">
      {existingResponse && !isEditing ? (
        // Display existing response
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-blue-900">Studio Owner Response</span>
              <span className="text-xs text-blue-600">
                {new Date(existingResponse.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setIsEditing(true);
                  setResponseContent(existingResponse.content);
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteResponse}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </div>
          </div>
          <p className="text-sm text-blue-800">{existingResponse.content}</p>
        </div>
      ) : (isResponding || isEditing) ? (
        // Response form
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {existingResponse ? 'Edit Response' : 'Respond to Review'}
            </label>
            <textarea
              value={responseContent}
              onChange={(e) => setResponseContent(e.target.value)}
              placeholder="Write a professional response to this review..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1">
              {responseContent.length}/500 characters
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={handleSubmitResponse}
              disabled={isSubmitting || !responseContent.trim()}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Submitting...' : existingResponse ? 'Update Response' : 'Post Response'}
            </Button>
            <Button
              onClick={() => {
                setIsResponding(false);
                setIsEditing(false);
                setResponseContent(existingResponse?.content || '');
              }}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        // Response button
        <Button
          onClick={() => setIsResponding(true)}
          variant="outline"
          size="sm"
          className="text-blue-600 border-blue-300 hover:bg-blue-50"
        >
          💬 Respond to Review
        </Button>
      )}
    </div>
  );
}
