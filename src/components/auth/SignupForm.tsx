'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff, Mail } from 'lucide-react';

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const display_name = data.display_name ?? data.email.split('@')[0];
      
      // Create PENDING user account immediately
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          display_name: display_name,
        }),
      });

      const registerResult = await registerResponse.json();

      if (!registerResponse.ok) {
        setError(registerResult.error || 'Failed to create account');
        return;
      }

      const userId = registerResult.user?.id;
      if (!userId) {
        setError('Failed to create account');
        return;
      }

      console.log(`✅ PENDING user created: ${userId}`);

      // Store signup data with userId in session storage
      sessionStorage.setItem('signupData', JSON.stringify({
        userId,
        email: data.email,
        password: data.password,
        display_name: display_name,
        reservation_expires_at: registerResult.user.reservation_expires_at,
      }));

      // Check if display name has spaces
      const hasSpaces = /\s/.test(display_name);
      
      if (hasSpaces) {
        // Redirect to username selection page
        router.push(`/auth/username-selection?display_name=${encodeURIComponent(display_name)}`);
      } else {
        // No spaces - check if username is available
        const response = await fetch('/api/auth/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: display_name }),
        });

        const result = await response.json();

        if (result.available) {
          // Reserve the username immediately
          const reserveResponse = await fetch('/api/auth/reserve-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              username: display_name,
            }),
          });

          if (!reserveResponse.ok) {
            const reserveResult = await reserveResponse.json();
            
            // Handle expired reservation
            if (reserveResponse.status === 410) {
              setError('Your reservation has expired. Please sign up again.');
              sessionStorage.removeItem('signupData');
              return;
            }
            
            // For other errors, go to username selection
            router.push(`/auth/username-selection?display_name=${encodeURIComponent(display_name)}`);
            return;
          }

          // Username reserved - proceed directly to membership
          const params = new URLSearchParams();
          params.set('userId', userId);
          params.set('email', data.email);
          params.set('name', display_name);
          params.set('username', display_name);
          
          router.push(`/auth/membership?${params.toString()}`);
        } else {
          // Username taken - go to username selection
          router.push(`/auth/username-selection?display_name=${encodeURIComponent(display_name)}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary">List Your Studio</h1>
        <p className="mt-2 text-text-secondary">
          Start your membership to showcase your studio to voice artists worldwide
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        <Input
          label="Display Name"
          type="text"
          placeholder="e.g. John Smith or Smith Studios"
          error={errors.display_name?.message || ''}
          {...register('display_name')}
        />

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
            placeholder="Create a strong password"
            error={errors.password?.message || ''}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 h-5 w-5 text-text-secondary hover:text-text-primary"
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>

        <div className="relative">
          <Input
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            error={errors.confirmPassword?.message || ''}
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-9 h-5 w-5 text-text-secondary hover:text-text-primary"
          >
            {showConfirmPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>

        <div className="flex items-start space-x-2">
          <input
            type="checkbox"
            id="acceptTerms"
            className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-form-border rounded"
            {...register('acceptTerms')}
          />
          <label htmlFor="acceptTerms" className="text-sm text-text-secondary">
            I accept the{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700 font-medium">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700 font-medium">
              Privacy Policy
            </a>
          </label>
        </div>
        {errors.acceptTerms && (
          <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>
        )}

        <Button
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700"
          loading={isLoading}
          disabled={isLoading}
        >
          Continue to Membership
        </Button>

        <div className="text-center">
          <p className="text-sm text-text-secondary">
            Already have an account?{' '}
            <a
              href="/auth/signin"
              className="font-medium text-red-600 hover:text-red-700"
            >
              Sign in
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
