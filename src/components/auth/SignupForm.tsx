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
      // Redirect to membership payment page with user data
      const params = new URLSearchParams();
      params.set('email', data.email);
      params.set('name', data.displayName ?? data.email.split('@')[0]);
      
      router.push(`/auth/membership?${params.toString()}`);
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
          label="Your Name"
          type="text"
          placeholder="e.g. John Smith or Smith Studios"
          error={errors.displayName?.message || ''}
          {...register('displayName')}
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
            className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-form-border rounded"
            {...register('acceptTerms')}
          />
          <label htmlFor="acceptTerms" className="text-sm text-text-secondary">
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
          Continue to Membership
        </Button>

        <div className="text-center">
          <p className="text-sm text-text-secondary">
            Already have an account?{' '}
            <a
              href="/auth/signin"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign in
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
