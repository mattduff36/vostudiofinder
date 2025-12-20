'use client';

import { useState } from 'react';
import { X, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useRouter } from 'next/navigation';

interface CloseAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CloseAccountModal({ isOpen, onClose }: CloseAccountModalProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Warning, 2: Confirmation

  const requiredText = 'delete my account';
  const isConfirmationValid = confirmationText.toLowerCase() === requiredText;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Password is required');
      return;
    }

    if (!isConfirmationValid) {
      setError(`Please type "${requiredText}" to confirm`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/user/close-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          confirmation: confirmationText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to close account');
      }

      logger.log('✅ Account closure scheduled');
      
      // Redirect to a confirmation page or logout
      router.push('/account-deletion-scheduled');

    } catch (err: any) {
      logger.error('Error closing account:', err);
      setError(err.message || 'Failed to close account');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setPassword('');
      setConfirmationText('');
      setError('');
      setStep(1);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Close Account</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <h3 className="text-sm font-semibold text-red-900 mb-2">Warning: This action cannot be undone</h3>
                <p className="text-sm text-red-700">
                  Closing your account will:
                </p>
                <ul className="mt-2 ml-4 text-sm text-red-700 list-disc space-y-1">
                  <li>Schedule your account for deletion in 7 days</li>
                  <li>Hide your profile from search results immediately</li>
                  <li>Permanently delete all your data after 7 days</li>
                  <li>Remove all your reviews and ratings</li>
                  <li>Cancel any active subscriptions</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Grace Period</h3>
                <p className="text-sm text-blue-700">
                  You have 7 days to change your mind. During this time, you can cancel the deletion by logging in and visiting your account settings.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-700">
                  To confirm, type <strong className="font-semibold text-gray-900">"{requiredText}"</strong> below:
                </p>
              </div>

              {/* Confirmation Text */}
              <div>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  disabled={loading}
                  placeholder={requiredText}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50 ${
                    confirmationText && !isConfirmationValid
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-[#d42027]'
                  }`}
                  required
                  autoComplete="off"
                />
                {confirmationText && !isConfirmationValid && (
                  <p className="mt-1 text-xs text-red-600">Text does not match</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm your password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !isConfirmationValid}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{loading ? 'Processing...' : 'Close My Account'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

