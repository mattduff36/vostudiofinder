'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setIsTokenValid(false);
      setError('Invalid or missing reset token');
      return;
    }

    // Token presence is validated on form submission
    // We'll show the form and validate the token when they submit
    setIsTokenValid(true);
  }, [token]);

  const onSubmit = async (data: ResetPasswordInput) => {
    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      setSuccess(true);
      
      // Redirect to sign in after 3 seconds
      setTimeout(() => {
        router.push('/auth/signin?reset=success');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Show error if no token
  if (isTokenValid === false) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary">Invalid Link</h1>
          <p className="mt-2 text-text-secondary">
            This password reset link is invalid or has expired.
          </p>
        </div>

        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>

        <div className="text-center">
          <a
            href="/auth/forgot-password"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Request a new reset link
          </a>
        </div>
      </div>
    );
  }

  // Show success message
  if (success) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Password Reset Successful!</h1>
          <p className="mt-2 text-text-secondary">
            Your password has been updated successfully.
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            Redirecting you to sign in...
          </p>
        </div>

        <div className="text-center">
          <a
            href="/auth/signin"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  // Show reset password form
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary">Set New Password</h1>
        <p className="mt-2 text-text-secondary">
          Enter your new password below
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="relative">
          <Input
            label="New Password"
            type="password"
            placeholder="Enter new password"
            error={errors.password?.message || ''}
            {...register('password')}
          />
          <Lock className="absolute right-3 top-9 h-5 w-5 text-text-secondary" />
        </div>

        <div className="relative">
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Confirm new password"
            error={errors.confirmPassword?.message || ''}
            {...register('confirmPassword')}
          />
          <Lock className="absolute right-3 top-9 h-5 w-5 text-text-secondary" />
        </div>

        <div className="text-xs text-text-secondary space-y-1 mt-2">
          <p>Password must contain:</p>
          <ul className="list-disc list-inside pl-2">
            <li>At least 8 characters</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
          </ul>
        </div>

        <Button
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700"
          loading={isLoading}
          disabled={isLoading}
        >
          Reset Password
        </Button>

        <div className="text-center">
          <a
            href="/auth/signin"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Sign In
          </a>
        </div>
      </form>
    </div>
  );
}
