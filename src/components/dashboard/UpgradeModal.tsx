'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Crown } from 'lucide-react';
import { CompactCheckoutForm } from '@/components/billing/CompactCheckoutForm';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [autoRenew, setAutoRenew] = useState(true);
  const [paymentOptionConfirmed, setPaymentOptionConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setAutoRenew(true);
      setPaymentOptionConfirmed(false);
    }
  }, [isOpen]);

  const fetchClientSecret = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch('/api/membership/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRenew }),
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
  }, [autoRenew]);

  if (!isOpen) return null;

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
            <Crown className="w-5 h-5 text-[#d42027]" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Upgrade to Premium
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            Unlock all features for just £25/year
          </p>
        </div>

        {/* Payment Option Selection */}
        {!paymentOptionConfirmed ? (
          <div className="px-5 sm:px-6 py-5">
            <p className="text-sm font-semibold text-gray-900 mb-3">Choose your payment option:</p>
            <div className="space-y-2.5">
              {/* Auto-renew option (recommended, pre-selected) */}
              <button
                type="button"
                onClick={() => setAutoRenew(true)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                  autoRenew
                    ? 'border-[#d42027] bg-red-50/50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${autoRenew ? 'text-gray-900' : 'text-gray-700'}`}>
                        Auto-renew annually
                      </span>
                      <span className="text-[10px] font-semibold text-white bg-[#d42027] px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Stay Premium automatically. Cancel anytime in Settings.
                    </p>
                  </div>
                  <span className={`text-lg font-extrabold ${autoRenew ? 'text-[#d42027]' : 'text-gray-500'}`}>
                    £25<span className="text-xs font-semibold">/yr</span>
                  </span>
                </div>
              </button>

              {/* Pay once option */}
              <button
                type="button"
                onClick={() => setAutoRenew(false)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                  !autoRenew
                    ? 'border-[#d42027] bg-red-50/50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-sm font-bold ${!autoRenew ? 'text-gray-900' : 'text-gray-700'}`}>
                      Pay once
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      One-off payment for 1 year. You can switch to auto-renew later in Settings.
                    </p>
                  </div>
                  <span className={`text-lg font-extrabold ${!autoRenew ? 'text-[#d42027]' : 'text-gray-500'}`}>
                    £25
                  </span>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPaymentOptionConfirmed(true)}
              className="w-full mt-4 bg-[#d42027] text-white py-3 px-4 rounded-lg hover:bg-[#b01b21] transition-colors font-semibold text-sm shadow-sm"
            >
              Continue to payment
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">Secure payment via Stripe</p>
          </div>
        ) : (
          <>
            {/* Selected option summary */}
            <div className="px-5 sm:px-6 pt-4 pb-3">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                <span className="text-sm text-gray-700">
                  {autoRenew ? 'Auto-renew annually — £25/year' : 'Pay once — £25 for 1 year'}
                </span>
                <button
                  type="button"
                  onClick={() => setPaymentOptionConfirmed(false)}
                  className="text-xs text-[#d42027] hover:underline font-medium"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Payment Form */}
            <div className="px-5 sm:px-6 py-4">
              {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs sm:text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="stripe-payment-element">
                <CompactCheckoutForm
                  fetchClientSecret={fetchClientSecret}
                  amount="£25"
                  buttonText={autoRenew ? 'Pay £25/year' : 'Pay £25 once'}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 text-center rounded-b-2xl">
              <p className="text-xs text-gray-500">
                Secure payment powered by Stripe
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
