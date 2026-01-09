'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CreditCard, Mail, Shield, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import Link from 'next/link';
import { getSignupData } from '@/lib/signup-recovery';

interface SignupErrorAlertProps {
  error: string;
}

const errorConfig: Record<string, {
  title: string;
  message: string;
  icon: React.ReactNode;
  actions: Array<{ label: string; href?: string; onClick?: (() => void) | string; variant?: 'primary' | 'secondary' }>;
  severity: 'error' | 'warning' | 'info';
}> = {
  payment_not_found: {
    title: 'Payment Verification Failed',
    message: 'We couldn\'t find your payment record. This usually happens when the payment is still processing or the webhook hasn\'t been received yet.',
    icon: <CreditCard className="h-5 w-5" />,
    actions: [
      { label: 'Check Payment Status', onClick: 'checkPaymentStatus', variant: 'primary' },
      { label: 'Contact Support', href: '/contact', variant: 'secondary' },
    ],
    severity: 'warning',
  },
  payment_not_completed: {
    title: 'Payment Not Completed',
    message: 'Your payment was not successfully completed. Please try again or contact support if you were charged.',
    icon: <CreditCard className="h-5 w-5" />,
    actions: [
      { label: 'Try Payment Again', href: '/auth/membership', variant: 'primary' },
      { label: 'Contact Support', href: '/contact', variant: 'secondary' },
    ],
    severity: 'error',
  },
  verification_failed: {
    title: 'Verification Failed',
    message: 'We encountered an error verifying your payment. This could be due to a temporary issue. Please try again or contact support if the problem persists.',
    icon: <Shield className="h-5 w-5" />,
    actions: [
      { label: 'Try Again', href: '/auth/signup', variant: 'primary' },
      { label: 'Contact Support', href: '/contact', variant: 'secondary' },
    ],
    severity: 'error',
  },
  invalid_user_status: {
    title: 'Account Status Issue',
    message: 'Your account is not in the correct state to complete this step. Please sign in or start a new signup.',
    icon: <AlertCircle className="h-5 w-5" />,
    actions: [
      { label: 'Sign In', href: '/auth/signin', variant: 'primary' },
      { label: 'Start New Signup', href: '/auth/signup', variant: 'secondary' },
    ],
    severity: 'warning',
  },
  email_mismatch: {
    title: 'Email Verification Failed',
    message: 'The email address doesn\'t match the payment record. Please use the same email address you used for payment.',
    icon: <Mail className="h-5 w-5" />,
    actions: [
      { label: 'Sign In', href: '/auth/signin', variant: 'primary' },
      { label: 'Contact Support', href: '/contact', variant: 'secondary' },
    ],
    severity: 'error',
  },
  access_denied: {
    title: 'Access Denied',
    message: 'You don\'t have permission to access this page. Please sign in or start the signup process.',
    icon: <XCircle className="h-5 w-5" />,
    actions: [
      { label: 'Sign In', href: '/auth/signin', variant: 'primary' },
      { label: 'Start Signup', href: '/auth/signup', variant: 'secondary' },
    ],
    severity: 'error',
  },
};

export function SignupErrorAlert({ error }: SignupErrorAlertProps) {
  const router = useRouter();
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  
  const config = errorConfig[error] || {
    title: 'An Error Occurred',
    message: 'We encountered an unexpected error. Please try again or contact support if the problem persists.',
    icon: <AlertCircle className="h-5 w-5" />,
    actions: [
      { label: 'Try Again', href: '/auth/signup', variant: 'primary' },
      { label: 'Contact Support', href: '/contact', variant: 'secondary' },
    ],
    severity: 'error',
  };

  const handleCheckPaymentStatus = async () => {
    setIsCheckingPayment(true);
    
    try {
      // Get signup data from sessionStorage
      const signupData = getSignupData();
      
      if (!signupData || (!signupData.userId && !signupData.email)) {
        console.error('No signup data found in sessionStorage');
        router.push('/auth/membership');
        return;
      }

      // Check payment status
      const response = await fetch('/api/auth/check-payment-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: signupData.userId,
          email: signupData.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check payment status');
      }

      const data = await response.json();

      // If payment succeeded, redirect to success page
      if (data.hasPayment && data.paymentStatus === 'succeeded' && data.sessionId) {
        const successUrl = `/auth/membership/success?session_id=${data.sessionId}&email=${encodeURIComponent(signupData.email)}&name=${encodeURIComponent(signupData.display_name)}&username=${encodeURIComponent(signupData.username || '')}`;
        router.push(successUrl);
        return;
      }

      // If user is ACTIVE, redirect to dashboard
      if (data.hasPayment && data.paymentStatus === 'succeeded' && data.canResume === false) {
        router.push('/dashboard');
        return;
      }

      // Otherwise, redirect to membership page to retry payment
      router.push(`/auth/membership?userId=${signupData.userId}&email=${encodeURIComponent(signupData.email)}&name=${encodeURIComponent(signupData.display_name)}&username=${encodeURIComponent(signupData.username || '')}`);
    } catch (err) {
      console.error('Error checking payment status:', err);
      // On error, redirect to membership page
      const signupData = getSignupData();
      if (signupData) {
        router.push(`/auth/membership?userId=${signupData.userId}&email=${encodeURIComponent(signupData.email)}&name=${encodeURIComponent(signupData.display_name)}&username=${encodeURIComponent(signupData.username || '')}`);
      } else {
        router.push('/auth/membership');
      }
    } finally {
      setIsCheckingPayment(false);
    }
  };

  return (
    <Modal isOpen={true} preventBackdropClose={true} maxWidth="lg">
      <div className="py-10 px-6 sm:px-12">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3 text-red-600">
            {config.icon}
          </div>
          <h3 className="text-xl font-semibold text-text-primary mb-3">
            {config.title}
          </h3>
          <p className="text-base text-text-secondary max-w-md mx-auto">
            {config.message}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 justify-center">
          {config.actions.map((action, index) => {
            // Handle onClick handlers first (before href check)
            // Use 'in' operator to check for onClick property without TypeScript narrowing issues
            if ('onClick' in action && action.onClick) {
              // Handle special string onClick handlers
              if (action.onClick === 'checkPaymentStatus') {
                return (
                  <Button
                    key={index}
                    variant={action.variant === 'primary' ? 'primary' : 'outline'}
                    onClick={handleCheckPaymentStatus}
                    className="sm:min-w-[180px]"
                    disabled={isCheckingPayment}
                  >
                    {isCheckingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      action.label
                    )}
                  </Button>
                );
              }
              
              // Handle function onClick handlers
              if (typeof action.onClick === 'function') {
                return (
                  <Button
                    key={index}
                    variant={action.variant === 'primary' ? 'primary' : 'outline'}
                    onClick={action.onClick}
                    className="sm:min-w-[180px]"
                    disabled={isCheckingPayment}
                  >
                    {action.label}
                  </Button>
                );
              }
            }
            
            // Handle href-based actions
            if ('href' in action && action.href) {
              return (
                <Link key={index} href={action.href}>
                  <Button
                    variant={action.variant === 'primary' ? 'primary' : 'outline'}
                    className="sm:min-w-[180px]"
                    disabled={isCheckingPayment}
                  >
                    {action.label}
                  </Button>
                </Link>
              );
            }
            
            return null;
          })}
        </div>
      </div>
    </Modal>
  );
}

