'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signinSchema, type SigninInput } from '@/lib/validations/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff, Mail } from 'lucide-react';

export function SigninForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
  const verified = searchParams?.get('verified') === 'true';
  const alreadyVerified = searchParams?.get('already') === 'true';
  const verificationError = searchParams?.get('error');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map verification errors to user-friendly messages
  const getVerificationErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'invalid_token':
        return 'Invalid or expired verification link. Please request a new one.';
      case 'token_expired':
        return 'Your verification link has expired. Please request a new one.';
      case 'verification_failed':
        return 'Email verification failed. Please try again or contact support.';
      default:
        return null;
    }
  };

  const verificationErrorMessage = getVerificationErrorMessage(verificationError);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SigninInput>({
    resolver: zodResolver(signinSchema),
  });

  const onSubmit = async (data: SigninInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        return;
      }

      if (result?.ok) {
        // Special redirect for admin@mpdee.co.uk
        if (data.email === 'admin@mpdee.co.uk') {
          router.push('/admin');
        } else {
          router.push(callbackUrl);
        }
        router.refresh();
      }
    } catch {
      setError('An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary">Welcome Back</h1>
        <p className="mt-2 text-text-secondary">
          Sign in to your Voiceover Studio Finder account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {verified && !alreadyVerified && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700 font-medium">
              ✓ Email address verified! You can now sign in below.
            </p>
          </div>
        )}

        {alreadyVerified && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700 font-medium">
              ℹ️ Your email was already verified. You can sign in below.
            </p>
          </div>
        )}

        {verificationErrorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700 font-medium">
              ✕ {verificationErrorMessage}
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="relative">
          <Input
            label="Email Address"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message || ''}
            {...register('email')}
          />
          <Mail className="absolute right-3 top-9 h-5 w-5 text-text-secondary" />
        </div>

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            error={errors.password?.message || ''}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 h-5 w-5 text-text-secondary hover:text-text-primary"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-form-border rounded"
              {...register('remember')}
            />
            <label htmlFor="remember" className="ml-2 text-sm text-text-secondary">
              Remember me
            </label>
          </div>
          
          <a
            href="/auth/forgot-password"
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Forgot password?
          </a>
        </div>

        <Button
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700"
          loading={isLoading}
          disabled={isLoading}
        >
          Sign In
        </Button>

        <div className="text-center">
          <p className="text-sm text-text-secondary">
            Don't have an account?{' '}
            <a
              href="/auth/signup"
              className="font-medium text-red-600 hover:text-red-700"
            >
              Sign up
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
