'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, X, Copy, Check, FlaskConical, UserPlus, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { generateTestProfile } from '@/lib/admin/test-data-generator';

type ModalTab = 'add-account' | 'test-account';
type ProfileCompleteness = 'empty' | 'partial' | 'full';

interface AddStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

interface CreatedAccountInfo {
  email: string;
  password: string;
  username: string;
  displayName: string;
  tier: 'BASIC' | 'PREMIUM';
}

export default function AddStudioModal({ isOpen, onClose, onSuccess }: AddStudioModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('add-account');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Add Account tab state ──
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [membershipTier, setMembershipTier] = useState<'BASIC' | 'PREMIUM'>('BASIC');
  const [bypassEmailVerification, setBypassEmailVerification] = useState(true);
  const [profileVisible, setProfileVisible] = useState(false);

  // ── Test Account tab state ──
  const [testTier, setTestTier] = useState<'BASIC' | 'PREMIUM'>('BASIC');
  const [testEmail, setTestEmail] = useState('');
  const [testPassword, setTestPassword] = useState('Test1234!');
  const [testCompleteness, setTestCompleteness] = useState<ProfileCompleteness>('partial');

  // ── Post-creation summary state ──
  const [createdAccount, setCreatedAccount] = useState<CreatedAccountInfo | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Generate initial random email for test tab
  const regenerateTestEmail = useCallback(() => {
    const profile = generateTestProfile('BASIC', 'empty');
    setTestEmail(profile.email);
  }, []);

  // Initialize test email when modal opens
  useEffect(() => {
    if (isOpen && !testEmail) {
      regenerateTestEmail();
    }
  }, [isOpen, testEmail, regenerateTestEmail]);

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

  const resetAddAccountForm = () => {
    setUsername('');
    setDisplayName('');
    setEmail('');
    setMembershipTier('BASIC');
    setBypassEmailVerification(true);
    setProfileVisible(false);
    setError(null);
  };

  const resetTestForm = () => {
    setTestTier('BASIC');
    setTestPassword('Test1234!');
    setTestCompleteness('partial');
    setError(null);
    setCreatedAccount(null);
    // Generate a fresh email
    const profile = generateTestProfile('BASIC', 'empty');
    setTestEmail(profile.email);
  };

  const handleClose = () => {
    onClose();
    resetAddAccountForm();
    resetTestForm();
    setCreatedAccount(null);
  };

  // ── Add Account submit (original flow) ──
  const handleAddAccountSubmit = async () => {
    setIsLoading(true);
    setError(null);

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
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Test Account submit ──
  const handleTestAccountSubmit = async () => {
    setIsLoading(true);
    setError(null);

    const trimmedPassword = testPassword.trim();
    if (trimmedPassword.length > 0 && trimmedPassword.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      const profileData = generateTestProfile(
        testTier,
        testCompleteness,
        testEmail.trim() || undefined,
        testPassword.trim() || undefined,
      );

      const response = await fetch('/api/admin/create-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profileData.username,
          display_name: profileData.display_name,
          email: profileData.email.toLowerCase(),
          password: profileData.password,
          membership_tier: profileData.membership_tier,
          bypass_email_verification: true,
          is_profile_visible: false,
          is_test_account: true,
          profile_data: profileData.profile_data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create test account');
      }

      // Show the summary panel with credentials
      setCreatedAccount({
        email: profileData.email,
        password: profileData.password,
        username: profileData.username,
        displayName: profileData.display_name,
        tier: profileData.membership_tier,
      });

      onSuccess(`Test account created: ${profileData.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback: select text
    }
  };

  const handleCreateAnother = () => {
    resetTestForm();
  };

  // ── Render: Post-creation summary ──
  if (createdAccount) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-start md:items-center justify-center z-50 p-0 md:p-8">
        <div className="bg-white md:rounded-lg shadow-xl max-w-lg w-full h-full md:h-auto md:max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Test Account Created</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Success banner */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-800">Account created successfully</span>
              </div>
              <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                createdAccount.tier === 'PREMIUM'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {createdAccount.tier}
              </span>
            </div>

            {/* Credentials */}
            <div className="space-y-3">
              <CopyableField label="Email" value={createdAccount.email} field="email" copiedField={copiedField} onCopy={handleCopy} />
              <CopyableField label="Password" value={createdAccount.password} field="password" copiedField={copiedField} onCopy={handleCopy} />
              <CopyableField label="Username" value={createdAccount.username} field="username" copiedField={copiedField} onCopy={handleCopy} />
              <CopyableField label="Display Name" value={createdAccount.displayName} field="displayName" copiedField={copiedField} onCopy={handleCopy} />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                You can log in immediately with the email and password above.
                The profile is hidden from search results by default.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-end gap-3 p-4 md:p-6 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors order-2 md:order-1"
            >
              Done
            </button>
            <button
              onClick={handleCreateAnother}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 order-1 md:order-2"
            >
              <RefreshCw className="w-4 h-4" />
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Main modal with tabs ──
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start md:items-center justify-center z-50 p-0 md:p-8">
      <div className="bg-white md:rounded-lg shadow-xl max-w-2xl w-full h-full md:h-auto md:max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Add New Account</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            disabled={isLoading}
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4 md:px-6">
          <button
            onClick={() => { setActiveTab('add-account'); setError(null); }}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'add-account'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Add Account
          </button>
          <button
            onClick={() => { setActiveTab('test-account'); setError(null); }}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'test-account'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            Test Account
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {activeTab === 'add-account' ? (
            <AddAccountTab
              username={username}
              setUsername={setUsername}
              displayName={displayName}
              setDisplayName={setDisplayName}
              email={email}
              setEmail={setEmail}
              membershipTier={membershipTier}
              setMembershipTier={setMembershipTier}
              bypassEmailVerification={bypassEmailVerification}
              setBypassEmailVerification={setBypassEmailVerification}
              profileVisible={profileVisible}
              setProfileVisible={setProfileVisible}
              isLoading={isLoading}
            />
          ) : (
            <TestAccountTab
              testTier={testTier}
              setTestTier={setTestTier}
              testEmail={testEmail}
              setTestEmail={setTestEmail}
              testPassword={testPassword}
              setTestPassword={setTestPassword}
              testCompleteness={testCompleteness}
              setTestCompleteness={setTestCompleteness}
              isLoading={isLoading}
              onRegenerateEmail={regenerateTestEmail}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-end gap-3 p-4 md:p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors order-2 md:order-1"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={activeTab === 'add-account' ? handleAddAccountSubmit : handleTestAccountSubmit}
            disabled={isLoading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 md:order-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading
              ? 'Creating...'
              : activeTab === 'add-account'
                ? 'Create Account'
                : 'Generate Test Account'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Account Tab (original form) ──

interface AddAccountTabProps {
  username: string;
  setUsername: (v: string) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  membershipTier: 'BASIC' | 'PREMIUM';
  setMembershipTier: (v: 'BASIC' | 'PREMIUM') => void;
  bypassEmailVerification: boolean;
  setBypassEmailVerification: (v: boolean) => void;
  profileVisible: boolean;
  setProfileVisible: (v: boolean) => void;
  isLoading: boolean;
}

function AddAccountTab({
  username, setUsername,
  displayName, setDisplayName,
  email, setEmail,
  membershipTier, setMembershipTier,
  bypassEmailVerification, setBypassEmailVerification,
  profileVisible, setProfileVisible,
  isLoading,
}: AddAccountTabProps) {
  return (
    <>
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
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
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
        <TierSelector tier={membershipTier} setTier={setMembershipTier} isLoading={isLoading} radioName="addAccountTier" />

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

      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-sm text-gray-600">
          <strong>What happens:</strong> An account and empty studio profile will be created.
          The admin or user can fill in their studio details via the Edit Profile page as normal,
          after the account basics have been created here.
        </p>
      </div>
    </>
  );
}

// ── Test Account Tab ──

interface TestAccountTabProps {
  testTier: 'BASIC' | 'PREMIUM';
  setTestTier: (v: 'BASIC' | 'PREMIUM') => void;
  testEmail: string;
  setTestEmail: (v: string) => void;
  testPassword: string;
  setTestPassword: (v: string) => void;
  testCompleteness: ProfileCompleteness;
  setTestCompleteness: (v: ProfileCompleteness) => void;
  isLoading: boolean;
  onRegenerateEmail: () => void;
}

function TestAccountTab({
  testTier, setTestTier,
  testEmail, setTestEmail,
  testPassword, setTestPassword,
  testCompleteness, setTestCompleteness,
  isLoading, onRegenerateEmail,
}: TestAccountTabProps) {
  return (
    <>
      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
        <p className="text-sm text-purple-800">
          <strong>Test mode:</strong> Creates an account with random data and a working password.
          Username, display name, and studio details are auto-generated. Profile is hidden by default.
        </p>
      </div>

      {/* Membership Tier */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
        <TierSelector tier={testTier} setTier={setTestTier} isLoading={isLoading} radioName="testAccountTier" />
      </div>

      {/* Email */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <button
            type="button"
            onClick={onRegenerateEmail}
            disabled={isLoading}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        </div>
        <Input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value.toLowerCase())}
          placeholder="Auto-generated test email"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">
          Uses @vostudiofinder-test.com domain for easy identification and cleanup.
        </p>
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <Input
          type="text"
          value={testPassword}
          onChange={(e) => setTestPassword(e.target.value)}
          placeholder="Test1234!"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">
          Must be 8+ characters. Default: Test1234!
        </p>
      </div>

      {/* Profile Completeness */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Profile Completeness
        </label>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: 'empty' as const, label: 'Empty', description: 'Account only, no studio data' },
            { value: 'partial' as const, label: 'Partial', description: 'Name, city, types, connections' },
            { value: 'full' as const, label: 'Full', description: 'Everything filled in' },
          ]).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTestCompleteness(option.value)}
              disabled={isLoading}
              className={`flex flex-col items-center gap-1 px-3 py-3 border rounded-lg cursor-pointer transition-colors text-center ${
                testCompleteness === option.value
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
              }`}
            >
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-xs text-gray-500 leading-tight">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary of what will be generated */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-sm text-gray-600">
          <strong>What happens:</strong>{' '}
          {testCompleteness === 'empty' && 'An active account will be created with a random username and display name. The studio profile will be empty.'}
          {testCompleteness === 'partial' && 'An active account with a random studio name, city, short description, 1-2 studio types, and a few connection methods.'}
          {testCompleteness === 'full' && 'A fully populated profile with studio name, descriptions, city, studio types, connections, social links, rates, and equipment.'}
          {' '}Email verified, profile hidden.
        </p>
      </div>
    </>
  );
}

// ── Shared: Tier Selector ──

interface TierSelectorProps {
  tier: 'BASIC' | 'PREMIUM';
  setTier: (v: 'BASIC' | 'PREMIUM') => void;
  isLoading: boolean;
  radioName: string;
}

function TierSelector({ tier, setTier, isLoading, radioName }: TierSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Membership Tier
      </label>
      <div className="flex gap-4">
        <label className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-colors ${
          tier === 'BASIC'
            ? 'border-red-500 bg-red-50 text-red-700'
            : 'border-gray-300 hover:border-gray-400'
        }`}>
          <input
            type="radio"
            name={radioName}
            value="BASIC"
            checked={tier === 'BASIC'}
            onChange={() => setTier('BASIC')}
            disabled={isLoading}
            className="accent-red-600"
          />
          <div>
            <span className="text-sm font-medium">Basic</span>
            <span className="text-xs text-gray-500 ml-1">(Free)</span>
          </div>
        </label>
        <label className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-colors ${
          tier === 'PREMIUM'
            ? 'border-red-500 bg-red-50 text-red-700'
            : 'border-gray-300 hover:border-gray-400'
        }`}>
          <input
            type="radio"
            name={radioName}
            value="PREMIUM"
            checked={tier === 'PREMIUM'}
            onChange={() => setTier('PREMIUM')}
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
  );
}

// ── Shared: Copyable Field ──

interface CopyableFieldProps {
  label: string;
  value: string;
  field: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}

function CopyableField({ label, value, field, copiedField, onCopy }: CopyableFieldProps) {
  const isCopied = copiedField === field;

  return (
    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-mono text-gray-900 truncate">{value}</p>
      </div>
      <button
        onClick={() => onCopy(value, field)}
        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded hover:bg-gray-200"
        title={`Copy ${label.toLowerCase()}`}
      >
        {isCopied
          ? <Check className="w-4 h-4 text-green-600" />
          : <Copy className="w-4 h-4" />
        }
      </button>
    </div>
  );
}
