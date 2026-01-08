'use client';

import { AlertCircle, CreditCard, RefreshCw, Mail, Shield, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface SignupErrorAlertProps {
  error: string;
  onDismiss?: () => void;
}

const errorConfig: Record<string, {
  title: string;
  message: string;
  icon: React.ReactNode;
  actions: Array<{ label: string; href?: string; onClick?: () => void; variant?: 'primary' | 'secondary' }>;
  severity: 'error' | 'warning' | 'info';
}> = {
  payment_not_found: {
    title: 'Payment Verification Failed',
    message: 'We couldn\'t find your payment record. This usually happens when the payment is still processing or the webhook hasn\'t been received yet.',
    icon: <CreditCard className="h-5 w-5" />,
    actions: [
      { label: 'Check Payment Status', href: '/auth/membership', variant: 'primary' },
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

export function SignupErrorAlert({ error, onDismiss }: SignupErrorAlertProps) {
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

  const bgColor = config.severity === 'error' 
    ? 'bg-red-50 border-red-200' 
    : config.severity === 'warning'
    ? 'bg-yellow-50 border-yellow-200'
    : 'bg-blue-50 border-blue-200';

  const textColor = config.severity === 'error'
    ? 'text-red-800'
    : config.severity === 'warning'
    ? 'text-yellow-800'
    : 'text-blue-800';

  const iconColor = config.severity === 'error'
    ? 'text-red-600'
    : config.severity === 'warning'
    ? 'text-yellow-600'
    : 'text-blue-600';

  return (
    <div className={`${bgColor} border rounded-lg p-6 mb-6 relative`}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <XCircle className="h-5 w-5" />
        </button>
      )}
      
      <div className="flex items-start space-x-4">
        <div className={`flex-shrink-0 ${iconColor}`}>
          {config.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-semibold ${textColor} mb-2`}>
            {config.title}
          </h3>
          
          <p className={`text-sm ${textColor} mb-4`}>
            {config.message}
          </p>
          
          <div className="flex flex-wrap gap-3">
            {config.actions.map((action, index) => (
              action.href ? (
                <Link key={index} href={action.href}>
                  <Button
                    variant={action.variant === 'primary' ? 'default' : 'outline'}
                    className={action.variant === 'primary' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    {action.label}
                  </Button>
                </Link>
              ) : (
                <Button
                  key={index}
                  variant={action.variant === 'primary' ? 'default' : 'outline'}
                  onClick={action.onClick}
                  className={action.variant === 'primary' ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  {action.label}
                </Button>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

