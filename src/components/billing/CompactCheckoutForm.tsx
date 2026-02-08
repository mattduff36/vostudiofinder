'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  CheckoutProvider,
  useCheckout,
  PaymentElement,
} from '@stripe/react-stripe-js/checkout';
import { Loader2, Lock } from 'lucide-react';

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

// ---------------------------------------------------------------------------
// Inner payment form (must be rendered inside CheckoutProvider)
// ---------------------------------------------------------------------------
function PaymentForm({ amount, buttonText }: { amount: string; buttonText?: string | undefined }) {
  const checkoutState = useCheckout();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReady = checkoutState.type === 'success';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // confirm() uses the session's return_url (set server-side) for redirect
      await checkoutState.checkout.confirm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: 'accordion',
          paymentMethodOrder: ['apple_pay', 'google_pay', 'card', 'link'],
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }}
      />

      {error && (
        <div className="mt-3 text-xs text-red-600 p-2.5 bg-red-50 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !isReady}
        className="w-full mt-4 bg-[#d42027] text-white py-2.5 rounded-lg hover:bg-[#b01b21] transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            Processing…
          </span>
        ) : (
          buttonText || `Pay ${amount}`
        )}
      </button>

      <p className="flex items-center justify-center mt-2.5 text-[11px] text-gray-400">
        <Lock className="w-3 h-3 mr-1" />
        Secure payment via Stripe
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Public component – drop-in replacement for EmbeddedCheckoutProvider + EmbeddedCheckout
// ---------------------------------------------------------------------------
interface CompactCheckoutFormProps {
  /** Callback that returns the Checkout Session client_secret from your API */
  fetchClientSecret: () => Promise<string>;
  /** Display amount on the pay button, e.g. "£25" */
  amount: string;
  /** Override the full button label, e.g. "Pay £25/year" */
  buttonText?: string;
}

export function CompactCheckoutForm({
  fetchClientSecret,
  amount,
  buttonText,
}: CompactCheckoutFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchClientSecret()
      .then((secret) => {
        if (!cancelled) {
          setClientSecret(secret);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Payment setup failed');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchClientSecret]);

  // Loading state while fetching client secret
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#d42027] mr-2" />
        <span className="text-sm text-gray-500">Setting up payment…</span>
      </div>
    );
  }

  // Error from fetching client secret
  if (error) {
    return (
      <div className="text-sm text-red-600 p-3 bg-red-50 rounded">
        {error}
      </div>
    );
  }

  // Guard: Stripe not loaded or no secret
  if (!clientSecret || !stripePromise) {
    return (
      <div className="text-sm text-red-600 p-3 bg-red-50 rounded">
        Payment system not configured. Please contact support.
      </div>
    );
  }

  return (
    <CheckoutProvider
      stripe={stripePromise}
      options={{
        clientSecret,
        elementsOptions: {
          appearance: {
            theme: 'stripe',
            variables: {
              fontSizeBase: '14px',
              spacingUnit: '3px',
              borderRadius: '6px',
              colorPrimary: '#d42027',
            },
          },
        },
      }}
    >
      <PaymentForm amount={amount} buttonText={buttonText} />
    </CheckoutProvider>
  );
}
