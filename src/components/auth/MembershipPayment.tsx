'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Check, Building, Loader2, Sparkles, Upload, Globe, AlertCircle, Gift, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { usePreventBackNavigation } from '@/hooks/usePreventBackNavigation';
import { getSignupData, storeSignupData, recoverSignupState, updateURLParams, type SignupData } from '@/lib/signup-recovery';
import { getPromoConfig } from '@/lib/promo';

// Initialize Stripe
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
console.log('🔧 Stripe Key loaded:', stripeKey ? 'Yes (pk_...)' : 'MISSING!');

const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

export function MembershipPayment() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isActivatingPromo, setIsActivatingPromo] = useState(false);
  const promoConfig = getPromoConfig();

  // Get user data from URL params (passed from signup form)
  let userId = searchParams?.get('userId') || '';
  let email = searchParams?.get('email') || '';
  let name = searchParams?.get('name') || '';
  let username = searchParams?.get('username') || '';

  // Enable back button protection only (not beforeunload)
  // Note: We disable beforeunload because it interferes with Stripe's redirect after payment
  // The beforeunload event fires for ALL navigation, including Stripe's redirect to success page
  // We only want to prevent back button navigation, not forward navigation/redirects
  usePreventBackNavigation({
    enabled: true,
    warningMessage: 'Your payment is in progress. Are you sure you want to go back? You may lose your progress.',
    disableBeforeUnload: true, // Disable beforeunload to allow Stripe redirect without warning
    onBackAttempt: () => {
      console.log('[WARNING] User attempted to navigate back from payment page');
    },
  });

  useEffect(() => {
    console.log('🎯 MembershipPayment mounted with:', { userId, email, name, username });
    
    const initializeAndCheckPayment = async () => {
      // If URL params are missing, try to recover from sessionStorage
      if (!userId || !email) {
        console.log('[WARNING] Missing URL params, attempting recovery from sessionStorage...');
        const storedData = getSignupData();
        
        if (storedData) {
          console.log('✅ Recovered data from sessionStorage');
          userId = storedData.userId;
          email = storedData.email;
          name = storedData.display_name;
          username = storedData.username || '';
          
          // Update URL params to prevent issues on refresh
          updateURLParams({ userId, email, name, username });
        } else {
          // Try to recover from database using email if available
          if (email) {
            setIsRecovering(true);
            const recovery = await recoverSignupState(email);
            
            if (recovery.success && recovery.data) {
              console.log('✅ Recovered data from database');
              userId = recovery.data.userId;
              email = recovery.data.email;
              name = recovery.data.display_name;
              username = recovery.data.username || '';
              
              // Store recovered data, preserving password from existing signup data
              const existingSignupData = getSignupData();
              const signupDataToStore: SignupData = {
                userId,
                email,
                display_name: name,
                username,
              };
              // Only include password if it exists (exactOptionalPropertyTypes: true requires this)
              if (existingSignupData?.password) {
                signupDataToStore.password = existingSignupData.password;
              }
              // Only include reservation_expires_at if it exists (exactOptionalPropertyTypes: true requires this)
              if (existingSignupData?.reservation_expires_at !== undefined) {
                signupDataToStore.reservation_expires_at = existingSignupData.reservation_expires_at;
              }
              storeSignupData(signupDataToStore);
              
              // Update URL
              updateURLParams({ userId, email, name, username });
              setIsRecovering(false);
            } else {
              setIsRecovering(false);
              setError('Session expired. Unable to recover your signup data. Please start over.');
              setRecoveryAttempted(true);
              setIsLoading(false);
              return;
            }
          } else {
            setError('Session expired. Please sign up again.');
            setRecoveryAttempted(true);
            setIsLoading(false);
            return;
          }
        }
      } else {
        // Store params in sessionStorage as backup, preserving password from existing data
        const existingSignupData = getSignupData();
        const signupDataToStore: SignupData = {
          userId,
          email,
          display_name: name,
          username,
        };
        // Only include password if it exists (exactOptionalPropertyTypes: true requires this)
        if (existingSignupData?.password) {
          signupDataToStore.password = existingSignupData.password;
        }
        // Only include reservation_expires_at if it exists (exactOptionalPropertyTypes: true requires this)
        if (existingSignupData?.reservation_expires_at !== undefined) {
          signupDataToStore.reservation_expires_at = existingSignupData.reservation_expires_at;
        }
        storeSignupData(signupDataToStore);
      }

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
          
          // If user is ACTIVE (canResume: false), redirect to dashboard
          if (data.hasPayment && data.paymentStatus === 'succeeded' && data.canResume === false) {
            console.log('✅ Account already active, redirecting to dashboard');
            window.location.href = '/dashboard';
            return; // Don't set loading to false - we're redirecting
          }
          
          // If user is PENDING with payment completed, redirect to profile creation
          if (data.hasPayment && data.paymentStatus === 'succeeded' && data.sessionId) {
            console.log('✅ Payment already completed, redirecting to profile creation');
            window.location.href = `/auth/membership/success?session_id=${data.sessionId}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&username=${encodeURIComponent(username)}`;
            return; // Don't set loading to false - we're redirecting
          }
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
      }

      // Only set loading to false after all checks complete and no redirect occurred
      setIsLoading(false);
    };

    initializeAndCheckPayment();
    // stripeKey is a constant from process.env, doesn't need to be in dependencies
  }, [userId, email, name, username, router]);

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

  // Handle promo activation (free membership)
  const handlePromoActivation = async () => {
    setIsActivatingPromo(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stripe/activate-promo-membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email,
          name,
          username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to activate free membership');
      }

      const data = await response.json();
      console.log('✅ Promo membership activated:', data);
      
      // Redirect to success page
      window.location.href = `/auth/membership/success?promo=true&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&username=${encodeURIComponent(username)}`;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to activate membership';
      console.error('❌ Promo activation error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsActivatingPromo(false);
    }
  };

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
            src="/images/voiceover-studio-finder-logo-black-BIG 1.png"
            alt="VoiceoverStudioFinder"
            width={450}
            height={71}
            priority
            className="h-auto"
          />
        </div>

        {/* Welcome Header */}
        <div className="bg-[#d42027] px-8 py-8 text-white text-center rounded-t-xl shadow-lg">
          {promoConfig.isActive && (
            <div className="flex justify-center mb-3">
              <span className="bg-white/20 text-sm font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                <Gift className="w-4 h-4" />
                {promoConfig.badgeText} — {promoConfig.promoPrice} Membership
              </span>
            </div>
          )}
          <div className="text-4xl font-bold mb-3">Welcome {name || 'Studio Owner'}!</div>
          <div className="text-xl mb-2">VoiceoverStudioFinder.com/{username || 'YourStudio'} has been secured</div>
          <div className="text-base opacity-90">
            {promoConfig.isActive 
              ? `Activate your ${promoConfig.promoPrice} membership and start showcasing your studio!`
              : `You're minutes away from showcasing your studio!`
            }
          </div>
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

            {/* RIGHT: Payment/Activation Form - Takes 2 columns */}
            <div className="lg:col-span-2 pb-8">
              {/* Error Display with Recovery Options */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-red-700 flex-1">{error}</p>
                  </div>
                  {recoveryAttempted && (
                    <div className="mt-4 pt-3 border-t border-red-200">
                      <button
                        onClick={() => router.push('/auth/signup')}
                        className="w-full bg-[#d42027] text-white py-2 px-4 rounded-lg hover:bg-[#b01b21] transition-colors font-medium"
                      >
                        Start Fresh Signup
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Recovery in Progress */}
              {isRecovering && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 text-blue-600 mr-3 animate-spin" />
                    <p className="text-blue-700">Recovering your session...</p>
                  </div>
                </div>
              )}

              {/* PROMO: Free Membership Activation */}
              {promoConfig.isActive ? (
                <div className="px-6 py-8">
                  {/* Promo Callout */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-green-500 text-white p-2 rounded-full">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-green-800">Flash Sale Active!</h3>
                        <p className="text-sm text-green-700">
                          <span className="line-through opacity-75">{promoConfig.normalPrice}</span>
                          <span className="ml-2 font-semibold">{promoConfig.promoPrice}</span>
                        </p>
                      </div>
                    </div>
                    <p className="text-green-700 text-sm mb-4">
                      You&apos;re getting a {promoConfig.promoPrice} membership as part of our limited-time promotion. 
                      Normally this would cost {promoConfig.normalPrice}.
                    </p>
                    <ul className="space-y-2 text-sm text-green-800">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        No credit card required
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        Full access to all features
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        Your studio goes live immediately
                      </li>
                    </ul>
                  </div>

                  {/* Activation Button */}
                  <button
                    onClick={handlePromoActivation}
                    disabled={isLoading || isActivatingPromo || !userId}
                    className="w-full bg-[#d42027] text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-[#b01b21] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isActivatingPromo ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Activating your membership...
                      </>
                    ) : (
                      <>
                        Activate {promoConfig.promoPrice} Membership
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    By clicking above, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              ) : (
                /* NORMAL: Embedded Stripe Checkout */
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Footer - Different for promo vs paid */}
          <div className="py-4 text-center border-t border-gray-200 bg-white">
            <p className="text-sm text-gray-500">
              {promoConfig.isActive 
                ? `🎉 Limited-time offer — normally ${promoConfig.normalPrice}`
                : '🔒 Secure payment powered by Stripe'
              }
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
