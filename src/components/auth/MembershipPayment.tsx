'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Check, Building, Loader2 } from 'lucide-react';
import Image from 'next/image';

// Initialize Stripe
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
console.log('🔧 Stripe Key loaded:', stripeKey ? 'Yes (pk_...)' : 'MISSING!');

const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

export function MembershipPayment() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get user data from URL params (passed from signup form)
  const email = searchParams?.get('email') || '';
  const name = searchParams?.get('name') || '';
  const username = searchParams?.get('username') || '';

  useEffect(() => {
    console.log('🎯 MembershipPayment mounted with:', { email, name, username });
    
    if (!stripeKey) {
      setError('Stripe configuration missing. Please contact support.');
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [email, name, username]);

  const fetchClientSecret = useCallback(async () => {
    console.log('🔄 Fetching client secret...');
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
        }),
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      console.log('✅ API Response data:', data);
      
      if (!data.clientSecret) {
        throw new Error('No client secret returned from API');
      }

      console.log('🎉 Client secret received');
      return data.clientSecret;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment setup failed';
      console.error('💥 fetchClientSecret error:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  }, [email, name, username]);

  const options = { fetchClientSecret };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-center py-8 px-4">
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

      <div className="relative z-10 w-full max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/images/voiceover-studio-finder-header-logo2-black.png"
            alt="VoiceoverStudioFinder"
            width={450}
            height={71}
            priority
            className="h-auto"
          />
        </div>

        {/* Pricing Header */}
        <div className="bg-[#d42027] px-8 py-8 text-white text-center rounded-t-xl shadow-lg">
          <div className="text-5xl font-bold mb-2">£25</div>
          <div className="text-xl opacity-90">per year</div>
          <div className="text-sm opacity-80 mt-2">Exceptional value for global reach</div>
        </div>

        <div className="bg-white shadow-2xl rounded-b-xl overflow-hidden">
          {/* Two Column Layout - 3:2 ratio */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
            {/* LEFT: Features & Account Info - Takes 3 columns */}
            <div className="px-8 py-8 lg:col-span-3 border-r border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <Building className="w-6 h-6 mr-3 text-[#d42027]" />
                What's Included
              </h3>
              
              <ul className="space-y-4 mb-8">
                {[
                  'Professional studio listing with photos & details',
                  'Direct contact from qualified clients',
                  'Manage your availability and booking preferences',
                  'Analytics on profile views and inquiries',
                  'Reach thousands of voice artists worldwide',
                  'SEO-optimised profile for search engines',
                  'Respond to reviews and build your reputation'
                ].map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="w-6 h-6 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Account Details */}
              {(email || name) && (
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Account Details</h4>
                  {name && <p className="text-gray-700 mb-1"><span className="font-medium">Name:</span> {name}</p>}
                  {email && <p className="text-gray-700"><span className="font-medium">Email:</span> {email}</p>}
                </div>
              )}
            </div>

            {/* RIGHT: Payment Form - Takes 2 columns */}
            <div className="lg:col-span-2 bg-gray-50">
              {/* Error Display */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="text-red-600 mr-3 text-xl">⚠️</div>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Embedded Stripe Checkout */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-[#d42027] mb-4" />
                  <span className="text-gray-600 text-lg">Loading payment form...</span>
                </div>
              ) : !stripePromise ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <p className="text-red-800 font-medium text-lg mb-2">Payment system configuration error</p>
                  <p className="text-red-600">
                    Please contact support. Error: Stripe not configured
                  </p>
                </div>
              ) : (
                <div id="checkout" className="stripe-embedded-checkout">
                  <EmbeddedCheckoutProvider
                    stripe={stripePromise}
                    options={options}
                  >
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                </div>
              )}
            </div>
          </div>

          {/* Secure Payment Footer */}
          <div className="py-4 text-center border-t border-gray-200 bg-white">
            <p className="text-sm text-gray-500">
              🔒 Secure payment powered by Stripe
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Questions? Contact us at{' '}
            <a href="mailto:support@voiceoverstudiofinder.com" className="text-[#d42027] hover:underline">
              support@voiceoverstudiofinder.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
