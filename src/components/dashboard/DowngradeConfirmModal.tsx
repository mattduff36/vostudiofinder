'use client';

import { Modal } from '@/components/ui/Modal';
import { Check } from 'lucide-react';

interface DowngradeConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  action: 'disable_auto_renew' | 'downgrade';
  isLoading?: boolean;
}

export function DowngradeConfirmModal({
  open,
  onClose,
  onConfirm,
  isLoading = false,
}: DowngradeConfirmModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} maxWidth="md">
      <div className="p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Before you go…</h2>
        <p className="text-gray-600 mb-4">
          Premium is just £25 per year — less than £2.10 per month.
        </p>
        <p className="text-gray-600 mb-4">
          Most studios recover this from a single booking.
        </p>
        <p className="text-sm font-medium text-gray-700 mb-2">Are you sure you want to lose:</p>
        <ul className="space-y-2 mb-6">
          <li className="flex items-center gap-2 text-gray-700">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            Verified badge
          </li>
          <li className="flex items-center gap-2 text-gray-700">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            Voiceover listing
          </li>
          <li className="flex items-center gap-2 text-gray-700">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            Phone & directions visibility
          </li>
          <li className="flex items-center gap-2 text-gray-700">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            Custom SEO title
          </li>
        </ul>
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
            {isLoading ? 'Processing…' : 'Continue to Basic'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
