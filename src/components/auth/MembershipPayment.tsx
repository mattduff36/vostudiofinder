'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Check, Building, Loader2, Sparkles, Upload, Globe } from 'lucide-react';
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
  const userId = searchParams?.get('userId') || '';
  const email = searchParams?.get('email') || '';
  const name = searchParams?.get('name') || '';
  const username = searchParams?.get('username') || '';

  useEffect(() => {
    console.log('🎯 MembershipPayment mounted with:', { userId, email, name, username });
    
    const checkExistingPayment = async () => {
      if (!userId) {
        setError('Session expired. Please sign up again.');
        setIsLoading(false);
        return;
      }

      if (!stripeKey) {
        setError('Stripe configuration missing. Please contact support.');
        setIsLoading(false);
        return;
      }

      try {
        // Check if payment already exists
        const response = await fetch('/api/auth/check-payment-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.hasPayment && data.paymentStatus === 'succeeded') {
            // Payment already completed - redirect to profile creation
            console.log('✅ Payment already completed, redirecting to profile creation');
            window.location.href = `/auth/membership/success?session_id=${data.sessionId || ''}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&username=${encodeURIComponent(username)}`;
            return; // Don't set loading to false - we're redirecting
          }
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
      }

      // Only set loading to false after all checks complete and no redirect occurred
      setIsLoading(false);
    };

    checkExistingPayment();
    // stripeKey is a constant from process.env, doesn't need to be in dependencies
  }, [userId, email, name, username]);

  const fetchClientSecret = useCallback(async () => {
    console.log('🔄 Fetching client secret...');
    setError(null);
    
    if (!userId) {
      throw new Error('User ID is missing. Please sign up again.');
    }

    try {
      const response = await fetch('/api/stripe/create-membership-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
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
  }, [userId, email, name, username]);

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

        {/* Welcome Header */}
        <div className="bg-[#d42027] px-8 py-8 text-white text-center rounded-t-xl shadow-lg">
          <div className="text-4xl font-bold mb-3">Welcome {name || 'Studio Owner'}!</div>
          <div className="text-xl mb-2">VoiceoverStudioFinder.com/{username || 'YourStudio'} has been secured</div>
          <div className="text-base opacity-90">You&apos;re minutes away from showcasing your studio!</div>
        </div>

        <div className="bg-white shadow-2xl rounded-b-xl overflow-hidden">
          {/* Two Column Layout - 3:2 ratio */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
            {/* LEFT: Features & Account Info - Takes 3 columns */}
            <div className="px-8 py-8 lg:col-span-3 border-r border-gray-200">
              <div className="flex items-start mb-6">
                <div className="bg-[#d42027] text-white p-2 rounded-lg mr-4">
                  <Building className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-gray-900">
                    What's Included
                  </h4>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                {[
                  'Professional studio listing with photos & details',
                  'Direct contact from qualified clients',
                  'Manage your availability and booking preferences',
                  'Analytics on profile views and enquiries',
                  'Be discoverable by voice artists worldwide',
                  'SEO-optimised profile for search engines',
                  'Build trust with a professional studio presence'
                ].map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="w-6 h-6 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Divider */}
              <div className="my-8 border-t border-gray-200"></div>

              {/* What's Next Section */}
              <div className="bg-gradient-to-br from-[#d42027]/5 to-[#d42027]/10 rounded-lg p-6 border border-[#d42027]/20">
                <div className="flex items-start mb-4">
                  <div className="bg-[#d42027] text-white p-2 rounded-lg mr-4">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-gray-900 mb-4">
                      What Happens Next?
                    </h4>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start">
                    <Building className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-800 font-medium">Add Your Studio Details</p>
                      <p className="text-gray-600 text-sm">Studio name, description, and type (Home/Recording/Podcast)</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Upload className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-800 font-medium">Upload Studio Images</p>
                      <p className="text-gray-600 text-sm">Showcase your space with 1-5 professional photos</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Globe className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-800 font-medium">Go Live Worldwide</p>
                      <p className="text-gray-600 text-sm">Your profile becomes instantly searchable to thousands of voice artists globally</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Payment Form - Takes 2 columns */}
            <div className="lg:col-span-2 pb-8">
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
