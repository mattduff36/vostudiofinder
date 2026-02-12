'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { CompactCheckoutForm } from '@/components/billing/CompactCheckoutForm';

interface SwitchToAutoRenewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The user's current membership expiry date (ISO string) for display */
  expiryDate?: string | null;
}

export function SwitchToAutoRenewModal({ isOpen, onClose, expiryDate }: SwitchToAutoRenewModalProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  const fetchClientSecret = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch('/api/membership/switch-to-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();

      if (!data.clientSecret) {
        throw new Error('No client secret returned from API');
      }

      return data.clientSecret;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment setup failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  if (!isOpen) return null;

  const formattedExpiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-200 pr-12">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-5 h-5 text-[#d42027]" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Enable Auto-Renewal
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            Set up automatic renewal so your Premium membership never lapses
          </p>
        </div>

        {/* Explanation */}
        <div className="px-5 sm:px-6 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800 font-medium mb-1">How this works</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• You&apos;ll enter your card details to set up a subscription</li>
              <li>
                • <strong>You won&apos;t be charged now</strong> — your current membership
                {formattedExpiry ? ` runs until ${formattedExpiry}` : ' continues as normal'}
              </li>
              <li>• When your current period ends, your subscription renews automatically at £25/year</li>
              <li>• You can cancel auto-renewal at any time from Settings</li>
            </ul>
          </div>

          {/* Price summary */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 mb-4">
            <span className="text-sm text-gray-700">Auto-renew annually</span>
            <span className="text-lg font-extrabold text-[#d42027]">
              £25<span className="text-xs font-semibold">/yr</span>
            </span>
          </div>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs sm:text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="stripe-payment-element">
            <CompactCheckoutForm
              fetchClientSecret={fetchClientSecret}
              amount="£25"
              buttonText="Set up auto-renewal"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 text-center rounded-b-2xl">
          <p className="text-xs text-gray-500">
            Secure payment powered by Stripe. No charge until your current period ends.
          </p>
        </div>
      </div>
    </div>
  );
}
