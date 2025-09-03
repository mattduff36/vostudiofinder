'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface StudioVerificationProps {
  studioId: string;
  studioName: string;
  currentStatus: 'pending' | 'verified' | 'rejected';
  onStatusChange: (studioId: string, status: 'verified' | 'rejected') => void;
}

export function StudioVerification({
  studioId,
  studioName,
  currentStatus,
  onStatusChange,
}: StudioVerificationProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    setIsLoading(true);
    try {
      await onStatusChange(studioId, 'verified');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await onStatusChange(studioId, 'rejected');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-semibold text-lg mb-2">{studioName}</h3>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">Status:</span>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            currentStatus === 'verified'
              ? 'bg-green-100 text-green-800'
              : currentStatus === 'rejected'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {currentStatus}
        </span>
      </div>

      {currentStatus === 'pending' && (
        <div className="flex gap-2">
          <Button
            onClick={handleVerify}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Processing...' : 'Verify Studio'}
          </Button>
          <Button
            onClick={handleReject}
            disabled={isLoading}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            {isLoading ? 'Processing...' : 'Reject'}
          </Button>
        </div>
      )}
    </div>
  );
}
