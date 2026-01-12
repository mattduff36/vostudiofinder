'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Shield,
  ExternalLink,
  AlertCircle,
  Loader2,
  Lock,
  Trash2,
  Download,
  MessageCircle,
  Lightbulb,
  CreditCard,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowLeft,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { CloseAccountModal } from '@/components/settings/CloseAccountModal';
import { ProgressIndicators } from '@/components/dashboard/ProgressIndicators';
import { calculateCompletionStats } from '@/lib/utils/profile-completion';
import { logger } from '@/lib/logger';
import { showSuccess, showError } from '@/lib/toast';
import { Button } from '@/components/ui/Button';

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

export function Settings({ data }: SettingsProps) {
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
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
  
  // Download data
  const [downloadingData, setDownloadingData] = useState(false);
  
  // Desktop section navigation
  const [activeDesktopSection, setActiveDesktopSection] = useState('membership');
  
  // Mobile accordion
  const [expandedMobileSection, setExpandedMobileSection] = useState<string | null>(null);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});


  // Fetch full profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const result = await response.json();
          setProfileData(result.data);
          logger.log('[Settings] Profile data loaded');
        }
      } catch (err) {
        logger.error('[Settings] Failed to fetch profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  // Calculate completion stats
  const completionStats = useMemo(() => {
    if (!profileData) {
      return {
        required: { completed: 0, total: 11 },
        overall: { percentage: 0 },
      };
    }

    return calculateCompletionStats({
      user: {
        username: profileData.user?.username || '',
        display_name: profileData.user?.display_name || '',
        email: profileData.user?.email || '',
        avatar_url: profileData.user?.avatar_url || null,
      },
      profile: profileData.profile || {},
      studio: {
        name: profileData.studio?.name || null,
        studio_types: profileData.studio?.studio_types || [],
        images: profileData.studio?.images || [],
        website_url: profileData.studio?.website_url || null,
      },
    });
  }, [profileData]);

  // Scroll to expanded card on mobile
  useEffect(() => {
    if (expandedMobileSection && sectionRefs.current[expandedMobileSection]) {
      // Wait for DOM to update (card expansion animation)
      setTimeout(() => {
        const card = sectionRefs.current[expandedMobileSection];
        if (card) {
          const navbarHeight = 64; // pt-16 = 64px
          const extraSpacing = 16; // Additional spacing below navbar
          const cardTop = card.getBoundingClientRect().top + window.scrollY;
          const scrollTo = cardTop - navbarHeight - extraSpacing;
          
          window.scrollTo({
            top: scrollTo,
            behavior: 'smooth',
          });
        }
      }, 100);
    }
  }, [expandedMobileSection]);

  const sections = [
    { id: 'membership', label: 'Membership', icon: CreditCard, description: 'Subscription and billing' },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield, description: 'Privacy settings, security, and data' },
    { id: 'support', label: 'Support', icon: MessageCircle, description: 'Report issues, make suggestions' },
  ];

  const handleMobileSectionClick = (sectionId: string) => {
    if (expandedMobileSection === sectionId) {
      setExpandedMobileSection(null);
    } else {
      setExpandedMobileSection(sectionId);
    }
  };


  // Render content for a specific section (mobile)
  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'privacy':
        return (
          <div className="space-y-6">
            {/* Privacy Settings - Improved clarity */}
            <div className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>
                </div>
                <button
                  onClick={() => {
                    // Store the target section in sessionStorage for ProfileEditForm to read
                    sessionStorage.setItem('openProfileSection', 'privacy');
                    window.location.href = '/dashboard#edit-profile';
                  }}
                  className="text-sm text-[#d42027] hover:text-[#a1181d] flex items-center space-x-1"
                >
                  <span>Manage</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">Control what information is visible on your public profile</p>
              <div className="space-y-3">
                {loadingProfile ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email Address</p>
                        <p className="text-xs text-gray-500 mt-0.5">{profileData?.user?.email || data.user.email}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {profileData?.profile?.show_email ? (
                          <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">Visible</span>
                        ) : (
                          <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded">Hidden</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Phone Number</p>
                        <p className="text-xs text-gray-500 mt-0.5">{profileData?.studio?.phone || 'No phone number set'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {profileData?.profile?.show_phone ? (
                          <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">Visible</span>
                        ) : (
                          <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded">Hidden</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Address</p>
                        <p className="text-xs text-gray-500 mt-0.5">{profileData?.studio?.full_address || 'No address set'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {profileData?.profile?.show_address ? (
                          <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">Visible</span>
                        ) : (
                          <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded">Hidden</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Download Data */}
            <div className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Download className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Download All My Data</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Export your data in ZIP format (GDPR compliant)</p>
              <button
                onClick={handleDownloadData}
                disabled={downloadingData}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {downloadingData && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{downloadingData ? 'Preparing Download...' : 'Download My Data'}</span>
              </button>
            </div>

            {/* Change Password */}
            <div className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Lock className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Update your account password</p>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800 flex items-center justify-center space-x-2"
              >
                <span>Change Password</span>
              </button>
            </div>

            {/* Close Account - Keep Red */}
            <div className="border border-red-200 rounded-md p-4 bg-red-50">
              <div className="flex items-center space-x-2 mb-4">
                <Trash2 className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-medium text-red-900">Close Account</h3>
              </div>
              <p className="text-sm text-red-700 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
              <button
                onClick={() => setShowCloseAccountModal(true)}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center justify-center space-x-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Close Account</span>
              </button>
            </div>
          </div>
        );

      case 'support':
        return (
          <div className="space-y-3">
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
        );

      case 'membership':
        const isAdminUser = profileData?.user?.role === 'ADMIN';

        return (
          <div className="space-y-3">
            {loadingProfile ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {/* Admin Account Notice */}
                {isAdminUser && (
                  <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xl">👑</span>
                      <p className="text-sm font-semibold text-blue-900">Admin Account</p>
                    </div>
                    <p className="text-xs text-blue-700">
                      As an administrator, your account has permanent access with no membership expiry date.
                    </p>
                  </div>
                )}

                {/* Regular Membership Display */}
                {!isAdminUser && (() => {
                  const membership = profileData?.membership;
                  const isActive = membership?.state === 'ACTIVE';
                  const isExpired = membership?.state === 'EXPIRED';
                  const hasNoExpiry = membership?.state === 'NONE_SET';
                  
                  return (
              <>
                <div className="p-4 bg-white rounded-md border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Membership Status</p>
                    {isActive && (
                      <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full border border-green-300">
                        Active
                      </span>
                    )}
                    {isExpired && (
                      <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full border border-red-300">
                        Expired
                      </span>
                    )}
                    {hasNoExpiry && (
                      <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full border border-gray-300">
                        Not Set
                      </span>
                    )}
                  </div>
                  
                  {membership?.expiresAt && (
                    <>
                      <p className="text-xs text-gray-600 mb-1">Expires on</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(membership.expiresAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </>
                  )}
                  
                  {hasNoExpiry && (
                    <p className="text-xs text-gray-500">No membership expiry set. Please contact support.</p>
                  )}
                </div>

                {membership?.daysUntilExpiry !== null && membership?.daysUntilExpiry !== undefined && (
                  <div className="p-4 bg-white rounded-md border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-700">Days until renewal</p>
                      <span className={`text-lg font-bold ${
                        membership.daysUntilExpiry < 0 
                          ? 'text-red-600' 
                          : membership.daysUntilExpiry <= 30 
                          ? 'text-orange-600' 
                          : 'text-gray-900'
                      }`}>
                        {membership.daysUntilExpiry < 0 
                          ? `${Math.abs(membership.daysUntilExpiry)} days ago` 
                          : membership.daysUntilExpiry}
                      </span>
                    </div>
                    {isExpired && (
                      <p className="text-xs text-red-600 mt-2">
                        Your membership has expired. Renewal required at £25/year. Payments coming soon.
                      </p>
                    )}
                    {isActive && membership.daysUntilExpiry <= 30 && (
                      <p className="text-xs text-orange-600 mt-2">
                        Your membership will expire soon. Renewal will be available at £25/year.
                      </p>
                    )}
                  </div>
                )}

                <button
                  disabled
                  className="w-full p-3 bg-gray-100 rounded-md border border-gray-200 cursor-not-allowed"
                >
                  <p className="text-sm font-medium text-gray-500">Renew Early (2 weeks extra free!)</p>
                  <p className="text-xs text-gray-400 mt-1">Coming soon</p>
                </button>

                <button
                  disabled
                  className="w-full p-3 bg-gray-100 rounded-md border border-gray-200 cursor-not-allowed"
                >
                  <p className="text-sm font-medium text-gray-500">5-Year Membership - £75</p>
                  <p className="text-xs text-gray-400 mt-1">Pay now to add 4 more years! (Coming soon)</p>
                </button>
              </>
                  );
                })()}
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Desktop-specific content renderer (Support section has always-visible forms)
  const renderDesktopSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'privacy':
      case 'membership':
        // Reuse mobile content for these sections
        return renderSectionContent(sectionId);

      case 'support':
        // Desktop: always-visible forms (no collapsibles)
        return (
          <div className="space-y-6">
            {/* Report an Issue - Always visible */}
            <div className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center space-x-2 mb-4">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-medium text-gray-900">Report an Issue</h3>
              </div>
              <form onSubmit={handleSubmitIssue} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
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
            </div>

            {/* Make a Suggestion - Always visible */}
            <div className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-medium text-gray-900">Make a Suggestion</h3>
              </div>
              <form onSubmit={handleSubmitSuggestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Suggestion</label>
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
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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

      showSuccess('Data downloaded successfully!');
      logger.log('[SUCCESS] Data downloaded successfully');
    } catch (err) {
      logger.error('Error downloading data:', err);
      showError('Failed to download data. Please try again.');
    } finally {
      setDownloadingData(false);
    }
  }, []);

  const handleSubmitIssue = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!issueCategory || !issueMessage) {
      showError('Please fill in all fields');
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

      showSuccess('Issue submitted successfully! We\'ll get back to you soon.');
      setIssueMessage('');
      setIssueCategory('');
      setIssueFormOpen(false);
      logger.log('[SUCCESS] Issue submitted:', result.ticketId);

    } catch (err: any) {
      logger.error('Error submitting issue:', err);
      showError(err.message || 'Failed to submit issue');
    } finally {
      setSubmittingIssue(false);
    }
  }, [issueCategory, issueMessage]);

  const handleSubmitSuggestion = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!suggestionCategory || !suggestionMessage) {
      showError('Please fill in all fields');
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

      showSuccess('Suggestion submitted! Thank you for helping us improve.');
      setSuggestionMessage('');
      setSuggestionCategory('');
      setSuggestionFormOpen(false);
      logger.log('[SUCCESS] Suggestion submitted:', result.ticketId);

    } catch (err: any) {
      logger.error('Error submitting suggestion:', err);
      showError(err.message || 'Failed to submit suggestion');
    } finally {
      setSubmittingSuggestion(false);
    }
  }, [suggestionCategory, suggestionMessage]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <>
      {/* Desktop Container - Enhanced with animations and backdrop blur */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="bg-white rounded-lg border border-gray-200 shadow-sm hidden md:block md:bg-white/95 md:backdrop-blur-md md:rounded-2xl md:border-gray-100"
        style={{
          boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 25px 50px -12px rgb(0 0 0 / 0.25)'
        }}
      >
        {/* Desktop Header */}
        <div className="flex border-b border-gray-100 px-6 py-5 items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl md:font-extrabold md:tracking-tight">Settings</h2>
            <p className="text-sm text-gray-600 mt-1 md:text-base">
              Manage your account settings and preferences
            </p>
          </div>

          {/* Progress Indicators and Action Buttons */}
          <div className="flex-shrink-0 flex flex-col items-end gap-3">
            <ProgressIndicators
              requiredFieldsCompleted={completionStats.required.completed}
              totalRequiredFields={completionStats.required.total}
              overallCompletionPercentage={completionStats.overall.percentage}
              variant="compact"
            />
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <motion.button
                onClick={() => router.push('/dashboard')}
                whileHover={{ x: -3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                className="py-1.5 px-2 text-sm font-medium whitespace-nowrap flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                Overview
              </motion.button>
              
              <button
                onClick={() => {
                  if (profileData?.user?.username) {
                    window.open(`/${profileData.user.username}`, '_blank');
                  }
                }}
                disabled={!profileData?.user?.username}
                className="py-1.5 px-2 text-sm font-medium whitespace-nowrap flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                View My Profile
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Section Navigation with hover animations */}
        <div className="border-b border-gray-100 px-6 overflow-hidden">
          <nav className="flex space-x-4" aria-label="Settings sections">
            {sections.map((section) => (
              <motion.button
                key={section.id}
                onClick={() => setActiveDesktopSection(section.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeDesktopSection === section.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {section.label}
              </motion.button>
            ))}
          </nav>
        </div>

        {/* Desktop Content */}
        <div className="px-6 py-6 min-h-[400px]">
          <div className="w-full max-w-5xl mx-auto">
            {renderDesktopSectionContent(activeDesktopSection)}
          </div>
        </div>
      </motion.div>

      {/* Mobile Accordion Sections */}
      <div className="md:hidden space-y-3">
        {/* Progress Indicators - Mobile */}
        <div className="mb-2 pb-2">
          <div className="flex justify-center">
            <ProgressIndicators
              requiredFieldsCompleted={completionStats.required.completed}
              totalRequiredFields={completionStats.required.total}
              overallCompletionPercentage={completionStats.overall.percentage}
              variant="minimal"
            />
          </div>
        </div>

        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedMobileSection === section.id;

          // Determine icon colors based on section type and membership status
          let iconBgClass = 'bg-gray-50';
          let iconColorClass = 'text-gray-500';

          if (section.id === 'membership' && profileData) {
            const membership = profileData.membership;
            const isExpired = membership?.state === 'EXPIRED';
            const daysUntilExpiry = membership?.daysUntilExpiry;
            
            if (isExpired || (daysUntilExpiry !== null && daysUntilExpiry !== undefined && daysUntilExpiry < 0)) {
              // Expired - red
              iconBgClass = 'bg-red-50';
              iconColorClass = 'text-[#d42027]';
            } else if (daysUntilExpiry !== null && daysUntilExpiry !== undefined && daysUntilExpiry <= 30) {
              // Expiring soon (≤30 days) - yellow/amber
              iconBgClass = 'bg-amber-50';
              iconColorClass = 'text-amber-600';
            } else {
              // Active - green
              iconBgClass = 'bg-green-50';
              iconColorClass = 'text-green-600';
            }
          }
          // privacy and support remain grey (default)

          return (
            <div
              key={section.id}
              ref={(el) => { sectionRefs.current[section.id] = el; }}
              className="!bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
            >
              {/* Section Header */}
              <button
                onClick={() => handleMobileSectionClick(section.id)}
                data-section={section.id}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors active:bg-gray-100"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`flex-shrink-0 w-10 h-10 ${iconBgClass} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${iconColorClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-base">
                      {section.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {section.description}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                )}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4 bg-white">
                  <div className="space-y-4">{renderSectionContent(section.id)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <ChangePasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
      
      <CloseAccountModal 
        isOpen={showCloseAccountModal}
        onClose={() => setShowCloseAccountModal(false)}
      />
    </>
  );
}

