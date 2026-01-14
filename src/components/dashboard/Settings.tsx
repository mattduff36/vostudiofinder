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
  ArrowLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { CloseAccountModal } from '@/components/settings/CloseAccountModal';
import { RenewalModal } from '@/components/dashboard/RenewalModal';
import { ProgressIndicators } from '@/components/dashboard/ProgressIndicators';
import { calculateCompletionStats } from '@/lib/utils/profile-completion';
import { logger } from '@/lib/logger';
import { showSuccess, showError } from '@/lib/toast';

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCloseAccountModal, setShowCloseAccountModal] = useState(false);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [renewalType, setRenewalType] = useState<'early' | '5year'>('early');
  
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

  // Read section from URL parameters and set active section
  useEffect(() => {
    const sectionParam = searchParams.get('section');
    if (sectionParam && ['membership', 'privacy', 'support'].includes(sectionParam)) {
      setActiveDesktopSection(sectionParam);
      setExpandedMobileSection(sectionParam);
      logger.log(`[Settings] Opening section from URL: ${sectionParam}`);
    }
    
    // Support direct modal opening via URL (e.g., ?action=change-password)
    const actionParam = searchParams.get('action');
    if (actionParam === 'change-password') {
      // Open privacy section and password modal
      setActiveDesktopSection('privacy');
      setExpandedMobileSection('privacy');
      setShowPasswordModal(true);
      logger.log('[Settings] Opening Change Password modal from URL');
    }
  }, [searchParams]);


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
          <div className="space-y-5">
            {/* Privacy Settings */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Privacy Settings</h3>
                      <p className="text-xs text-gray-500">Control public profile visibility</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => {
                      sessionStorage.setItem('openProfileSection', 'privacy');
                      window.location.href = '/dashboard#edit-profile';
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-3 py-1.5 text-xs font-semibold text-[#d42027] hover:text-white bg-red-50 hover:bg-[#d42027] border border-[#d42027] rounded-lg transition-all flex items-center space-x-1"
                  >
                    <span>Manage</span>
                    <ExternalLink className="w-3 h-3" />
                  </motion.button>
                </div>
                
                <div className="space-y-2">
                  {loadingProfile ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-white border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">Email Address</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{profileData?.user?.email || data.user.email}</p>
                        </div>
                        <span className={`ml-3 px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${
                          profileData?.profile?.show_email 
                            ? 'text-green-700 bg-green-100 border border-green-200' 
                            : 'text-gray-500 bg-gray-100 border border-gray-200'
                        }`}>
                          {profileData?.profile?.show_email ? '👁 Visible' : '🔒 Hidden'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-white border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">Phone Number</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{profileData?.studio?.phone || 'No phone number set'}</p>
                        </div>
                        <span className={`ml-3 px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${
                          profileData?.profile?.show_phone 
                            ? 'text-green-700 bg-green-100 border border-green-200' 
                            : 'text-gray-500 bg-gray-100 border border-gray-200'
                        }`}>
                          {profileData?.profile?.show_phone ? '👁 Visible' : '🔒 Hidden'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-white border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">Studio Address</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{profileData?.studio?.full_address || 'No address set'}</p>
                        </div>
                        <span className={`ml-3 px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${
                          profileData?.profile?.show_address 
                            ? 'text-green-700 bg-green-100 border border-green-200' 
                            : 'text-gray-500 bg-gray-100 border border-gray-200'
                        }`}>
                          {profileData?.profile?.show_address ? '👁 Visible' : '🔒 Hidden'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Account Security */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Lock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Account Security</h3>
                    <p className="text-xs text-gray-500">Protect your account</p>
                  </div>
                </div>
                <motion.button
                  onClick={() => setShowPasswordModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#d42027] rounded-lg hover:bg-[#a1181d] transition-all shadow-sm hover:shadow-md"
                >
                  Change Password
                </motion.button>
              </div>
            </div>

            {/* Data Management */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Download className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Data Management</h3>
                    <p className="text-xs text-gray-500">Export or delete your data</p>
                  </div>
                </div>
                <motion.button
                  onClick={handleDownloadData}
                  disabled={downloadingData}
                  whileHover={downloadingData ? {} : { scale: 1.02 }}
                  whileTap={downloadingData ? {} : { scale: 0.98 }}
                  className="w-full py-3 px-4 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
                >
                  {downloadingData && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Download className="w-4 h-4" />
                  <span>{downloadingData ? 'Preparing Download...' : 'Download My Data'}</span>
                </motion.button>
              </div>
            </div>

            {/* Close Account */}
            <div className="relative overflow-hidden rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white shadow-sm">
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-red-900">Close Account</h3>
                    <p className="text-xs text-red-600">Permanently delete your account</p>
                  </div>
                </div>
                <p className="text-sm text-red-700 mb-4">This action cannot be undone. All your data will be permanently deleted.</p>
                <motion.button
                  onClick={() => setShowCloseAccountModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 px-4 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Close Account</span>
                </motion.button>
              </div>
            </div>
          </div>
        );

      case 'support':
        return (
          <div className="space-y-5">
            {/* Report an Issue */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
              <motion.button
                onClick={() => setIssueFormOpen(!issueFormOpen)}
                whileHover={{ scale: 1.01 }}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-semibold text-gray-900">Report an Issue</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Having trouble? Let us know</p>
                  </div>
                </div>
                {issueFormOpen ? 
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                }
              </motion.button>

              {issueFormOpen && (
                <form onSubmit={handleSubmitIssue} className="p-5 border-t border-gray-200 space-y-4 bg-white">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <select
                      value={issueCategory}
                      onChange={(e) => setIssueCategory(e.target.value)}
                      disabled={submittingIssue}
                      className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d42027] focus:border-transparent"
                      required
                    >
                      <option value="">Select a category</option>
                      {ISSUE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={issueMessage}
                      onChange={(e) => setIssueMessage(e.target.value)}
                      disabled={submittingIssue}
                      rows={4}
                      placeholder="Please describe the issue in detail..."
                      className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d42027] focus:border-transparent resize-none"
                      required
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={submittingIssue}
                    whileHover={submittingIssue ? {} : { scale: 1.02 }}
                    whileTap={submittingIssue ? {} : { scale: 0.98 }}
                    className="w-full px-4 py-3 text-sm font-semibold text-white bg-[#d42027] rounded-lg hover:bg-[#a1181d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all"
                  >
                    {submittingIssue && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{submittingIssue ? 'Submitting...' : 'Submit Issue'}</span>
                  </motion.button>
                </form>
              )}
            </div>

            {/* Make a Suggestion */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
              <motion.button
                onClick={() => setSuggestionFormOpen(!suggestionFormOpen)}
                whileHover={{ scale: 1.01 }}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-semibold text-gray-900">Make a Suggestion</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Share your ideas with us</p>
                  </div>
                </div>
                {suggestionFormOpen ? 
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                }
              </motion.button>

              {suggestionFormOpen && (
                <form onSubmit={handleSubmitSuggestion} className="p-5 border-t border-gray-200 space-y-4 bg-white">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <select
                      value={suggestionCategory}
                      onChange={(e) => setSuggestionCategory(e.target.value)}
                      disabled={submittingSuggestion}
                      className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d42027] focus:border-transparent"
                      required
                    >
                      <option value="">Select a category</option>
                      {SUGGESTION_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Your Suggestion</label>
                    <textarea
                      value={suggestionMessage}
                      onChange={(e) => setSuggestionMessage(e.target.value)}
                      disabled={submittingSuggestion}
                      rows={4}
                      placeholder="Tell us your idea..."
                      className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d42027] focus:border-transparent resize-none"
                      required
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={submittingSuggestion}
                    whileHover={submittingSuggestion ? {} : { scale: 1.02 }}
                    whileTap={submittingSuggestion ? {} : { scale: 0.98 }}
                    className="w-full px-4 py-3 text-sm font-semibold text-white bg-[#d42027] rounded-lg hover:bg-[#a1181d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all"
                  >
                    {submittingSuggestion && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{submittingSuggestion ? 'Submitting...' : 'Submit Suggestion'}</span>
                  </motion.button>
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
                {/* Admin Account Warning Banner */}
                {isAdminUser && (
                  <div className="p-2 bg-red-50 rounded-md border border-red-200">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">👑</span>
                      <p className="text-xs font-medium text-red-900">
                        Admin Account - Content shown for development purposes
                      </p>
                    </div>
                  </div>
                )}

                {/* Membership Display */}
                {(() => {
                  const membership = profileData?.membership;
                  const isActive = membership?.state === 'ACTIVE';
                  const isExpired = membership?.state === 'EXPIRED';
                  const hasNoExpiry = membership?.state === 'NONE_SET';
                  
                  return (
              <>
                {/* Status Card */}
                <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-5 h-5 text-gray-600" />
                        <h3 className="text-base font-semibold text-gray-900">Membership Status</h3>
                      </div>
                      {isActive && (
                        <span className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full border border-green-200 shadow-sm">
                          ✓ Active
                        </span>
                      )}
                      {isExpired && (
                        <span className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full border border-red-200 shadow-sm">
                          ✗ Expired
                        </span>
                      )}
                      {hasNoExpiry && (
                        <span className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full border border-gray-200 shadow-sm">
                          Not Set
                        </span>
                      )}
                    </div>
                    
                    {membership?.expiresAt && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expires on</p>
                        <p className="text-lg font-bold text-gray-900">
                          {new Date(membership.expiresAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                        {membership?.daysUntilExpiry !== null && membership?.daysUntilExpiry !== undefined && (
                          <p className={`text-sm font-medium ${
                            membership.daysUntilExpiry < 0 
                              ? 'text-red-600' 
                              : membership.daysUntilExpiry <= 30 
                              ? 'text-amber-600' 
                              : 'text-gray-600'
                          }`}>
                            {membership.daysUntilExpiry < 0 
                              ? `Expired ${Math.abs(membership.daysUntilExpiry)} days ago` 
                              : `${membership.daysUntilExpiry} days remaining`}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {hasNoExpiry && (
                      <p className="text-sm text-gray-500">No membership expiry set. Please contact support.</p>
                    )}
                  </div>
                </div>

                {/* Renewal Options */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                    <span>Renewal Options</span>
                  </h4>
                  
                  {/* Early Renewal Card */}
                  <motion.button
                    onClick={() => {
                      const days = membership.daysUntilExpiry ?? 0;
                      if (days < 30) {
                        showError('Early renewal bonus requires at least 30 days remaining on your current membership.');
                        return;
                      }
                      setRenewalType('early');
                      setRenewalModalOpen(true);
                    }}
                    disabled={!membership.daysUntilExpiry || membership.daysUntilExpiry < 30}
                    whileHover={(!membership.daysUntilExpiry || membership.daysUntilExpiry < 30) ? {} : { scale: 1.02 }}
                    whileTap={(!membership.daysUntilExpiry || membership.daysUntilExpiry < 30) ? {} : { scale: 0.98 }}
                    className={`w-full relative overflow-hidden rounded-xl border-2 p-5 text-left transition-all duration-200 ${
                      !membership.daysUntilExpiry || membership.daysUntilExpiry < 30
                        ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-br from-red-50 to-pink-50 border-[#d42027] hover:border-[#a1181d] cursor-pointer shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Decorative Badge - Only show when enabled */}
                    {membership.daysUntilExpiry && membership.daysUntilExpiry >= 30 && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-[#d42027] text-white text-xs font-bold rounded-full shadow-sm">
                        BONUS!
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className={`text-base font-bold ${
                          !membership.daysUntilExpiry || membership.daysUntilExpiry < 30 
                            ? 'text-gray-500' 
                            : 'text-gray-900'
                        }`}>
                          Early Renewal
                        </h5>
                        <span className={`text-xl font-extrabold ${
                          !membership.daysUntilExpiry || membership.daysUntilExpiry < 30 
                            ? 'text-gray-400' 
                            : 'text-[#d42027]'
                        }`}>
                          £25
                        </span>
                      </div>
                      
                      <p className={`text-sm leading-relaxed ${
                        !membership.daysUntilExpiry || membership.daysUntilExpiry < 30 
                          ? 'text-gray-400' 
                          : 'text-gray-700'
                      }`}>
                        {!membership.daysUntilExpiry || membership.daysUntilExpiry < 30 
                          ? 'Available when you have 30+ days remaining'
                          : 'Get 1 year + 1 month bonus added to your current membership'
                        }
                      </p>
                      
                      {(!membership.daysUntilExpiry || membership.daysUntilExpiry >= 30) && (
                        <div className="flex items-center space-x-2 pt-1">
                          <span className="text-xs font-semibold text-[#d42027]">365 days + 30 day bonus</span>
                        </div>
                      )}
                    </div>
                  </motion.button>

                  {/* 5-Year Membership Card */}
                  <motion.button
                    onClick={() => {
                      setRenewalType('5year');
                      setRenewalModalOpen(true);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full relative overflow-hidden rounded-xl border-2 border-gray-300 hover:border-[#d42027] bg-gradient-to-br from-gray-50 to-white p-5 text-left transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md group"
                  >
                    {/* Best Value Badge */}
                    <div className="absolute top-3 right-3 px-2 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-gray-900 text-xs font-bold rounded-full shadow-sm">
                      SAVE £45
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="text-base font-bold text-gray-900">
                          5-Year Membership
                        </h5>
                        <span className="text-xl font-extrabold text-[#d42027] group-hover:text-[#a1181d] transition-colors">
                          £80
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Lock in the best rate and save £45 compared to annual renewals
                      </p>
                      
                      <div className="flex items-center space-x-2 pt-1">
                        <span className="text-xs font-semibold text-gray-600">1,825 days (5 full years)</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 line-through">£125</span>
                      </div>
                    </div>
                  </motion.button>
                </div>
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
          <div className="space-y-5">
            {/* Report an Issue - Always visible */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Report an Issue</h3>
                    <p className="text-xs text-gray-500">Having trouble? Let us know</p>
                  </div>
                </div>
                <form onSubmit={handleSubmitIssue} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <select
                      value={issueCategory}
                      onChange={(e) => setIssueCategory(e.target.value)}
                      disabled={submittingIssue}
                      className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d42027] focus:border-transparent"
                      required
                    >
                      <option value="">Select a category</option>
                      {ISSUE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={issueMessage}
                      onChange={(e) => setIssueMessage(e.target.value)}
                      disabled={submittingIssue}
                      rows={4}
                      placeholder="Please describe the issue in detail..."
                      className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d42027] focus:border-transparent resize-none"
                      required
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={submittingIssue}
                    whileHover={submittingIssue ? {} : { scale: 1.02 }}
                    whileTap={submittingIssue ? {} : { scale: 0.98 }}
                    className="w-full px-4 py-3 text-sm font-semibold text-white bg-[#d42027] rounded-lg hover:bg-[#a1181d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all"
                  >
                    {submittingIssue && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{submittingIssue ? 'Submitting...' : 'Submit Issue'}</span>
                  </motion.button>
                </form>
              </div>
            </div>

            {/* Make a Suggestion - Always visible */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Make a Suggestion</h3>
                    <p className="text-xs text-gray-500">Share your ideas with us</p>
                  </div>
                </div>
                <form onSubmit={handleSubmitSuggestion} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <select
                      value={suggestionCategory}
                      onChange={(e) => setSuggestionCategory(e.target.value)}
                      disabled={submittingSuggestion}
                      className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d42027] focus:border-transparent"
                      required
                    >
                      <option value="">Select a category</option>
                      {SUGGESTION_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Your Suggestion</label>
                    <textarea
                      value={suggestionMessage}
                      onChange={(e) => setSuggestionMessage(e.target.value)}
                      disabled={submittingSuggestion}
                      rows={4}
                      placeholder="Tell us your idea..."
                      className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d42027] focus:border-transparent resize-none"
                      required
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={submittingSuggestion}
                    whileHover={submittingSuggestion ? {} : { scale: 1.02 }}
                    whileTap={submittingSuggestion ? {} : { scale: 0.98 }}
                    className="w-full px-4 py-3 text-sm font-semibold text-white bg-[#d42027] rounded-lg hover:bg-[#a1181d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all"
                  >
                    {submittingSuggestion && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{submittingSuggestion ? 'Submitting...' : 'Submit Suggestion'}</span>
                  </motion.button>
                </form>
              </div>
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
              <button
                onClick={() => {
                  // Dashboard routes are hash-driven by DashboardContent.
                  // Using Next's router.push with a hash doesn't reliably fire `hashchange`, so we set `window.location.hash` explicitly.
                  if (pathname === '/dashboard') {
                    if (window.location.hash) window.location.hash = '';
                    return;
                  }
                  router.push('/dashboard');
                }}
                className="py-1.5 px-2 text-sm font-medium whitespace-nowrap flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                Overview
              </button>
              
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
      
      <RenewalModal
        isOpen={renewalModalOpen}
        onClose={() => setRenewalModalOpen(false)}
        renewalType={renewalType}
        {...(profileData?.membership?.expiresAt && {
          currentExpiry: new Date(profileData.membership.expiresAt)
        })}
        daysRemaining={profileData?.membership?.daysUntilExpiry || 0}
      />
    </>
  );
}

