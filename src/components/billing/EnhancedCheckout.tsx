'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { loadStripe } from '@stripe/stripe-js';

interface EnhancedCheckoutProps {
  studio_id: string;
  planName: string;
  planPrice: number;
  planCurrency: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function EnhancedCheckout({
  studio_id,
  planName,
  planPrice,
}: EnhancedCheckoutProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStripeCheckout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studio_id,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

    const { sessionId, url } = await response.json();

    // Stripe.js v8 uses direct URL redirect instead of redirectToCheckout
    if (url) {
      window.location.href = url;
    } else if (sessionId) {
      // Fallback: construct the URL manually if only sessionId is provided
      const stripe = await stripePromise;
      if (stripe) {
        window.location.href = `https://checkout.stripe.com/pay/${sessionId}`;
      } else {
        throw new Error('Stripe failed to load');
      }
    }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">Please sign in to upgrade your studio</p>
        <Button onClick={() => router.push('/auth/signin')}>
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8" style={{ maxWidth: '768px', margin: '0 auto' }}>
      {/* Plan Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Summary</h3>
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium">{planName}</p>
            <p className="text-sm text-gray-600">Annual subscription</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              £{planPrice.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">per year</p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Featured studio listing
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Priority placement in search results
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Unlimited photo uploads
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Enhanced profile customisation
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Detailed analytics and insights
            </li>
          </ul>
        </div>
      </div>

      {/* Payment Method Selection */}
      <PaymentMethodSelector />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-400 mr-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Checkout Button */}
      <div className="text-center">
        <Button
          onClick={handleStripeCheckout}
          disabled={isLoading}
          className="w-full sm:w-auto px-8 py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            'Subscribe with Card'
          )}
        </Button>
        
        <p className="text-xs text-gray-500 mt-4">
          You can cancel anytime. No hidden fees or long-term commitments.
        </p>
      </div>

      {/* Trust Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-sm text-gray-600">
        <div className="flex items-center justify-center">
          <span className="text-green-500 mr-2">🔒</span>
          SSL Encrypted
        </div>
        <div className="flex items-center justify-center">
          <span className="text-blue-500 mr-2">💳</span>
          Stripe Secure
        </div>
        <div className="flex items-center justify-center">
          <span className="text-purple-500 mr-2">↩️</span>
          Cancel Anytime
        </div>
      </div>
    </div>
  );
}
