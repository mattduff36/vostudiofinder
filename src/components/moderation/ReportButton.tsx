'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

interface ReportButtonProps {
  contentType: 'review' | 'message' | 'studio' | 'user';
  contentId: string;
  reportedUserId?: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or unwanted content' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech or discrimination' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'fake_info', label: 'False or misleading information' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'other', label: 'Other reason' },
];

export function ReportButton({ contentType, contentId, reportedUserId }: ReportButtonProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReported, setIsReported] = useState(false);

  const handleSubmitReport = async () => {
    if (!selectedReason || !session?.user) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/moderation/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType,
          contentId,
          reportedUserId,
          reason: selectedReason,
          customReason: selectedReason === 'other' ? customReason : undefined,
        }),
      });

      if (response.ok) {
        setIsReported(true);
        setIsOpen(false);
        setSelectedReason('');
        setCustomReason('');
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session?.user || isReported) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-500 hover:text-red-600 text-sm flex items-center space-x-1"
        title="Report content"
      >
        <span>🚩</span>
        <span>Report</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Report Content</h3>
            <p className="text-sm text-gray-600">
              Help us keep the community safe by reporting inappropriate content.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for reporting:
              </label>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <label key={reason.value} className="flex items-center">
                    <input
                      type="radio"
                      name="reason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {reason.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {selectedReason === 'other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Please specify:
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm"
                  maxLength={200}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {customReason.length}/200 characters
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-2 mt-4">
            <Button
              onClick={handleSubmitReport}
              disabled={
                isSubmitting || 
                !selectedReason || 
                (selectedReason === 'other' && !customReason.trim())
              }
              size="sm"
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
            <Button
              onClick={() => {
                setIsOpen(false);
                setSelectedReason('');
                setCustomReason('');
              }}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Reports are reviewed by our moderation team. False reports may result in account restrictions.
          </p>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
