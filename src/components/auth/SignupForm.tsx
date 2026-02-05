'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff, Mail, Shield } from 'lucide-react';
import { ResumeSignupBanner } from './ResumeSignupBanner';
import { SignupProgressIndicator } from './SignupProgressIndicator';
import { storeSignupData } from '@/lib/signup-recovery';

// Declare Turnstile types
declare global {
  interface Window {
    turnstile?: {
      render: (element: string | HTMLElement, options: {
        sitekey: string;
        callback?: (token: string) => void;
        'error-callback'?: () => void;
        'expired-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact';
      }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface PendingSignupData {
  canResume: boolean;
  resumeStep: 'username' | 'payment' | 'profile';
  hasUsername: boolean;
  hasPayment: boolean;
  sessionId?: string | null; // Stripe checkout session ID for payment verification
  user: {
    id: string;
    email: string;
    username: string | null;
    display_name: string;
    reservation_expires_at: Date | null;
  };
  timeRemaining: {
    days: number;
    hours: number;
    total: number;
  };
}

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingSignup, setPendingSignup] = useState<PendingSignupData | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [formLoadTime] = useState(Date.now());
  const [turnstileConfigError, setTurnstileConfigError] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const emailValue = watch('email');

  // Check if Turnstile is configured
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

  // Load Turnstile script
  useEffect(() => {
    // In development mode, always bypass Turnstile (even if configured)
    if (isDevelopment) {
      console.warn('[Turnstile] Development mode: bypassing security check');
      setTurnstileToken('dev-bypass-token');
      setTurnstileConfigError('Development mode: Security check bypassed for testing');
      return;
    }

    // Check if Turnstile site key is configured
    if (!turnstileSiteKey) {
      const errorMsg = 'Security verification is not configured. Please contact support.';
      setTurnstileConfigError(errorMsg);
      console.error('[Turnstile] Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (turnstileRef.current && window.turnstile) {
        try {
          turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
            sitekey: turnstileSiteKey,
            callback: (token: string) => {
              setTurnstileToken(token);
              setTurnstileConfigError(null);
            },
            'error-callback': () => {
              setTurnstileToken(null);
              setTurnstileConfigError('Security verification failed. Please refresh the page and try again.');
            },
            'expired-callback': () => {
              setTurnstileToken(null);
              setTurnstileConfigError('Security verification expired. Please complete it again.');
            },
            theme: 'light',
            size: 'normal',
          });
        } catch (err) {
          console.error('Failed to render Turnstile:', err);
          setTurnstileConfigError('Failed to load security verification. Please refresh the page.');
        }
      }
    };
    
    script.onerror = () => {
      console.error('Failed to load Turnstile script');
      setTurnstileConfigError('Failed to load security verification. Please check your internet connection and refresh.');
    };
    
    document.head.appendChild(script);

    return () => {
      // Cleanup: remove widget and script
      if (turnstileWidgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetId.current);
        } catch (err) {
          console.error('Failed to remove Turnstile widget:', err);
        }
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [turnstileSiteKey, isDevelopment]);

  // Check for existing PENDING signup when email is entered
  useEffect(() => {
    const checkExistingSignup = async () => {
      if (!emailValue || emailValue.length < 5 || !emailValue.includes('@')) {
        setPendingSignup(null);
        return;
      }

      try {
        const response = await fetch('/api/auth/check-signup-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailValue }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.canResume) {
            setPendingSignup(data);
          } else {
            setPendingSignup(null);
          }
        }
      } catch (err) {
        console.error('Error checking signup status:', err);
      }
    };

    const debounceTimer = setTimeout(checkExistingSignup, 500);
    return () => clearTimeout(debounceTimer);
  }, [emailValue]);

  const handleResume = () => {
    if (!pendingSignup) return;

    // Store data in sessionStorage for resume (includes timestamp)
    storeSignupData({
      userId: pendingSignup.user.id,
      email: pendingSignup.user.email,
      display_name: pendingSignup.user.display_name,
      reservation_expires_at: pendingSignup.user.reservation_expires_at,
    });

    // Navigate to appropriate step
    if (pendingSignup.resumeStep === 'username') {
      router.push(`/auth/username-selection?display_name=${encodeURIComponent(pendingSignup.user.display_name)}`);
    } else if (pendingSignup.resumeStep === 'payment') {
      const params = new URLSearchParams();
      params.set('userId', pendingSignup.user.id);
      params.set('email', pendingSignup.user.email);
      params.set('name', pendingSignup.user.display_name);
      params.set('username', pendingSignup.user.username || '');
      router.push(`/auth/membership?${params.toString()}`);
    } else if (pendingSignup.resumeStep === 'profile') {
      // Navigate to profile creation with session_id for payment verification
      const params = new URLSearchParams();
      if (pendingSignup.sessionId) {
        params.set('session_id', pendingSignup.sessionId);
      }
      params.set('email', pendingSignup.user.email);
      params.set('name', pendingSignup.user.display_name);
      if (pendingSignup.user.username) {
        params.set('username', pendingSignup.user.username);
      }
      router.push(`/auth/membership/success?${params.toString()}`);
    }
  };

  const handleStartFresh = async () => {
    if (!pendingSignup) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // Call API to mark existing PENDING user as EXPIRED on the backend
      const response = await fetch('/api/auth/expire-pending-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingSignup.user.email }),
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result.error || 'Failed to expire existing account');
        return;
      }

      console.log(`[SUCCESS] Existing PENDING account expired for: ${pendingSignup.user.email}`);
      
      // Clear UI state - user can now start fresh signup
      setPendingSignup(null);
    } catch (err) {
      console.error('Error expiring pending user:', err);
      setError('Failed to expire existing account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Check minimum time (honeypot timing check)
    const timeSinceLoad = Date.now() - formLoadTime;
    if (timeSinceLoad < 800) {
      setError('Please slow down and try again');
      setIsLoading(false);
      return;
    }

    // Validate Turnstile token (unless in development mode with bypass)
    if (!turnstileToken) {
      if (turnstileConfigError && !isDevelopment) {
        setError(turnstileConfigError);
      } else {
        setError('Please complete the security check');
      }
      setIsLoading(false);
      return;
    }

    try {
      const display_name = data.display_name ?? data.email.split('@')[0];
      
      // Create PENDING user account immediately (or get resume info)
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          display_name: display_name,
          turnstileToken, // Include Turnstile token
          website: honeypotRef.current?.value || '', // Include honeypot field
        }),
      });

      const registerResult = await registerResponse.json();

      // Check if this is a resume scenario
      if (registerResponse.ok && registerResult.canResume) {
        setPendingSignup(registerResult);
        return;
      }

      if (!registerResponse.ok) {
        setError(registerResult.error || 'Failed to create account');
        return;
      }

      const userId = registerResult.user?.id;
      if (!userId) {
        setError('Failed to create account');
        return;
      }

      console.log(`[SUCCESS] PENDING user created: ${userId}`);

      // Store signup data with userId in session storage (includes timestamp)
      storeSignupData({
        userId,
        email: data.email,
        password: data.password,
        display_name: display_name,
        reservation_expires_at: registerResult.user.reservation_expires_at,
      });

      // Check if display name has spaces - determines if username selection is needed
      const hasSpaces = /\s/.test(display_name);
      
      if (hasSpaces) {
        // Redirect to username selection page (will redirect to verify-email after)
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
            // Handle expired reservation
            if (reserveResponse.status === 410) {
              setError('Your reservation has expired. Please sign up again.');
              return;
            }
            
            // For other errors, go to username selection
            router.push(`/auth/username-selection?display_name=${encodeURIComponent(display_name)}`);
            return;
          }

          // Username reserved - proceed to email verification
          router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}&flow=signup`);
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
    <>
      {/* Render modal separately from form */}
      {pendingSignup && (
        <ResumeSignupBanner
          resumeStep={pendingSignup.resumeStep}
          timeRemaining={pendingSignup.timeRemaining}
          onResume={handleResume}
          onStartFresh={handleStartFresh}
          isLoading={isLoading}
        />
      )}

      <div className="w-full max-w-2xl space-y-6">
        <SignupProgressIndicator currentStep="signup" />
        
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
          placeholder="Your Display Name is how we address you"
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
            tabIndex={100}
            aria-label="Toggle password visibility"
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
            tabIndex={101}
            aria-label="Toggle confirm password visibility"
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

        {/* Honeypot field (hidden from real users, bots will fill it) */}
        <input
          ref={honeypotRef}
          type="text"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          style={{
            position: 'absolute',
            left: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0,
          }}
          aria-hidden="true"
        />

        {/* Turnstile CAPTCHA */}
        <div className="flex flex-col items-center space-y-2 py-2">
          <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
            <Shield className="w-4 h-4" />
            <span>Security verification</span>
          </div>
          
          {turnstileConfigError ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md w-full">
              <p className="text-sm text-red-600 text-center">{turnstileConfigError}</p>
              {isDevelopment && (
                <p className="text-xs text-red-500 text-center mt-2">
                  Development mode: Security check bypassed for testing
                </p>
              )}
            </div>
          ) : (
            <>
              <div ref={turnstileRef} className="flex justify-center" />
              {!turnstileToken && (
                <p className="text-xs text-text-secondary text-center">
                  Complete the security check above to continue
                </p>
              )}
            </>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700"
          loading={isLoading}
          disabled={isLoading || !turnstileToken}
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
    </>
  );
}
