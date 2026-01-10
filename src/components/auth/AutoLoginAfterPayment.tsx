'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { signIn } from 'next-auth/react';
import { getSignupData } from '@/lib/signup-recovery';

interface AutoLoginAfterPaymentProps {
  children: React.ReactNode;
}

/**
 * Auto-login wrapper for the payment success page
 * 
 * Automatically signs the user in using credentials stored during signup.
 * Falls back gracefully if no credentials are available (e.g., different device).
 */
export function AutoLoginAfterPayment({ children }: AutoLoginAfterPaymentProps) {
  const { status } = useSession();
  const [isAttemptingLogin, setIsAttemptingLogin] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);

  useEffect(() => {
    // Only attempt auto-login once
    if (loginAttempted) return;

    // Skip if already authenticated
    if (status === 'authenticated') {
      console.log('[AutoLogin] ✅ User already authenticated, skipping auto-login');
      setLoginAttempted(true);
      return;
    }

    // Skip if still loading session
    if (status === 'loading') {
      return;
    }

    // Attempt auto-login if unauthenticated
    const attemptAutoLogin = async () => {
      const timestamp = new Date().toISOString();
      console.log(`[AutoLogin ${timestamp}] ========== AUTO-LOGIN ATTEMPT START ==========`);
      console.log(`[AutoLogin ${timestamp}] Session status: ${status}`);
      
      setIsAttemptingLogin(true);
      setLoginAttempted(true);

      try {
        // Try to get signup data from sessionStorage
        console.log(`[AutoLogin ${timestamp}] Retrieving signup data from sessionStorage...`);
        const signupData = getSignupData();

        if (!signupData) {
          console.log(`[AutoLogin ${timestamp}] ❌ No signup data found in sessionStorage`);
          console.log(`[AutoLogin ${timestamp}] User will need to sign in manually`);
          setIsAttemptingLogin(false);
          return;
        }

        console.log(`[AutoLogin ${timestamp}] ✅ Signup data found:`, {
          userId: signupData.userId,
          email: signupData.email,
          hasPassword: !!signupData.password,
        });

        if (!signupData.password) {
          console.log(`[AutoLogin ${timestamp}] ❌ No password in signup data`);
          console.log(`[AutoLogin ${timestamp}] User will need to sign in manually`);
          setIsAttemptingLogin(false);
          return;
        }

        console.log(`[AutoLogin ${timestamp}] 🔐 Attempting auto-login with stored credentials...`);
        console.log(`[AutoLogin ${timestamp}] Email: ${signupData.email}`);

        const result = await signIn('credentials', {
          redirect: false,
          email: signupData.email,
          password: signupData.password,
        });

        console.log(`[AutoLogin ${timestamp}] Sign-in result:`, {
          ok: result?.ok,
          status: result?.status,
          error: result?.error || 'NONE',
        });

        if (result?.ok) {
          console.log(`[AutoLogin ${timestamp}] ✅ Auto-login successful`);
          
          // Clear password from sessionStorage for security
          console.log(`[AutoLogin ${timestamp}] 🔒 Clearing stored password...`);
          const { password, ...dataWithoutPassword } = signupData;
          try {
            sessionStorage.setItem('signupData', JSON.stringify(dataWithoutPassword));
            console.log(`[AutoLogin ${timestamp}] ✅ Password cleared from sessionStorage`);
          } catch (storageError) {
            console.error(`[AutoLogin ${timestamp}] ❌ Failed to clear password:`, storageError);
          }

          // Optionally refresh the page to update UI with authenticated state
          console.log(`[AutoLogin ${timestamp}] 🔄 Refreshing page to update UI...`);
          window.location.reload();
        } else {
          console.error(`[AutoLogin ${timestamp}] ❌ Auto-login failed:`, result?.error);
          console.log(`[AutoLogin ${timestamp}] User will need to sign in manually`);
        }
      } catch (error) {
        console.error(`[AutoLogin ${timestamp}] ❌ Auto-login error:`, error);
      } finally {
        setIsAttemptingLogin(false);
        console.log(`[AutoLogin ${timestamp}] ========== AUTO-LOGIN ATTEMPT END ==========`);
      }
    };

    attemptAutoLogin();
  }, [status, loginAttempted]);

  // Show loading state while attempting login
  if (isAttemptingLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Signing you in...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
