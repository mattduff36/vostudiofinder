'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, Loader2, AlertCircle, X, Crown } from 'lucide-react';
import { CompactCheckoutForm } from '@/components/billing/CompactCheckoutForm';
import Image from 'next/image';
import { usePreventBackNavigation } from '@/hooks/usePreventBackNavigation';
import { getSignupData, storeSignupData, recoverSignupState, updateURLParams, type SignupData } from '@/lib/signup-recovery';

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export function MembershipPayment() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'basic' | 'premium' | null>(null);
  const [isCompletingBasic, setIsCompletingBasic] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);
  const [paymentOptionConfirmed, setPaymentOptionConfirmed] = useState(false);

  // Get user data from URL params (passed from signup form)
  let userId = searchParams?.get('userId') || '';
  let email = searchParams?.get('email') || '';
  let name = searchParams?.get('name') || '';
  let username = searchParams?.get('username') || '';

  // Lock body scroll when premium payment modal is open; reset option state on close
  useEffect(() => {
    if (selectedTier === 'premium') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setPaymentOptionConfirmed(false);
      setAutoRenew(true);
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedTier]);

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
              return;
            }
          } else {
            setError('Session expired. Please sign up again.');
            setRecoveryAttempted(true);
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
        return;
      }

      if (!stripeKey) {
        setError('Stripe configuration missing. Please contact support.');
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
          autoRenew,
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
  }, [userId, email, name, username, autoRenew]);

  // Handle Basic (Free) tier signup
  const handleBasicSignup = async () => {
    if (!userId) {
      setError('User ID is missing. Please sign up again.');
      return;
    }

    setIsCompletingBasic(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/complete-basic-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete signup');
      }

      const data = await response.json();
      console.log('✅ Basic signup completed:', data);

      // Redirect to the onboarding success page (same as Premium flow, but without payment session)
      window.location.href = `/auth/membership/success?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&username=${encodeURIComponent(username)}&tier=basic`;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete signup';
      console.error('💥 Basic signup error:', errorMessage);
      setError(errorMessage);
      setIsCompletingBasic(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-center pb-8 px-4 -mt-2">
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

      <div className="relative z-10 w-full max-w-7xl mx-auto mt-6">
        {/* Welcome Header */}
        <div className="bg-[#d42027] px-8 pt-12 pb-8 text-white text-center rounded-t-xl shadow-lg">
          <div className="text-4xl font-bold mb-3">Welcome {name || 'Studio Owner'}!</div>
          <div className="flex items-center justify-center mb-4">
            <span className="inline-flex items-center bg-white/15 backdrop-blur-sm rounded-full px-6 py-2.5 text-base tracking-wide">
              <span className="text-white/70">VoiceoverStudioFinder.com/</span>
              <span className="text-white font-semibold">{username || 'YourStudio'}</span>
              <span className="text-white/70 ml-1.5">has been secured</span>
            </span>
          </div>
          <div className="text-2xl font-semibold">Choose Your Membership</div>
        </div>

        <div className="bg-white shadow-2xl rounded-b-xl overflow-hidden">
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {/* BASIC (FREE) TIER */}
              <div className="border-2 border-gray-300 rounded-xl p-8 hover:border-gray-400 transition-all">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Basic</h3>
                  <div className="text-4xl font-bold text-gray-900">Free</div>
                  <p className="text-sm text-gray-600 mt-2">Perfect to get started</p>
                </div>

                <ul className="space-y-3 mb-8 min-h-[320px]">
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">A Professional studio listing</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Studio images</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">1 studio category</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">3 connection methods (Cleanfeed or Teams etc)</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Social media links</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Show Rates & Equipment</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">1000 character studio description</span>
                  </li>
                  <li className="flex items-start">
                    <X className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-500">Voiceover artist listing (Premium only)</span>
                  </li>
                  <li className="flex items-start">
                    <X className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-500">Verified badge eligibility</span>
                  </li>
                  <li className="flex items-start">
                    <X className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-500">Featured studio eligibility</span>
                  </li>
                </ul>

                <button
                  onClick={handleBasicSignup}
                  disabled={isCompletingBasic}
                  className="w-full bg-gray-100 text-gray-900 py-4 px-6 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-lg border-2 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCompletingBasic ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Setting up...
                    </span>
                  ) : (
                    'Continue with Basic (Free)'
                  )}
                </button>
                <p className="text-sm text-gray-500 text-center mt-3">Most studios upgrade once their profile is live</p>
              </div>

              {/* PREMIUM TIER */}
              <div className="border-2 border-[#d42027] rounded-xl p-8 relative bg-gradient-to-br from-white to-red-50/30 shadow-lg">
                {/* Popular Badge */}
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-[#d42027] text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center">
                    <Crown className="w-4 h-4 mr-1" />
                    RECOMMENDED
                  </div>
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium</h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-[#d42027]">£25</span>
                    <span className="text-gray-600 ml-2">/year</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">One booking more than pays for itself</p>
                </div>

                <ul className="space-y-3 mb-8 min-h-[320px]">
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">Everything in Basic, plus:</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Add more studio images</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">All studio categories + Voiceover artist listing</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">All connections + 2 custom methods</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Include all social media platforms</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">2000 character studio description</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Show Phone & Directions visibility controls</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Control how your studio appears on Google</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Verified badge eligibility</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-[#d42027] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Featured studio eligibility</span>
                  </li>
                </ul>

                <button
                  onClick={() => setSelectedTier('premium')}
                  className="w-full bg-[#d42027] text-white py-4 px-6 rounded-lg hover:bg-[#b01b21] transition-colors font-semibold text-lg shadow-lg"
                >
                  Upgrade to Premium - £25/year
                </button>
                <p className="text-sm text-gray-500 text-center mt-3">Cancel or change plan anytime in Settings</p>
              </div>
            </div>

            {/* Value Proposition */}
            <div className="mt-10 text-center max-w-2xl mx-auto">
              <p className="text-gray-600">
                <strong>Why Premium?</strong> Voice artists trust studios with complete, professional profiles. 
                Premium members get more profile views and are eligible for Verified and Featured status, which appear higher in search results and build trust with clients.
              </p>
            </div>
          </div>
        </div>

        {/* Premium Payment Modal */}
        {selectedTier === 'premium' && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedTier(null); }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal Container */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden z-[201] py-5">
              {/* Modal Close Button */}
              <button
                onClick={() => setSelectedTier(null)}
                className="absolute top-3 right-3 z-10 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                aria-label="Close payment modal"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Error Display */}
              {error && (
                <div className="m-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-red-700 flex-1">{error}</p>
                  </div>
                  {recoveryAttempted && (
                    <div className="mt-3 pt-3 border-t border-red-200">
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
                <div className="m-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 text-blue-600 mr-3 animate-spin" />
                    <p className="text-blue-700">Recovering your session...</p>
                  </div>
                </div>
              )}

              {/* Payment Option Selection */}
              {!paymentOptionConfirmed ? (
                <div className="px-5 pb-5">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Choose your payment option:</p>
                  <div className="space-y-2.5">
                    {/* Auto-renew option (recommended, pre-selected) */}
                    <button
                      type="button"
                      onClick={() => setAutoRenew(true)}
                      className={`relative w-full text-left rounded-xl border-2 p-4 transition-all ${
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
                      {autoRenew && (
                        <div className="w-4 h-4 rounded-full bg-[#d42027] flex items-center justify-center absolute top-3 left-3">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>

                    {/* Pay once option */}
                    <button
                      type="button"
                      onClick={() => setAutoRenew(false)}
                      className={`relative w-full text-left rounded-xl border-2 p-4 transition-all ${
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
                  <div className="px-5 pb-3">
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

                  {/* Compact Stripe Payment */}
                  <div className="px-5 py-4 stripe-payment-element">
                    <CompactCheckoutForm
                      fetchClientSecret={fetchClientSecret}
                      amount="£25"
                      buttonText={autoRenew ? 'Pay £25/year' : 'Pay £25 once'}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
