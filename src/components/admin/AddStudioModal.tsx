'use client';

import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';

interface AddStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function AddStudioModal({ isOpen, onClose, onSuccess }: AddStudioModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Account fields
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  // Account settings
  const [membershipTier, setMembershipTier] = useState<'BASIC' | 'PREMIUM'>('BASIC');
  const [bypassEmailVerification, setBypassEmailVerification] = useState(true);
  const [profileVisible, setProfileVisible] = useState(false);

  // Hide navigation when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('admin-modal-open');
    } else {
      document.body.classList.remove('admin-modal-open');
    }

    return () => {
      document.body.classList.remove('admin-modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setUsername('');
    setDisplayName('');
    setEmail('');
    setMembershipTier('BASIC');
    setBypassEmailVerification(true);
    setProfileVisible(false);
    setError(null);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    // Validation
    if (!username.trim() || !displayName.trim() || !email.trim()) {
      setError('Username, Display Name, and Email are required');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/create-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          display_name: displayName.trim(),
          email: email.trim().toLowerCase(),
          membership_tier: membershipTier,
          bypass_email_verification: bypassEmailVerification,
          is_profile_visible: profileVisible,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create studio');
      }

      onSuccess(`Account created for ${email}. Tell the user to use "Forgot Password" to set their password.`);
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start md:items-center justify-center z-50 p-0 md:p-8">
      <div className="bg-white md:rounded-lg shadow-xl max-w-2xl w-full h-full md:h-auto md:max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Add New Account</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            disabled={isLoading}
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Section 1: Account Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-600">*</span>
                </label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., johndoe"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name <span className="text-red-600">*</span>
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., John Doe Studios"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., john@example.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> No password will be set. Tell the user to visit the site and click &quot;Forgot Password&quot; to set their password.
              </p>
            </div>
          </div>

          {/* Section 2: Account Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>

            {/* Membership Tier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Membership Tier
              </label>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-colors ${
                  membershipTier === 'BASIC'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="membershipTier"
                    value="BASIC"
                    checked={membershipTier === 'BASIC'}
                    onChange={() => setMembershipTier('BASIC')}
                    disabled={isLoading}
                    className="accent-red-600"
                  />
                  <div>
                    <span className="text-sm font-medium">Basic</span>
                    <span className="text-xs text-gray-500 ml-1">(Free)</span>
                  </div>
                </label>
                <label className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-colors ${
                  membershipTier === 'PREMIUM'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="membershipTier"
                    value="PREMIUM"
                    checked={membershipTier === 'PREMIUM'}
                    onChange={() => setMembershipTier('PREMIUM')}
                    disabled={isLoading}
                    className="accent-red-600"
                  />
                  <div>
                    <span className="text-sm font-medium">Premium</span>
                    <span className="text-xs text-gray-500 ml-1">(Paid)</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <Checkbox
                checked={bypassEmailVerification}
                onChange={(e) => setBypassEmailVerification(e.target.checked)}
                disabled={isLoading}
                label="Bypass email verification"
                description="Mark the account as email-verified immediately (skip verification email)"
              />

              <Checkbox
                checked={profileVisible}
                onChange={(e) => setProfileVisible(e.target.checked)}
                disabled={isLoading}
                label="Make profile visible"
                description="Profile will appear in search results immediately (normally hidden until user enables it)"
              />
            </div>
          </div>

          {/* Info: What happens next */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="text-sm text-gray-600">
              <strong>What happens:</strong> An account and empty studio profile will be created.
              The admin or user can fill in their studio details via the Edit Profile page as normal,
              after the account basics have been created here.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-end gap-3 p-4 md:p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors order-2 md:order-1"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 md:order-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
