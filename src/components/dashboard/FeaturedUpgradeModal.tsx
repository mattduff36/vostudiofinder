'use client';

import { useState, useCallback, useEffect } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, X, Star } from 'lucide-react';

// Initialize Stripe
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

interface FeaturedUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeaturedUpgradeModal({
  isOpen,
  onClose,
}: FeaturedUpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen]);

  const fetchClientSecret = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch('/api/featured/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      
      if (!data.clientSecret) {
        throw new Error('No client secret returned from API');
      }

      setIsLoading(false);
      return data.clientSecret;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment setup failed';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50">
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 pr-12 sm:pr-14">
          <div className="flex items-center space-x-2 mb-2">
            <Star className="w-5 h-5 sm:w-6 sm:h-6 text-[#d42027]" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Featured Studio Upgrade
            </h2>
          </div>
          <p className="text-base sm:text-lg font-semibold text-[#d42027]">
            £100 for 6 months
          </p>
        </div>

        {/* Benefits */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
            Benefits of Featured Status
          </h3>
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-[#d42027] mr-2 flex-shrink-0">✓</span>
              <span>Prominent placement on the homepage</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#d42027] mr-2 flex-shrink-0">✓</span>
              <span>Priority positioning in search results</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#d42027] mr-2 flex-shrink-0">✓</span>
              <span>Increased visibility to voiceover artists seeking studios</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#d42027] mr-2 flex-shrink-0">✓</span>
              <span>Stand out from the competition with featured badge</span>
            </li>
          </ul>
        </div>

        {/* Payment Form */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          {error && (
            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs sm:text-sm text-red-800">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-[#d42027] mb-2 sm:mb-3" />
              <span className="text-sm sm:text-base text-gray-600">Loading payment form...</span>
            </div>
          ) : !stripePromise ? (
            <div className="p-4 sm:p-6 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium mb-1 sm:mb-2 text-sm sm:text-base">Payment system error</p>
              <p className="text-red-600 text-xs sm:text-sm">
                Please contact support. Error: Stripe not configured
              </p>
            </div>
          ) : (
            <div className="stripe-embedded-checkout">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ fetchClientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            🔒 Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
