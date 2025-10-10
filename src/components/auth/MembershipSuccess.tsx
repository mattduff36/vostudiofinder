'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Check, Crown, Eye, EyeOff } from 'lucide-react';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';

export function MembershipSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  
  const sessionId = searchParams?.get('session_id');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  // Verify payment on component mount
  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError('No payment session found');
        return;
      }

      try {
        const response = await fetch('/api/stripe/verify-membership-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Payment verification failed');
        }

        // Get signup data from sessionStorage
        const signupDataStr = sessionStorage.getItem('signupData');
        if (signupDataStr) {
          const signupData = JSON.parse(signupDataStr);
          setValue('email', signupData.email);
          setValue('displayName', signupData.displayName);
          setValue('password', signupData.password);
          setValue('confirmPassword', signupData.password);
        } else if (result.customerData) {
          // Fallback to payment data if no session data
          setValue('email', result.customerData.email);
          setValue('displayName', result.customerData.name);
        }

        // Store username for account creation
        if (result.customerData?.username) {
          sessionStorage.setItem('selectedUsername', result.customerData.username);
        }

        setPaymentVerified(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Payment verification failed');
      }
    };

    verifyPayment();
  }, [sessionId, setValue]);

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get username from session storage
      const username = sessionStorage.getItem('selectedUsername') || '';

      const response = await fetch('/api/auth/create-paid-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          username,
          sessionId, // Include session ID for final verification
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Account creation failed');
      }

      // Clear signup data from session storage
      sessionStorage.removeItem('signupData');
      sessionStorage.removeItem('selectedUsername');

      // Redirect to verification or dashboard
      router.push('/auth/verify-email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!paymentVerified && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <Crown className="w-16 h-16 text-primary-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900">
              Verifying Payment...
            </h1>
            <p className="mt-2 text-gray-600">
              Please wait while we confirm your membership payment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Verification Failed
              </h1>
              <p className="text-red-600 mb-6">{error}</p>
              <Button
                onClick={() => router.push('/auth/signup')}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Payment Successful!
          </h1>
          <p className="mt-2 text-gray-600">
            Your membership is active. Complete your account setup below.
          </p>
        </div>

        {/* Account Setup Form */}
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className="mt-1"
                disabled // Pre-filled from payment
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                Display Name
              </label>
              <Input
                id="displayName"
                type="text"
                {...register('displayName')}
                className="mt-1"
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600">{errors.displayName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="acceptTerms"
                type="checkbox"
                {...register('acceptTerms')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="acceptTerms" className="ml-2 block text-sm text-gray-900">
                I accept the{' '}
                <a href="/terms" className="text-primary-600 hover:text-primary-500">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-primary-600 hover:text-primary-500">
                  Privacy Policy
                </a>
              </label>
            </div>
            {errors.acceptTerms && (
              <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={isLoading}
            >
              Complete Account Setup
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
