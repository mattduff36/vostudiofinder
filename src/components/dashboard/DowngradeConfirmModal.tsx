'use client';

import { Modal } from '@/components/ui/Modal';
import { Check } from 'lucide-react';

interface DowngradeConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  action: 'cancel_auto_renew' | 'schedule_downgrade';
  expiryDate?: string | null;
  isLoading?: boolean;
}

const FEATURES_LOST = (
  <ul className="space-y-2 mb-6">
    <li className="flex items-center gap-2 text-gray-700">
      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
      Verified badge eligibility
    </li>
    <li className="flex items-center gap-2 text-gray-700">
      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
      Voiceover artist listing
    </li>
    <li className="flex items-center gap-2 text-gray-700">
      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
      Phone &amp; directions visibility
    </li>
    <li className="flex items-center gap-2 text-gray-700">
      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
      Custom SEO title
    </li>
    <li className="flex items-center gap-2 text-gray-700">
      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
      Extra images &amp; social links
    </li>
  </ul>
);

function formatExpiryDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'the end of your current period';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function DowngradeConfirmModal({
  open,
  onClose,
  onConfirm,
  action,
  expiryDate,
  isLoading = false,
}: DowngradeConfirmModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  const isCancelAutoRenew = action === 'cancel_auto_renew';
  const formattedExpiry = formatExpiryDate(expiryDate);

  return (
    <Modal isOpen={open} onClose={onClose} maxWidth="md">
      <div className="p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {isCancelAutoRenew ? 'Cancel auto-renewal?' : 'Downgrade to Basic?'}
        </h2>
        <p className="text-gray-600 mb-4">
          Premium is just £25 per year — less than £2.10 per month.
          Most studios recover this from a single booking.
        </p>

        {isCancelAutoRenew ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-900">
              Your subscription will be cancelled, but you&apos;ll keep all Premium features
              until <strong>{formattedExpiry}</strong>. After that, you can renew manually any
              time from your Settings page. No further charges will be made unless you renew.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-900">
                Your Premium membership will end on <strong>{formattedExpiry}</strong> and
                you&apos;ll be moved to the Basic plan. No partial refunds are given.
              </p>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              After {formattedExpiry}, you&apos;ll lose access to:
            </p>
            {FEATURES_LOST}
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-[#d42027] text-white font-semibold rounded-lg hover:bg-[#b01b21] transition-colors"
          >
            Stay Premium
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isLoading
              ? 'Processing…'
              : isCancelAutoRenew
                ? 'Cancel auto-renewal'
                : 'Downgrade to Basic'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
