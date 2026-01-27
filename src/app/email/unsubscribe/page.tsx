'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Mail, CheckCircle, XCircle } from 'lucide-react';

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Invalid unsubscribe link');
      return;
    }

    // Process unsubscribe
    fetch('/api/email/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
          setEmail(data.email);
        } else {
          setStatus('error');
          setError(data.error || 'Failed to unsubscribe');
        }
      })
      .catch(() => {
        setStatus('error');
        setError('Failed to process request');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Mail className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing...</h1>
              <p className="text-gray-600">Please wait while we process your request.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                You've been unsubscribed
              </h1>
              <p className="text-gray-600 mb-6">
                {email && (
                  <>
                    <span className="font-medium">{email}</span> will no longer receive marketing emails from Voiceover Studio Finder.
                  </>
                )}
              </p>
              <p className="text-sm text-gray-500">
                You'll still receive important transactional emails about your account, such as password resets and payment confirmations.
              </p>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Changed your mind?{' '}
                  <a href="/dashboard/settings" className="text-red-600 hover:text-red-700 font-medium">
                    Sign in to update your preferences
                  </a>
                </p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-6">
                {error || 'We couldn\'t process your unsubscribe request.'}
              </p>
              <p className="text-sm text-gray-500">
                The link may have expired or is invalid. If you continue to receive unwanted emails, please contact us at{' '}
                <a href="mailto:support@voiceoverstudiofinder.com" className="text-red-600 hover:text-red-700">
                  support@voiceoverstudiofinder.com
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
