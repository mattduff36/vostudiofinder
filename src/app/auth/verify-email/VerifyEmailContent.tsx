'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';

interface VerifyEmailContentProps {
  flow: 'account' | 'profile' | 'signup';
  email?: string;
  error?: string;
}

export default function VerifyEmailContent({ flow, email: emailProp, error }: VerifyEmailContentProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const handleResendEmail = async () => {
    // Use email from props (passed via URL param)
    const email = emailProp;

    if (!email) {
      setResendMessage({ type: 'error', text: 'Unable to determine email address. Please return to signup and try again.' });
      return;
    }

    setIsResending(true);
    setResendMessage(null);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setResendMessage({ type: 'success', text: 'Verification email sent! Please check your inbox.' });
      } else {
        setResendMessage({ type: 'error', text: result.error || 'Failed to resend email' });
      }
    } catch (error) {
      setResendMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckStatus = async () => {
    const email = emailProp;
    
    if (!email) {
      setResendMessage({ type: 'error', text: 'Unable to check verification status. Please refresh the page.' });
      return;
    }

    setIsCheckingStatus(true);
    setResendMessage(null);

    try {
      // Check verification status by attempting to fetch user data
      const response = await fetch('/api/auth/check-verification-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok && result.verified) {
        // User is verified, redirect to payment
        setResendMessage({ type: 'success', text: 'Email verified! Redirecting to payment...' });
        
        // Build payment URL
        const paymentParams = new URLSearchParams();
        paymentParams.set('userId', result.userId);
        paymentParams.set('email', email);
        paymentParams.set('name', result.displayName);
        if (result.username) {
          paymentParams.set('username', result.username);
        }
        
        setTimeout(() => {
          window.location.href = `/auth/membership?${paymentParams.toString()}`;
        }, 1000);
      } else {
        setResendMessage({ type: 'error', text: 'Email not yet verified. Please check your inbox and click the verification link.' });
      }
    } catch (error) {
      setResendMessage({ type: 'error', text: 'Failed to check verification status. Please try again.' });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-start sm:justify-center py-8 sm:py-12 sm:px-6 lg:px-8">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-5.jpg"
          alt="Background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-2xl px-4">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/images/voiceover-studio-finder-logo-black-BIG.png"
            alt="VoiceoverStudioFinder"
            width={450}
            height={71}
            priority
            className="h-auto max-w-full"
          />
        </div>

        <div className="bg-white/90 backdrop-blur-sm py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              {flow === 'profile' ? (
                <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full shadow-lg">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                  <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {flow === 'profile' ? 'Welcome to Voiceover Studio Finder!' : 'Check Your Email'}
              </h1>
              {flow === 'profile' ? (
                <div className="mt-4 space-y-3">
                  <p className="text-gray-700 font-medium">
                    Thank you for creating your studio profile!
                  </p>
                  <p className="text-gray-600">
                    We've sent a verification email to your inbox. Please click the verification link to activate your account and complete the setup process.
                  </p>
                  <p className="text-gray-600">
                    Once verified, you'll be able to sign in and start connecting with voice artists worldwide.
                  </p>
                </div>
              ) : flow === 'signup' ? (
                <div className="mt-4 space-y-3">
                  <p className="text-gray-700 font-medium">
                    Your account has been created successfully!
                  </p>
                  <p className="text-gray-600">
                    We've sent a verification email to your inbox. Please click the verification link to verify your email address.
                  </p>
                  <p className="text-gray-600">
                    After verification, you'll proceed to complete your membership payment and then you can start connecting with voice artists worldwide.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-gray-700 font-medium">
                    Your account has been created successfully!
                  </p>
                  <p className="text-gray-600">
                    We've sent a verification email to your inbox. Please click the verification link to verify your email address.
                  </p>
                  <p className="text-gray-600">
                    After verification, sign in to complete your studio profile from your dashboard and turn visibility on when you're ready to go live.
                  </p>
                </div>
              )}
            </div>

            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div className="text-sm text-red-800 text-left">
                    <p className="font-medium">Verification Error</p>
                    <p className="mt-1">
                      {error === 'invalid_token' && 'Invalid verification link. Please request a new verification email.'}
                      {error === 'token_expired' && 'Verification link has expired. Please request a new verification email.'}
                      {error === 'verification_failed' && 'Verification failed. Please try again or contact support.'}
                      {!['invalid_token', 'token_expired', 'verification_failed'].includes(error) && 'An error occurred during verification.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div className="text-sm text-green-800 text-left">
                    <p className="font-medium">Verification email sent successfully!</p>
                    <p className="mt-1">
                      If you don't see the email in your inbox within a few minutes, please check your spam or junk folder.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-900 text-left space-y-2">
                <p className="font-semibold">What happens next:</p>
                {flow === 'profile' ? (
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Check your email and click the verification link</li>
                    <li>Your email address will be verified</li>
                    <li>Sign in with your credentials</li>
                    <li>Your studio profile will be live!</li>
                  </ol>
                ) : flow === 'signup' ? (
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Check your email and click the verification link</li>
                    <li>Your email address will be verified</li>
                    <li>Complete your membership payment</li>
                    <li>Start connecting with voice artists worldwide</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Check your email and click the verification link</li>
                    <li>Your email address will be verified</li>
                    <li>Sign in with your credentials</li>
                    <li>Complete your studio profile from the dashboard</li>
                    <li>Turn visibility on when you're ready to go live</li>
                  </ol>
                )}
              </div>
            </div>

            {resendMessage && (
              <div className={`p-4 rounded-md ${
                resendMessage.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <p className="text-sm font-medium">{resendMessage.text}</p>
              </div>
            )}

            <div className="space-y-4">
              <Button
                onClick={handleCheckStatus}
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={isCheckingStatus}
              >
                {isCheckingStatus ? 'Checking...' : 'I\'ve Verified My Email - Continue to Payment'}
              </Button>

              <Button
                onClick={handleResendEmail}
                variant="outline"
                className="w-full"
                disabled={isResending}
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              
              <Button
                onClick={() => window.location.href = '/auth/signin'}
                variant="outline"
                className="w-full"
              >
                Go to Sign In
              </Button>
            </div>

            <div className="text-xs text-gray-600">
              <p>
                Having trouble? Contact our{' '}
                <a href="/help" className="text-red-600 hover:text-red-700 font-medium">
                  support team
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
