'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Shield,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Trash2,
  Download,
  MessageCircle,
  Lightbulb,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { CloseAccountModal } from '@/components/settings/CloseAccountModal';
import { logger } from '@/lib/logger';

interface SettingsProps {
  data: any; // dashboardData
}

const ISSUE_CATEGORIES = [
  'Account Access',
  'Profile Issues',
  'Payment/Billing',
  'Technical Bug',
  'Content Report',
  'Other',
];

const SUGGESTION_CATEGORIES = [
  'New Feature',
  'UI/UX Improvement',
  'Performance',
  'Content',
  'Other',
];

export function SettingsNew({ data }: SettingsProps) {
  const router = useRouter();
  const [profileData, setProfileData] = useState(data);
  const [isProfileVisible, setIsProfileVisible] = useState(data?.studio?.is_profile_visible !== false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  
  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCloseAccountModal, setShowCloseAccountModal] = useState(false);
  
  // Support forms
  const [issueFormOpen, setIssueFormOpen] = useState(false);
  const [suggestionFormOpen, setSuggestionFormOpen] = useState(false);
  const [issueCategory, setIssueCategory] = useState('');
  const [issueMessage, setIssueMessage] = useState('');
  const [suggestionCategory, setSuggestionCategory] = useState('');
  const [suggestionMessage, setSuggestionMessage] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(false);
  const [suggestionSuccess, setSuggestionSuccess] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [suggestionError, setSuggestionError] = useState('');
  
  // Download data
  const [downloadingData, setDownloadingData] = useState(false);

  // Update profileData if data prop changes
  useEffect(() => {
    setProfileData(data);
    setIsProfileVisible(data?.studio?.is_profile_visible !== false);
  }, [data]);

  const lastUpdated = useMemo(() => {
    if (!profileData?.studio?.updated_at) return 'Never';
    const date = new Date(profileData.studio.updated_at);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, [profileData]);

  const handleVisibilityToggle = useCallback(async (visible: boolean) => {
    setSavingVisibility(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studio: {
            is_profile_visible: visible
          }
        }),
      });

      if (response.ok) {
        setIsProfileVisible(visible);
        logger.log('✅ Profile visibility updated to:', visible);
      } else {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to update profile visibility:', errorData);
        alert('Failed to update profile visibility. Please try again.');
        setIsProfileVisible(!visible);
      }
    } catch (err) {
      logger.error('Error updating profile visibility:', err);
      alert('Error updating profile visibility. Please try again.');
      setIsProfileVisible(!visible);
    } finally {
      setSavingVisibility(false);
    }
  }, []);

  const handleDownloadData = useCallback(async () => {
    setDownloadingData(true);
    try {
      const response = await fetch('/api/user/download-data');
      
      if (!response.ok) {
        throw new Error('Failed to download data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voiceoverstudiofinder-data-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      logger.log('✅ Data downloaded successfully');
    } catch (err) {
      logger.error('Error downloading data:', err);
      alert('Failed to download data. Please try again.');
    } finally {
      setDownloadingData(false);
    }
  }, []);

  const handleSubmitIssue = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueError('');
    setIssueSuccess(false);

    if (!issueCategory || !issueMessage) {
      setIssueError('Please fill in all fields');
      return;
    }

    setSubmittingIssue(true);

    try {
      const response = await fetch('/api/support/submit-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ISSUE',
          category: issueCategory,
          message: issueMessage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit issue');
      }

      setIssueSuccess(true);
      setIssueMessage('');
      setIssueCategory('');
      logger.log('✅ Issue submitted:', result.ticketId);

      setTimeout(() => {
        setIssueSuccess(false);
        setIssueFormOpen(false);
      }, 3000);

    } catch (err: any) {
      logger.error('Error submitting issue:', err);
      setIssueError(err.message || 'Failed to submit issue');
    } finally {
      setSubmittingIssue(false);
    }
  }, [issueCategory, issueMessage]);

  const handleSubmitSuggestion = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestionError('');
    setSuggestionSuccess(false);

    if (!suggestionCategory || !suggestionMessage) {
      setSuggestionError('Please fill in all fields');
      return;
    }

    setSubmittingSuggestion(true);

    try {
      const response = await fetch('/api/support/submit-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SUGGESTION',
          category: suggestionCategory,
          message: suggestionMessage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit suggestion');
      }

      setSuggestionSuccess(true);
      setSuggestionMessage('');
      setSuggestionCategory('');
      logger.log('✅ Suggestion submitted:', result.ticketId);

      setTimeout(() => {
        setSuggestionSuccess(false);
        setSuggestionFormOpen(false);
      }, 3000);

    } catch (err: any) {
      logger.error('Error submitting suggestion:', err);
      setSuggestionError(err.message || 'Failed to submit suggestion');
    } finally {
      setSubmittingSuggestion(false);
    }
  }, [suggestionCategory, suggestionMessage]);

  if (!profileData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Settings</h2>
            <p className="text-sm text-gray-600 mt-1">Manage your account settings and preferences</p>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Last updated: {lastUpdated}</span>
          </div>
        </div>
        <div className="md:hidden mt-2 flex items-center space-x-2 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>Last updated: {lastUpdated}</span>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900">Account Information</h3>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">Username</p>
              <p className="text-sm text-gray-500 truncate">@{profileData.user.username}</p>
            </div>
            <a href={`/${profileData.user.username}`} target="_blank" rel="noopener noreferrer" 
               className="ml-2 text-sm text-[#d42027] hover:text-[#a1181d] flex items-center space-x-1 flex-shrink-0">
              <span className="hidden sm:inline">View</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">Email</p>
              <p className="text-sm text-gray-500 truncate">{profileData.user.email}</p>
            </div>
            <div className="ml-2 flex items-center space-x-1 text-green-600 text-xs flex-shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              <span>Verified</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Profile Visibility</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isProfileVisible ? 'Visible to public' : 'Hidden from public'}
              </p>
            </div>
            <Toggle
              checked={isProfileVisible}
              onChange={handleVisibilityToggle}
              disabled={savingVisibility}
              aria-label="Toggle profile visibility"
            />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900">Security</h3>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors text-left"
          >
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Change Password</p>
                <p className="text-xs text-gray-500">Update your account password</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={() => setShowCloseAccountModal(true)}
            className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-md transition-colors text-left border border-red-200"
          >
            <div className="flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">Close Account</p>
                <p className="text-xs text-red-700">Permanently delete your account and data</p>
              </div>
            </div>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* Privacy & Data */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900">Privacy & Data</h3>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">Privacy Settings</p>
              <a href="/dashboard#edit-profile" 
                 className="text-xs text-[#d42027] hover:text-[#a1181d] flex items-center space-x-1">
                <span>Manage</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="flex items-center space-x-1 bg-white px-2 py-1 rounded border border-gray-200">
                {profileData.profile?.show_email ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <AlertCircle className="w-3 h-3 text-gray-400" />}
                <span>Email {profileData.profile?.show_email ? 'Visible' : 'Hidden'}</span>
              </span>
              <span className="flex items-center space-x-1 bg-white px-2 py-1 rounded border border-gray-200">
                {profileData.profile?.show_phone ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <AlertCircle className="w-3 h-3 text-gray-400" />}
                <span>Phone {profileData.profile?.show_phone ? 'Visible' : 'Hidden'}</span>
              </span>
              <span className="flex items-center space-x-1 bg-white px-2 py-1 rounded border border-gray-200">
                {profileData.profile?.show_address ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <AlertCircle className="w-3 h-3 text-gray-400" />}
                <span>Address {profileData.profile?.show_address ? 'Visible' : 'Hidden'}</span>
              </span>
            </div>
          </div>

          <button
            onClick={handleDownloadData}
            disabled={downloadingData}
            className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors text-left border border-blue-200 disabled:opacity-50"
          >
            <div className="flex items-center space-x-2">
              {downloadingData ? <Loader2 className="w-4 h-4 text-blue-600 animate-spin" /> : <Download className="w-4 h-4 text-blue-600" />}
              <div>
                <p className="text-sm font-medium text-blue-900">Download All My Data</p>
                <p className="text-xs text-blue-700">Export your data in ZIP format (GDPR compliant)</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Support */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4 text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900">Support</h3>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Report an Issue */}
          <div className="border border-gray-200 rounded-md">
            <button
              onClick={() => setIssueFormOpen(!issueFormOpen)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-gray-900">Report an Issue</span>
              </div>
              {issueFormOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {issueFormOpen && (
              <form onSubmit={handleSubmitIssue} className="p-3 border-t border-gray-200 space-y-3">
                {issueSuccess && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                    ✓ Issue submitted successfully! We'll get back to you soon.
                  </div>
                )}
                {issueError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    {issueError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value)}
                    disabled={submittingIssue}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
                    required
                  >
                    <option value="">Select a category</option>
                    {ISSUE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={issueMessage}
                    onChange={(e) => setIssueMessage(e.target.value)}
                    disabled={submittingIssue}
                    rows={4}
                    placeholder="Please describe the issue in detail..."
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingIssue}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-[#d42027] rounded-md hover:bg-[#a1181d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {submittingIssue && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{submittingIssue ? 'Submitting...' : 'Submit Issue'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Make a Suggestion */}
          <div className="border border-gray-200 rounded-md">
            <button
              onClick={() => setSuggestionFormOpen(!suggestionFormOpen)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-gray-900">Make a Suggestion</span>
              </div>
              {suggestionFormOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {suggestionFormOpen && (
              <form onSubmit={handleSubmitSuggestion} className="p-3 border-t border-gray-200 space-y-3">
                {suggestionSuccess && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                    ✓ Suggestion submitted! Thank you for helping us improve.
                  </div>
                )}
                {suggestionError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    {suggestionError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={suggestionCategory}
                    onChange={(e) => setSuggestionCategory(e.target.value)}
                    disabled={submittingSuggestion}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
                    required
                  >
                    <option value="">Select a category</option>
                    {SUGGESTION_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Your Suggestion</label>
                  <textarea
                    value={suggestionMessage}
                    onChange={(e) => setSuggestionMessage(e.target.value)}
                    disabled={submittingSuggestion}
                    rows={4}
                    placeholder="Tell us your idea..."
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingSuggestion}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-[#d42027] rounded-md hover:bg-[#a1181d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {submittingSuggestion && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{submittingSuggestion ? 'Submitting...' : 'Submit Suggestion'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Membership (Coming Soon) */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm opacity-60">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <h3 className="text-base font-semibold text-gray-900">Membership</h3>
            </div>
            <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full border border-gray-300">
              Coming Soon
            </span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-1">Membership Status</p>
            <p className="text-xs text-gray-500">Free Forever</p>
          </div>

          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-gray-700">Days until renewal</p>
              <span className="text-sm font-bold text-gray-900">∞</span>
            </div>
            <p className="text-xs text-gray-500">No expiration</p>
          </div>

          <button
            disabled
            className="w-full p-3 bg-gray-100 rounded-md border border-gray-200 cursor-not-allowed"
          >
            <p className="text-sm font-medium text-gray-500">Renew Early (2 weeks extra free!)</p>
          </button>

          <button
            disabled
            className="w-full p-3 bg-gray-100 rounded-md border border-gray-200 cursor-not-allowed"
          >
            <p className="text-sm font-medium text-gray-500">5-Year Membership - £75</p>
            <p className="text-xs text-gray-400 mt-1">Pay now to add 4 more years!</p>
          </button>
        </div>
      </div>

      {/* Modals */}
      <ChangePasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
      
      <CloseAccountModal 
        isOpen={showCloseAccountModal}
        onClose={() => setShowCloseAccountModal(false)}
        username={profileData.user.username}
      />
    </>
  );
}

