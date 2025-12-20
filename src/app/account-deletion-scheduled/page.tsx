'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Calendar, Mail, Home } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function AccountDeletionScheduledPage() {
  const router = useRouter();
  const [deletionDate, setDeletionDate] = useState<string | null>(null);

  useEffect(() => {
    // Logout the user
    const logout = async () => {
      try {
        await fetch('/api/auth/signout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        logger.log('✅ User logged out after account deletion request');
      } catch (err) {
        logger.error('Error logging out:', err);
      }
    };

    logout();

    // Calculate deletion date (7 days from now)
    const date = new Date();
    date.setDate(date.getDate() + 7);
    setDeletionDate(date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-lg shadow-xl border border-red-200 overflow-hidden">
          {/* Header */}
          <div className="bg-red-50 border-b border-red-200 p-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h1 className="text-2xl font-bold text-red-900">Account Deletion Scheduled</h1>
            </div>
            <p className="text-center text-sm text-red-700">
              Your account closure has been initiated
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-start space-x-2">
                <Calendar className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-900 mb-1">7-Day Grace Period</h3>
                  <p className="text-sm text-yellow-700">
                    Your account will be permanently deleted on <strong className="font-bold">{deletionDate || 'loading...'}</strong>.
                  </p>
                  <p className="text-sm text-yellow-700 mt-2">
                    You can cancel this deletion at any time before then by logging in and visiting your settings.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">What happens next:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>Your profile has been hidden from public view immediately</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>You've been logged out of all devices</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>Your account will be permanently deleted in 7 days</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>All your data will be permanently removed</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>Any active subscriptions will be cancelled</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start space-x-2">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">Confirmation Email</h3>
                  <p className="text-sm text-blue-700">
                    We've sent a confirmation email with details about your account deletion. 
                    It includes instructions on how to cancel if you change your mind.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 space-y-3">
              <button
                onClick={() => router.push('/sign-in')}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-[#d42027] rounded-md hover:bg-[#a1181d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#d42027] transition-colors"
              >
                Sign In to Cancel Deletion
              </button>

              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors flex items-center justify-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Return to Homepage</span>
              </button>
            </div>

            <p className="text-xs text-center text-gray-500 pt-4">
              Need help? Contact <a href="mailto:support@voiceoverstudiofinder.com" className="text-[#d42027] hover:underline">support@voiceoverstudiofinder.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

