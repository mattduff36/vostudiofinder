'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Check, Loader2 } from 'lucide-react';
import { SignupProgressIndicator } from './SignupProgressIndicator';
import { usePreventBackNavigation } from '@/hooks/usePreventBackNavigation';
import { getSignupData, storeSignupData } from '@/lib/signup-recovery';
import { validateUsername } from '@/lib/utils/username';

interface UsernameSuggestion {
  username: string;
  available: boolean;
}

interface UsernameSelectionFormProps {
  initialEmail?: string;
  initialDisplayName?: string;
}

export function UsernameSelectionForm({
  initialEmail = '',
  initialDisplayName = '',
}: UsernameSelectionFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const display_name = initialDisplayName || searchParams?.get('display_name') || '';
  const emailFromQuery = initialEmail || searchParams?.get('email') || '';

  const [suggestions, setSuggestions] = useState<UsernameSuggestion[]>([]);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [customUsername, setCustomUsername] = useState('');
  const [isCheckingCustom, setIsCheckingCustom] = useState(false);
  const [customAvailable, setCustomAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [owner, setOwner] = useState<{ userId: string; email: string; displayName: string } | null>(null);

  // Enable back button protection
  usePreventBackNavigation({
    enabled: true,
    warningMessage: 'Your username selection is in progress. Are you sure you want to leave?',
    onBackAttempt: () => {
      console.log('[WARNING] User attempted to navigate back from username selection');
    },
  });

  useEffect(() => {
    let cancelled = false;

    const resume = async () => {
      const signupData = getSignupData();
      const email = emailFromQuery || signupData?.email || '';

      if (!email) {
        setError('Session expired. Please start the signup process again.');
        setIsLoading(false);
        return;
      }

      if (display_name) {
        fetchSuggestions();
      } else if (!cancelled) {
        setIsLoading(false);
      }

      try {
        const response = await fetch('/api/auth/check-signup-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const statusData = await response.json();
        if (cancelled) return;

        if (response.ok && statusData.canResume && statusData.user?.id) {
          const nextOwner = {
            userId: statusData.user.id,
            email: statusData.user.email,
            displayName: display_name || statusData.user.display_name,
          };
          setOwner(nextOwner);
          storeSignupData({
            userId: nextOwner.userId,
            email: nextOwner.email,
            display_name: nextOwner.displayName,
            username: statusData.user.username || undefined,
            reservation_expires_at: statusData.user.reservation_expires_at,
          });

          if (statusData.hasUsername && statusData.user.username) {
            const params = new URLSearchParams();
            params.set('userId', nextOwner.userId);
            params.set('email', nextOwner.email);
            params.set('name', nextOwner.displayName);
            params.set('username', statusData.user.username);
            router.push(`/auth/membership?${params.toString()}`);
          }
          return;
        }

        if (signupData?.userId) {
          setOwner({
            userId: signupData.userId,
            email: signupData.email,
            displayName: display_name || signupData.display_name,
          });
          return;
        }

        setError(statusData.error || statusData.message || 'Unable to resume username selection.');
      } catch (err) {
        console.error('Error checking existing username:', err);
        if (!cancelled) {
          setError('Unable to resume username selection.');
        }
      }
    };

    resume();
    return () => {
      cancelled = true;
    };
    // fetchSuggestions is recreated each render; resume runs when the identity inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display_name, emailFromQuery, router]);

  const fetchSuggestions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name }),
      });

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      
      // Auto-select first available username
      const firstAvailable = data.suggestions?.find((s: UsernameSuggestion) => s.available);
      if (firstAvailable) {
        setSelectedUsername(firstAvailable.username);
      }
    } catch (err) {
      setError('Failed to load username suggestions');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkCustomUsername = async (username: string) => {
    if (!username || username.length < 3) {
      setCustomAvailable(null);
      return;
    }

    setIsCheckingCustom(true);
    try {
      const response = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();
      setCustomAvailable(data.available);
      
      if (data.available) {
        setSelectedUsername(username);
      }
    } catch (err) {
      console.error(err);
      setCustomAvailable(false);
    } finally {
      setIsCheckingCustom(false);
    }
  };

  useEffect(() => {
    if (!customUsername) {
      setCustomAvailable(null);
      return undefined;
    }

    const validation = validateUsername(customUsername);
    if (!validation.ok) {
      setCustomAvailable(null);
      setSelectedUsername((current) => (current === customUsername ? '' : current));
      return undefined;
    }

    const timer = setTimeout(() => {
      checkCustomUsername(validation.username);
    }, 500);
    return () => clearTimeout(timer);
  }, [customUsername]);

  const customValidation = customUsername ? validateUsername(customUsername) : null;
  const customFormatError = customValidation && !customValidation.ok ? customValidation.message : '';

  const handleContinue = async () => {
    const validation = validateUsername(customUsername || selectedUsername);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    if (customUsername && (isCheckingCustom || customAvailable !== true || selectedUsername !== validation.username)) {
      setError('Please wait for username availability to be confirmed.');
      return;
    }

    const signupData = owner || (getSignupData()
      ? {
          userId: getSignupData()!.userId,
          email: getSignupData()!.email,
          displayName: getSignupData()!.display_name,
        }
      : null);

    if (!signupData?.userId || !signupData.email) {
      setError('Enter the email from your signup to continue.');
      return;
    }

    const userId = signupData.userId;

    setIsLoading(true);
    setError(null);

    try {
      // Reserve the username for this user
      const response = await fetch('/api/auth/reserve-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email: signupData.email,
          username: validation.username,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 410) {
          // Reservation expired
          setError('Your reservation has expired. Please sign up again.');
          setTimeout(() => router.push('/auth/signup'), 2000);
          return;
        }

        if (response.status === 409) {
          // Username taken
          setError('Username is no longer available. Please select another.');
          return;
        }

        setError(result.error || 'Failed to reserve username');
        return;
      }

      console.log(`[SUCCESS] Username reserved: @${validation.username}`);

      storeSignupData({
        userId,
        email: signupData.email,
        display_name: signupData.displayName,
        username: validation.username,
      });

      // Navigate to email verification before payment
      router.push(`/auth/verify-email?email=${encodeURIComponent(signupData.email)}&flow=signup`);
    } catch (err) {
      console.error('Username reservation error:', err);
      setError('Failed to reserve username. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      <SignupProgressIndicator currentStep="username" />
      
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary">Choose Your Username</h1>
        <p className="mt-2 text-text-secondary">
          Your username will be your profile URL: <span className="font-mono text-sm">voiceoverstudiofinder.com/<span className="text-red-600 font-semibold">{selectedUsername || 'username'}</span></span>
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Suggested usernames:</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-red-600" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.username}
                  onClick={() => {
                    if (suggestion.available) {
                      setSelectedUsername(suggestion.username);
                      setCustomUsername('');
                      setCustomAvailable(null);
                    }
                  }}
                  disabled={!suggestion.available}
                  className={`
                    relative p-3 rounded-lg border-2 text-left transition-all
                    ${suggestion.available
                      ? 'border-gray-200 hover:border-red-500 cursor-pointer'
                      : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                    }
                    ${selectedUsername === suggestion.username
                      ? 'border-red-600 bg-red-50'
                      : ''
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{suggestion.username}</span>
                    {selectedUsername === suggestion.username && (
                      <Check className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  {!suggestion.available && (
                    <span className="text-xs text-gray-500">Taken</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-text-secondary">Or enter your own</span>
          </div>
        </div>

        <div>
          <div className="relative">
            <Input
              label="Custom Username"
              type="text"
              value={customUsername}
              onChange={(e) => setCustomUsername(e.target.value)}
              placeholder="YourUsername"
              error={customFormatError}
            />
            {isCheckingCustom && (
              <Loader2 className="absolute right-3 top-9 w-5 h-5 animate-spin text-gray-400" />
            )}
            {!isCheckingCustom && customAvailable === true && (
              <Check className="absolute right-3 top-9 w-5 h-5 text-green-600" />
            )}
            {!isCheckingCustom && customAvailable === false && (
              <span className="absolute right-3 top-9 text-xs text-red-600">Taken</span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            3-20 characters, letters, numbers, and underscores only
          </p>
        </div>
      </div>

      <Button
        onClick={handleContinue}
        className="w-full bg-red-600 hover:bg-red-700"
        disabled={!selectedUsername || Boolean(customFormatError) || Boolean(customUsername && (isCheckingCustom || customAvailable !== true || selectedUsername !== customUsername.trim()))}
      >
        Continue to Membership
      </Button>

      <div className="text-center">
        <button
          onClick={() => router.push('/auth/signup')}
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          ← Back to signup
        </button>
      </div>
    </div>
  );
}

