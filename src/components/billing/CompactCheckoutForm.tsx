'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  CheckoutProvider,
  useCheckout,
  PaymentElement,
} from '@stripe/react-stripe-js/checkout';
import { Loader2, Lock, Tag, X } from 'lucide-react';

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

// ---------------------------------------------------------------------------
// Promotion code input (rendered inside CheckoutProvider)
// ---------------------------------------------------------------------------
function PromotionCodeInput() {
  const checkoutState = useCheckout();
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  if (checkoutState.type !== 'success') return null;

  const { applyPromotionCode, removePromotionCode } = checkoutState.checkout;

  const handleApply = async () => {
    if (!code.trim()) return;
    setIsApplying(true);
    setPromoError(null);

    try {
      await applyPromotionCode(code.trim());
      setAppliedCode(code.trim().toUpperCase());
      setCode('');
      setIsOpen(false);
    } catch {
      setPromoError('Invalid or expired promo code');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemove = async () => {
    await removePromotionCode();
    setAppliedCode(null);
    setPromoError(null);
  };

  // Show applied code badge
  if (appliedCode) {
    return (
      <div className="mb-3 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-green-600" />
          <span className="text-xs font-semibold text-green-700">{appliedCode}</span>
          <span className="text-xs text-green-600">applied</span>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="text-green-500 hover:text-green-700 transition-colors p-0.5"
          aria-label="Remove promo code"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Collapsed: show toggle link
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mb-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#d42027] transition-colors"
      >
        <Tag className="w-3 h-3" />
        Have a promo code?
      </button>
    );
  }

  // Expanded: input + apply
  return (
    <div className="mb-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value); setPromoError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApply(); } }}
          placeholder="Enter promo code"
          className="flex-1 min-w-0 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#d42027]/30 focus:border-[#d42027]"
          autoFocus
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={isApplying || !code.trim()}
          className="text-xs font-semibold text-[#d42027] hover:text-[#b01b21] border border-[#d42027] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
        </button>
        <button
          type="button"
          onClick={() => { setIsOpen(false); setCode(''); setPromoError(null); }}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1.5"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {promoError && (
        <p className="mt-1 text-[11px] text-red-600">{promoError}</p>
      )}
    </div>
  );
}

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

      <div className="mt-3">
        <PromotionCodeInput />
      </div>

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
