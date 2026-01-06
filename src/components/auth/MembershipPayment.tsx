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

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-4xl">
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
          <div className="px-8 py-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Building className="w-5 h-5 mr-2 text-[#d42027]" />
              What's Included
            </h3>
            
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {[
                'Professional studio listing with photos & details',
                'Reach thousands of voice artists worldwide',
                'Direct contact from qualified clients',
                'SEO-optimised profile for search engines',
                'Manage your availability and booking preferences',
                'Respond to reviews and build your reputation',
                'Analytics on profile views and inquiries'
              ].map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            {/* User Info */}
            {(email || name) && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Account Details</h4>
                {name && <p className="text-sm text-gray-600">Name: {name}</p>}
                {email && <p className="text-sm text-gray-600">Email: {email}</p>}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-8 py-4 bg-red-50 border-b border-red-200">
              <div className="flex items-start">
                <div className="text-red-600 mr-3">⚠️</div>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Embedded Stripe Checkout */}
          <div className="px-8 py-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#d42027]" />
                <span className="ml-3 text-gray-600">Loading payment form...</span>
              </div>
            ) : !stripePromise ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-red-800 font-medium">Payment system configuration error</p>
                <p className="text-red-600 text-sm mt-2">
                  Please contact support. Error: Stripe not configured
                </p>
              </div>
            ) : (
              <div id="checkout">
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={options}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            )}

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
