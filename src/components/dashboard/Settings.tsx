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
import { useRouter, useSearchParams } from 'next/navigation';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { CloseAccountModal } from '@/components/settings/CloseAccountModal';
import { RenewalModal } from '@/components/dashboard/RenewalModal';
import { FeaturedUpgradeModal } from '@/components/dashboard/FeaturedUpgradeModal';
import { ProgressIndicators } from '@/components/dashboard/ProgressIndicators';
import { calculateCompletionStats } from '@/lib/utils/profile-completion';
import { calculateFinalExpiryForDisplay, isEligibleForEarlyRenewal, isEligibleForStandardRenewal } from '@/lib/membership-renewal';
import { formatDaysAsYearsMonthsDays } from '@/lib/date-format';
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
  const searchParams = useSearchParams();
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCloseAccountModal, setShowCloseAccountModal] = useState(false);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [renewalType, setRenewalType] = useState<'early' | 'standard' | '5year'>('early');
  const [featuredUpgradeModalOpen, setFeaturedUpgradeModalOpen] = useState(false);
  
  // Featured availability
  const [featuredAvailability, setFeaturedAvailability] = useState<{
    maxFeatured: number;
    featuredCount: number;
    remaining: number;
    nextAvailableAt: string | null;
  } | null>(null);
  
  // Featured waitlist state
  const [featuredWaitlistChecked, setFeaturedWaitlistChecked] = useState(false);
  const [joiningFeaturedWaitlist, setJoiningFeaturedWaitlist] = useState(false);
  
  // Support forms
  const [issueFormOpen, setIssueFormOpen] = useState(false);
  const [suggestionFormOpen, setSuggestionFormOpen] = useState(false);
  const [issueCategory, setIssueCategory] = useState('');
  const [issueMessage, setIssueMessage] = useState('');
  const [suggestionCategory, setSuggestionCategory] = useState('');
  const [suggestionMessage, setSuggestionMessage] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  
  // Verification request
  const [submittingVerification, setSubmittingVerification] = useState(false);
  
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

  // Fetch featured availability
  useEffect(() => {
    const fetchFeaturedAvailability = async () => {
      try {
        const response = await fetch('/api/featured/availability');
        if (response.ok) {
          const result = await response.json();
          setFeaturedAvailability(result);
          logger.log('[Settings] Featured availability loaded:', result);
        }
      } catch (err) {
        logger.error('[Settings] Failed to fetch featured availability:', err);
      }
    };
    fetchFeaturedAvailability();
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
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-[#d42027]" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Privacy Settings</h3>
                      <p className="text-xs text-gray-500">Control public profile visibility</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => {
                      sessionStorage.setItem('openProfileSection', 'privacy');
                      router.push('/dashboard/edit-profile');
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

            {/* Bottom 3 sections - side by side on desktop */}
            <div className="flex flex-col space-y-5 md:flex-row md:space-y-0 md:space-x-4 md:items-stretch">
              {/* Password */}
              <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm md:w-1/3 flex flex-col">
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                      <Lock className="w-5 h-5 text-[#d42027]" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Password</h3>
                      <p className="text-xs text-gray-500">Change your password</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setShowPasswordModal(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#d42027] rounded-lg hover:bg-[#a1181d] transition-all shadow-sm hover:shadow-md mt-auto"
                  >
                    Change Password
                  </motion.button>
                </div>
              </div>

              {/* Data Management */}
              <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm md:w-1/3 flex flex-col">
                <div className="p-6 flex flex-col flex-1">
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
                    className="w-full py-2.5 px-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md mt-auto"
                  >
                    {downloadingData && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Download className="w-4 h-4" />
                    <span>{downloadingData ? 'Preparing...' : 'Download Data'}</span>
                  </motion.button>
                </div>
              </div>

              {/* Close Account */}
              <div className="relative overflow-hidden rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white shadow-sm md:w-1/3 flex flex-col">
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-red-900">Close Account</h3>
                      <p className="text-xs text-red-600">Permanently delete your account</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setShowCloseAccountModal(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    title="This action cannot be undone. All your data will be permanently deleted."
                    className="w-full py-3 px-4 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all flex items-center justify-center space-x-2 shadow-sm hover:shadow-md mt-auto"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Close Account</span>
                  </motion.button>
                </div>
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
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-[#d42027]" />
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

                  <div className="flex justify-end">
                    <motion.button
                      type="submit"
                      disabled={submittingIssue}
                      whileHover={submittingIssue ? {} : { scale: 1.02 }}
                      whileTap={submittingIssue ? {} : { scale: 0.98 }}
                      className="px-6 py-2.5 text-sm font-semibold text-white bg-[#d42027] rounded-lg hover:bg-[#a1181d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all"
                    >
                      {submittingIssue && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{submittingIssue ? 'Submitting...' : 'Submit Issue'}</span>
                    </motion.button>
                  </div>
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
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-[#d42027]" />
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

                  <div className="flex justify-end">
                    <motion.button
                      type="submit"
                      disabled={submittingSuggestion}
                      whileHover={submittingSuggestion ? {} : { scale: 1.02 }}
                      whileTap={submittingSuggestion ? {} : { scale: 0.98 }}
                      className="px-6 py-2.5 text-sm font-semibold text-white bg-[#d42027] rounded-lg hover:bg-[#a1181d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all"
                    >
                      {submittingSuggestion && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{submittingSuggestion ? 'Submitting...' : 'Submit Suggestion'}</span>
                    </motion.button>
                  </div>
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
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-gray-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Membership Status</h3>
                      </div>
                      {isActive && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-green-700 bg-green-100 rounded-full border border-green-200">
                          ✓ Active
                        </span>
                      )}
                      {isExpired && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-red-700 bg-red-100 rounded-full border border-red-200">
                          ✗ Expired
                        </span>
                      )}
                      {hasNoExpiry && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full border border-gray-200">
                          Not Set
                        </span>
                      )}
                    </div>
                    
                    {membership?.expiresAt && (
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expires on</p>
                        <p className="text-base font-bold text-gray-900">
                          {new Date(membership.expiresAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                        {membership?.daysUntilExpiry !== null && membership?.daysUntilExpiry !== undefined && (
                          <p className={`text-xs font-medium ${
                            membership?.daysUntilExpiry < 0 
                              ? 'text-red-600' 
                              : membership?.daysUntilExpiry < 180 
                              ? 'text-amber-600' 
                              : 'text-gray-600'
                          }`}>
                            {membership?.daysUntilExpiry < 0 
                              ? `Expired ${formatDaysAsYearsMonthsDays(Math.abs(membership?.daysUntilExpiry))} ago` 
                              : `${formatDaysAsYearsMonthsDays(membership?.daysUntilExpiry)} remaining`}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {hasNoExpiry && (
                      <p className="text-xs text-gray-500">No membership expiry set. Please contact support.</p>
                    )}
                  </div>
                </div>

                {/* Membership & Upgrade Options */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                    <span>Membership & Upgrade Options</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Early Renewal Card (6+ months remaining) */}
                    {membership?.daysUntilExpiry != null && isEligibleForEarlyRenewal(membership.daysUntilExpiry) && (
                      <motion.button
                        onClick={() => {
                          setRenewalType('early');
                          setRenewalModalOpen(true);
                        }}
                        disabled={!profileData?.membership?.expiresAt}
                        whileHover={!profileData?.membership?.expiresAt ? {} : { scale: 1.02 }}
                        whileTap={!profileData?.membership?.expiresAt ? {} : { scale: 0.98 }}
                        className="flex-1 relative overflow-hidden rounded-xl border-2 p-4 sm:p-5 text-left transition-all duration-200 bg-gradient-to-br from-red-50 to-pink-50 border-[#d42027] hover:border-[#a1181d] cursor-pointer shadow-sm hover:shadow-md"
                      >
                        {/* Bonus Badge */}
                        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 px-2 py-0.5 sm:py-1 bg-[#d42027] text-white text-xs font-bold rounded-full shadow-sm">
                          BONUS!
                        </div>
                        
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex items-center justify-between pr-14 sm:pr-0">
                            <h5 className="text-sm sm:text-base font-bold text-gray-900">
                              Early Renewal
                            </h5>
                            <span className="text-lg sm:text-xl font-extrabold text-[#d42027]">
                              £25
                            </span>
                          </div>
                          
                          <p className="text-xs sm:text-sm leading-relaxed text-gray-700">
                            Get 1 year + 1 month bonus added to your current membership
                          </p>
                          
                          {profileData?.membership?.expiresAt && (
                            <div className="flex items-center space-x-2 pt-0.5 sm:pt-1">
                              <span className="text-xs font-semibold text-[#d42027]">
                                New expiry: {calculateFinalExpiryForDisplay(
                                  new Date(profileData.membership.expiresAt),
                                  'early'
                                ).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.button>
                    )}

                    {/* Standard Renewal Card (<6 months remaining) */}
                    {membership?.daysUntilExpiry != null && isEligibleForStandardRenewal(membership.daysUntilExpiry) && (
                      <motion.button
                        onClick={() => {
                          setRenewalType('standard');
                          setRenewalModalOpen(true);
                        }}
                        disabled={!profileData?.membership?.expiresAt}
                        whileHover={!profileData?.membership?.expiresAt ? {} : { scale: 1.02 }}
                        whileTap={!profileData?.membership?.expiresAt ? {} : { scale: 0.98 }}
                        className="flex-1 relative overflow-hidden rounded-xl border-2 p-4 sm:p-5 text-left transition-all duration-200 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-400 hover:border-blue-600 cursor-pointer shadow-sm hover:shadow-md"
                      >
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm sm:text-base font-bold text-gray-900">
                              Standard Renewal
                            </h5>
                            <span className="text-lg sm:text-xl font-extrabold text-[#d42027]">
                              £25
                            </span>
                          </div>
                          
                          <p className="text-xs sm:text-sm leading-relaxed text-gray-700">
                            Get 1 year added to your current membership
                          </p>
                          
                          {profileData?.membership?.expiresAt && (
                            <div className="flex items-center space-x-2 pt-0.5 sm:pt-1">
                              <span className="text-xs font-semibold text-blue-600">
                                New expiry: {calculateFinalExpiryForDisplay(
                                  new Date(profileData.membership.expiresAt),
                                  'standard'
                                ).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.button>
                    )}

                    {/* Neither option available - show disabled state */}
                    {(membership?.daysUntilExpiry == null || membership?.daysUntilExpiry < 0 || !profileData?.membership?.expiresAt) && (
                      <div className="flex-1 relative overflow-hidden rounded-xl border-2 p-4 sm:p-5 text-left bg-gray-50 border-gray-200 opacity-60">
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm sm:text-base font-bold text-gray-500">
                              Annual Renewal
                            </h5>
                            <span className="text-lg sm:text-xl font-extrabold text-gray-400">
                              £25
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm leading-relaxed text-gray-400">
                            {membership?.daysUntilExpiry != null && membership?.daysUntilExpiry < 0
                              ? 'Membership expired. Please use 5-year option to renew.'
                              : 'Not available. Please contact support.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 5-Year Membership Card */}
                    <motion.button
                      onClick={() => {
                        setRenewalType('5year');
                        setRenewalModalOpen(true);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative overflow-hidden rounded-xl border-2 border-gray-300 hover:border-[#d42027] bg-gradient-to-br from-gray-50 to-white p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md group"
                    >
                    {/* Best Value Badge */}
                    <div className="absolute top-2 sm:top-3 right-2 sm:right-3 px-2 py-0.5 sm:py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-gray-900 text-xs font-bold rounded-full shadow-sm">
                      SAVE £45
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-center justify-between pr-16 sm:pr-0">
                        <h5 className="text-sm sm:text-base font-bold text-gray-900">
                          5-Year Membership
                        </h5>
                        <span className="text-lg sm:text-xl font-extrabold text-[#d42027] group-hover:text-[#a1181d] transition-colors">
                          £80
                        </span>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                        Lock in the best rate and save £45 compared to annual renewals
                      </p>
                      
                      <div className="flex items-center space-x-2 pt-0.5 sm:pt-1">
                        <span className="text-xs font-semibold text-gray-600">
                          Extend to: {profileData?.membership?.expiresAt 
                            ? calculateFinalExpiryForDisplay(
                                new Date(profileData.membership.expiresAt),
                                '5year'
                              ).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })
                            : calculateFinalExpiryForDisplay(
                                null,
                                '5year'
                              ).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })
                          }
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 line-through">£125</span>
                      </div>
                    </div>
                    </motion.button>

                    {/* Featured Profile Upgrade Card */}
                    {(() => {
                      const isProfileComplete = completionStats.overall.percentage === 100;
                      const isMembershipActive = membership?.state === 'ACTIVE';
                      const isFeatured = profileData?.studio?.is_featured;
                      const featuredUntil = profileData?.studio?.featured_until;
                      
                      // Check if featured status is active (not expired)
                      const isFeaturedActive = isFeatured && (!featuredUntil || new Date(featuredUntil) >= new Date());
                      
                      // Check if slots are available
                      const slotsAvailable = featuredAvailability ? featuredAvailability.remaining > 0 : true;
                      
                      const isEligible = isProfileComplete && isMembershipActive && !isFeaturedActive && slotsAvailable;
                      
                      return (
                        <motion.button
                          onClick={() => {
                            if (isEligible) {
                              setFeaturedUpgradeModalOpen(true);
                            }
                          }}
                          disabled={!isEligible}
                          whileHover={isEligible ? { scale: 1.02 } : {}}
                          whileTap={isEligible ? { scale: 0.98 } : {}}
                          className={`relative overflow-hidden rounded-xl border-2 p-4 sm:p-5 text-left transition-all duration-200 shadow-sm ${
                            isEligible
                              ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-400 hover:border-amber-600 cursor-pointer hover:shadow-md'
                              : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          {/* Featured Badge */}
                          {isEligible && featuredAvailability && (
                            <div className="absolute top-2 sm:top-3 right-2 sm:right-3 px-2 py-0.5 sm:py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold rounded-full shadow-sm">
                              {featuredAvailability.remaining} OF 6 LEFT
                            </div>
                          )}
                          
                          <div className="space-y-1.5 sm:space-y-2">
                            <div className={`flex items-center justify-between ${isEligible ? 'pr-20 sm:pr-24' : ''}`}>
                              <h5 className={`text-sm sm:text-base font-bold ${isEligible ? 'text-gray-900' : 'text-gray-500'}`}>
                                Featured Studio Upgrade
                              </h5>
                              <span className={`text-lg sm:text-xl font-extrabold ${isEligible ? 'text-[#d42027]' : 'text-gray-400'}`}>
                                £100
                              </span>
                            </div>
                            
                            {isFeaturedActive ? (
                              <p className="text-xs sm:text-sm text-gray-600">
                                Your studio is currently featured until {featuredUntil ? new Date(featuredUntil).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                }) : 'indefinitely'}
                              </p>
                            ) : !isProfileComplete ? (
                              <p className="text-xs sm:text-sm text-gray-500">
                                Complete your profile (currently {completionStats.overall.percentage}%) to unlock featured status
                              </p>
                            ) : !isMembershipActive ? (
                              <p className="text-xs sm:text-sm text-gray-500">
                                Active membership required to become a featured studio
                              </p>
                            ) : !slotsAvailable ? (
                              <>
                                <p className="text-xs sm:text-sm text-gray-600 font-medium">
                                  All Featured slots are taken. 
                                  {featuredAvailability?.nextAvailableAt && (
                                    <> Next slot available on {new Date(featuredAvailability.nextAvailableAt).toLocaleDateString('en-GB', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                    })}.</>
                                  )}
                                </p>
                                <div className="mt-3 pt-3 border-t border-gray-300" onClick={(e) => e.stopPropagation()}>
                                  <label className="flex items-start cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={featuredWaitlistChecked}
                                      disabled={joiningFeaturedWaitlist}
                                      onChange={async (e) => {
                                        const isChecked = e.target.checked;
                                        setFeaturedWaitlistChecked(isChecked);
                                        
                                        if (isChecked && !joiningFeaturedWaitlist) {
                                          setJoiningFeaturedWaitlist(true);
                                          try {
                                            const response = await fetch('/api/waitlist', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ 
                                                name: profileData?.user?.display_name || 'User',
                                                email: profileData?.user?.email || '',
                                                type: 'FEATURED'
                                              }),
                                            });
                                            
                                            if (response.ok || response.status === 400) {
                                              // Success or already on list
                                              showSuccess('Added to Featured Studios waitlist! We\'ll notify you when a slot opens.');
                                            } else {
                                              throw new Error('Failed to join waitlist');
                                            }
                                          } catch (error) {
                                            showError('Failed to join waitlist. Please try again.');
                                            setFeaturedWaitlistChecked(false);
                                          } finally {
                                            setJoiningFeaturedWaitlist(false);
                                          }
                                        }
                                      }}
                                      className="mt-0.5 h-4 w-4 text-amber-600 accent-amber-600 border-gray-300 rounded focus:ring-amber-500 focus:ring-2 focus:ring-offset-0 transition-colors"
                                    />
                                    <div className="ml-3 flex-1">
                                      <span className="text-xs sm:text-sm font-medium text-gray-700 block">
                                        Join the Featured Studios waitlist
                                      </span>
                                      <span className="text-xs text-gray-500 block mt-0.5">
                                        We'll email you when a Featured slot becomes available
                                      </span>
                                    </div>
                                  </label>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-xs sm:text-sm leading-relaxed text-gray-700 font-medium">
                                  Only {featuredAvailability?.remaining || 0} out of 6 Featured slots available — secure yours before they're gone!
                                </p>
                                <p className="text-xs sm:text-sm leading-relaxed text-gray-600">
                                  Get featured on the homepage for 6 months with priority search placement
                                </p>
                                <div className="flex items-center space-x-2 pt-0.5 sm:pt-1">
                                  <span className="text-xs font-semibold text-amber-600">
                                    ✓ Homepage placement • ✓ Priority search • ✓ Increased visibility
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.button>
                      );
                    })()}

                    {/* Request Verified Badge Card */}
                    {(() => {
                      const isVerified = profileData?.studio?.is_verified;
                      const isMembershipActive = membership?.state === 'ACTIVE';
                      const profileCompletion = completionStats.overall.percentage;
                      const isEligible = !isVerified && isMembershipActive && profileCompletion >= 85;
                      const needsCompletion = !isVerified && profileCompletion < 85;
                      
                      return (
                        <motion.button
                          onClick={() => {
                            if (submittingVerification) return;
                            
                            if (isVerified) {
                              // Already verified - do nothing
                              return;
                            } else if (!isMembershipActive) {
                              showError('Active membership required to request verification');
                              return;
                            } else if (needsCompletion) {
                              showError('Complete your profile to at least 85% to request verification');
                              // Scroll to profile section to help user
                              const profileSection = document.querySelector('[data-section="profile"]');
                              if (profileSection) {
                                profileSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                              return;
                            } else if (isEligible) {
                              handleVerificationRequest();
                            }
                          }}
                          disabled={isVerified || !isMembershipActive || submittingVerification}
                          whileHover={isEligible && !submittingVerification ? { scale: 1.02 } : {}}
                          whileTap={isEligible && !submittingVerification ? { scale: 0.98 } : {}}
                          className={`relative overflow-hidden rounded-xl border-2 p-4 sm:p-5 text-left transition-all duration-200 shadow-sm ${
                            isVerified
                              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400 cursor-default'
                              : isEligible && !submittingVerification
                              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400 hover:border-green-600 cursor-pointer hover:shadow-md'
                              : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="space-y-1.5 sm:space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm sm:text-base font-bold flex items-center space-x-2"
                                  style={{ color: isVerified || isEligible ? '#1a1a1a' : '#6b7280' }}>
                                <span>Request Verified Badge</span>
                                {submittingVerification ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                                ) : (
                                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0 ${
                                    isVerified || isEligible ? 'bg-green-600' : 'bg-gray-400'
                                  }`}>
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                      <path d="M5 13l4 4L19 7"></path>
                                    </svg>
                                  </span>
                                )}
                              </h5>
                              {isVerified && (
                                <span className="text-sm font-semibold text-green-600">
                                  ✓ Verified
                                </span>
                              )}
                            </div>
                            
                            {isVerified ? (
                              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                                Your studio profile has been verified. The verified badge is displayed on your public profile page.
                              </p>
                            ) : needsCompletion ? (
                              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                                Complete your profile to at least 85% to request your studio be verified. Currently at {profileCompletion}%.
                              </p>
                            ) : !isMembershipActive ? (
                              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                                Active membership required to request verified status
                              </p>
                            ) : submittingVerification ? (
                              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                                Submitting verification request...
                              </p>
                            ) : (
                              <>
                                <p className="text-xs sm:text-sm leading-relaxed text-gray-700">
                                  Apply for verified status to show clients your studio has been approved by our team
                                </p>
                                <div className="flex items-center space-x-2 pt-0.5 sm:pt-1">
                                  <span className="text-xs font-semibold text-green-600">
                                    ✓ Profile complete • ✓ Ready to apply
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.button>
                      );
                    })()}
                  </div>
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
        // Desktop: collapsible forms
        return (
          <div className="space-y-5">
            {/* Report an Issue - Collapsible */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
              <motion.button
                onClick={() => setIssueFormOpen(!issueFormOpen)}
                whileHover={{ scale: 1.01 }}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-[#d42027]" />
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
                <form onSubmit={handleSubmitIssue} className="px-6 pb-6 border-t border-gray-200 pt-5 space-y-4 bg-white">
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

                  <div className="flex justify-end">
                    <motion.button
                      type="submit"
                      disabled={submittingIssue}
                      whileHover={submittingIssue ? {} : { scale: 1.02 }}
                      whileTap={submittingIssue ? {} : { scale: 0.98 }}
                      className="px-6 py-2.5 text-sm font-semibold text-white bg-[#d42027] rounded-lg hover:bg-[#a1181d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all"
                    >
                      {submittingIssue && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{submittingIssue ? 'Submitting...' : 'Submit Issue'}</span>
                    </motion.button>
                  </div>
                </form>
              )}
            </div>

            {/* Make a Suggestion - Collapsible */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
              <motion.button
                onClick={() => setSuggestionFormOpen(!suggestionFormOpen)}
                whileHover={{ scale: 1.01 }}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-[#d42027]" />
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
                <form onSubmit={handleSubmitSuggestion} className="px-6 pb-6 border-t border-gray-200 pt-5 space-y-4 bg-white">
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

                  <div className="flex justify-end">
                    <motion.button
                      type="submit"
                      disabled={submittingSuggestion}
                      whileHover={submittingSuggestion ? {} : { scale: 1.02 }}
                      whileTap={submittingSuggestion ? {} : { scale: 0.98 }}
                      className="px-6 py-2.5 text-sm font-semibold text-white bg-[#d42027] rounded-lg hover:bg-[#a1181d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all"
                    >
                      {submittingSuggestion && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{submittingSuggestion ? 'Submitting...' : 'Submit Suggestion'}</span>
                    </motion.button>
                  </div>
                </form>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Handle verification request
  const handleVerificationRequest = useCallback(async () => {
    if (submittingVerification) return;
    
    setSubmittingVerification(true);
    
    try {
      const response = await fetch('/api/membership/request-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit verification request');
      }

      showSuccess('Verification request submitted! Our team will review your profile and get back to you shortly.');
      logger.log('[SUCCESS] Verification request submitted');

      // Refresh profile data to update UI
      const profileResponse = await fetch('/api/user/profile');
      if (profileResponse.ok) {
        const profileResult = await profileResponse.json();
        setProfileData(profileResult.data);
      }

    } catch (err: any) {
      logger.error('Error submitting verification request:', err);
      showError(err.message || 'Failed to submit verification request');
    } finally {
      setSubmittingVerification(false);
    }
  }, [submittingVerification]);

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
            } else if (daysUntilExpiry !== null && daysUntilExpiry !== undefined && daysUntilExpiry < 180) {
              // Last 6 months (<180 days) - yellow/amber
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
        {...(profileData?.membership?.expiresAt ? {
          currentExpiry: new Date(profileData.membership.expiresAt)
        } : {})}
        daysRemaining={profileData?.membership?.daysUntilExpiry || 0}
      />
      
      <FeaturedUpgradeModal
        isOpen={featuredUpgradeModalOpen}
        onClose={() => setFeaturedUpgradeModalOpen(false)}
      />
    </>
  );
}

