'use client';

import { useState, useCallback, useEffect } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, X, Calendar, Gift } from 'lucide-react';
import { formatRenewalBreakdown, getRenewalPrice, calculateFinalExpiryForDisplay } from '@/lib/membership-renewal';
import { formatDaysAsYearsMonthsDays } from '@/lib/date-format';

// Initialize Stripe
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

interface RenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  renewalType: 'early' | 'standard' | '5year';
  currentExpiry?: Date;
  daysRemaining?: number;
}

export function RenewalModal({
  isOpen,
  onClose,
  renewalType,
  currentExpiry,
  daysRemaining = 0,
}: RenewalModalProps) {
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
      // Map renewal types to API endpoints
      let endpoint: string;
      if (renewalType === 'early' || renewalType === 'standard') {
        // Both use the same endpoint (early renewal API handles both with/without bonus)
        endpoint = '/api/membership/renew-early';
      } else {
        endpoint = '/api/membership/renew-5year';
      }

      const response = await fetch(endpoint, {
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
  }, [renewalType]);

  if (!isOpen) return null;

  const priceInfo = getRenewalPrice(renewalType);
  const breakdown = formatRenewalBreakdown(daysRemaining, renewalType);

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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {renewalType === 'early' 
              ? 'Early Renewal' 
              : renewalType === 'standard'
              ? 'Standard Renewal'
              : '5-Year Membership'}
          </h2>
          <p className="mt-1 text-base sm:text-lg font-semibold text-[#d42027]">
            {priceInfo.formatted}
            {priceInfo.savings && (
              <span className="ml-2 text-xs sm:text-sm text-green-600">
                Save {priceInfo.savings}!
              </span>
            )}
          </p>
        </div>

        {/* Breakdown */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Membership Calculation
          </h3>
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-gray-600 gap-2">
              <span className="flex-shrink-0">Current time:</span>
              <span className="font-medium text-gray-900 text-right">
                {breakdown.current < 0 ? (
                  <span className="text-red-600">Expired</span>
                ) : breakdown.current === 0 ? (
                  <span className="text-orange-600">Expires today</span>
                ) : (
                  formatDaysAsYearsMonthsDays(breakdown.current)
                )}
              </span>
            </div>
            <div className="flex justify-between text-gray-600 gap-2">
              <span className="flex-shrink-0">Period added:</span>
              <span className="font-medium text-gray-900 text-right">{formatDaysAsYearsMonthsDays(breakdown.added)}</span>
            </div>
            {breakdown.bonus > 0 && (
              <div className="flex justify-between text-green-600 gap-2">
                <span className="flex items-center flex-shrink-0">
                  <Gift className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Bonus:
                </span>
                <span className="font-semibold text-right">{formatDaysAsYearsMonthsDays(breakdown.bonus)}</span>
              </div>
            )}
            <div className="pt-1.5 sm:pt-2 border-t border-gray-300 flex justify-between text-gray-900 font-bold gap-2">
              <span className="flex-shrink-0">Extension:</span>
              <span className="text-right">{formatDaysAsYearsMonthsDays(breakdown.total)}</span>
            </div>
            {currentExpiry && (
              <div className="pt-1.5 sm:pt-2 text-xs text-gray-500">
                New expiry: {calculateFinalExpiryForDisplay(currentExpiry, renewalType).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </div>
            )}
          </div>
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
