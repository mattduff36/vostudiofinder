'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { loadStripe } from '@stripe/stripe-js';
import { Check, Building } from 'lucide-react';
import Image from 'next/image';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function MembershipPayment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user data from URL params (passed from signup form)
  const email = searchParams?.get('email') || '';
  const name = searchParams?.get('name') || '';
  const username = searchParams?.get('username') || '';

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-membership-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          username,
          priceId: process.env.NEXT_PUBLIC_STRIPE_MEMBERSHIP_PRICE_ID,
        }),
      });

    const { sessionId, url, error: apiError } = await response.json();

    if (apiError) {
      throw new Error(apiError);
    }

    // Stripe.js v8 uses direct URL redirect instead of redirectToCheckout
    if (url) {
      window.location.href = url;
    } else if (sessionId) {
      // Fallback: construct the URL manually if only sessionId is provided
      const stripe = await stripePromise;
      if (stripe) {
        // This is no longer supported in v8, but keeping as fallback
        window.location.href = `https://checkout.stripe.com/pay/${sessionId}`;
      }
    }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-5.jpg"
          alt="Membership background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/images/voiceover-studio-finder-header-logo2-black.png"
            alt="VoiceoverStudioFinder"
            width={450}
            height={71}
            priority
            className="h-auto"
          />
        </div>

        <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-lg overflow-hidden">
          {/* Pricing Header */}
          <div className="bg-[#d42027] px-8 py-6 text-white text-center">
            <div className="text-4xl font-bold mb-2">£25</div>
            <div className="text-lg opacity-90">per year</div>
            <div className="text-sm opacity-75 mt-1">Exceptional value for global reach</div>
          </div>

          {/* Features List */}
          <div className="px-8 py-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Building className="w-5 h-5 mr-2 text-[#d42027]" />
              What's Included
            </h3>
            
            <ul className="space-y-3 mb-8">
              {[
                'Professional studio listing with photos & details',
                'Reach thousands of voice artists worldwide',
                'Direct contact from qualified clients',
                'SEO-optimised profile for search engines',
                'Manage your availability and booking preferences',
                'Respond to reviews and build your reputation',
                'Analytics on profile views and inquiries',
                '24/7 customer support'
              ].map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            {/* User Info */}
            {(email || name) && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Account Details</h4>
                {name && <p className="text-sm text-gray-600">Name: {name}</p>}
                {email && <p className="text-sm text-gray-600">Email: {email}</p>}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col space-y-4">
              <Button
                onClick={handlePayment}
                disabled={isLoading}
                loading={isLoading}
                className="w-full bg-[#d42027] hover:bg-[#b91c23] text-white py-3 text-lg font-semibold"
              >
                Complete Membership Purchase
              </Button>
              
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={isLoading}
              >
                Go Back
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Secure payment powered by Stripe • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
