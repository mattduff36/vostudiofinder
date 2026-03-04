'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Calendar, Gift } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CompactCheckoutForm } from '@/components/billing/CompactCheckoutForm';
import { formatRenewalBreakdown, getRenewalPrice, calculateFinalExpiryForDisplay } from '@/lib/membership-renewal';
import { formatDaysAsYearsMonthsDays } from '@/lib/date-format';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  const fetchClientSecret = useCallback(async () => {
    setError(null);

    try {
      let endpoint: string;
      if (renewalType === 'early' || renewalType === 'standard') {
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

      return data.clientSecret;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment setup failed';
      setError(errorMessage);
      throw err;
    }
  }, [renewalType]);

  const priceInfo = getRenewalPrice(renewalType);
  const breakdown = formatRenewalBreakdown(daysRemaining, renewalType);

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors z-10"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-200 pr-12">
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
      <div className="px-5 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200">
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
      <div className="px-5 sm:px-6 py-4 sm:py-6">
        {error && (
          <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs sm:text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="stripe-payment-element">
          <CompactCheckoutForm
            fetchClientSecret={fetchClientSecret}
            amount={priceInfo.formatted}
            buttonText={`Pay ${priceInfo.formatted}`}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          Secure payment powered by Stripe
        </p>
      </div>
    </Modal>
  );
}
