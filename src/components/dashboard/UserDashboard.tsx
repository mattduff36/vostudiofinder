'use client';

import { useCallback, useMemo, useState, useEffect, type ReactNode } from 'react';
import { 
  Activity,
  Eye,
  EyeOff,
  CheckCircle2,
  BarChart3,
  Camera,
  PenTool,
  Link,
  Megaphone,
  Brain,
  Trophy,
  Star,
  Globe,
  Target,
  MessageSquare,
  Check,
  Share2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ProfileCompletionProgress } from '@/components/profile/ProfileCompletionProgress';
import { ProfileCompletionAnimation } from '@/components/dashboard/ProfileCompletionAnimation';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { ShareProfileButton } from '@/components/profile/ShareProfileButton';
import { logger } from '@/lib/logger';
import { showError, showSuccess } from '@/lib/toast';
import { getBaseUrl } from '@/lib/seo/site';
import { useProfileAnimation } from '@/hooks/useProfileAnimation';
import { calculateCompletionStats } from '@/lib/utils/profile-completion';
import type { ProfileData } from '@/types/profile';

// Simple in-module cache to avoid re-fetch/judder when returning to the Overview tab
// (and to reduce duplicate fetches in React StrictMode during dev).
let cachedProfileData: ProfileData | null = null;
let cachedProfileFetchedAt = 0;
let inFlightProfileFetch: Promise<ProfileData | null> | null = null;

function getCachedProfileAgeMs(): number {
  if (!cachedProfileFetchedAt) return Number.POSITIVE_INFINITY;
  return Date.now() - cachedProfileFetchedAt;
}

/**
 * Invalidate the cached profile data.
 * Call this after profile updates to ensure fresh data on next load.
 */
export function invalidateProfileCache(): void {
  cachedProfileData = null;
  cachedProfileFetchedAt = 0;
  logger.log('[UserDashboard] Profile cache invalidated');
}

interface UserDashboardProps {
  data: {
    user: {
      id: string;
      display_name: string;
      email: string;
      username: string;
      role: string;
      avatar_url?: string;
    };
    stats: {
      studiosOwned: number;
      reviewsWritten: number;
      totalConnections: number;
      unreadMessages: number;
    };
    studios: Array<{
      id: string;
      name: string;
      studio_type: string;
      status: string;
      is_premium: boolean;
      created_at: Date;
      _count: { reviews: number };
    }>;
    reviews: Array<{
      id: string;
      rating: number;
      content: string;
      created_at: Date;
      studio: {
        id: string;
        name: string;
      };
    }>;
    messages: Array<{
      id: string;
      subject: string;
      isRead: boolean;
      created_at: Date;
      sender_id: string;
      receiver_id: string;
      sender: {
        display_name: string;
        avatar_url?: string;
      };
      receiver: {
        display_name: string;
        avatar_url?: string;
      };
      studio?: {
        name: string;
      };
    }>;
    connections: Array<{
      id: string;
      user_id: string;
      connected_user_id: string;
      user: {
        id: string;
        display_name: string;
        avatar_url?: string;
      };
      connectedUser: {
        id: string;
        display_name: string;
        avatar_url?: string;
      };
    }>;
  };
  initialProfileData?: ProfileData | null;
}

export function UserDashboard({ data, initialProfileData }: UserDashboardProps) {
  const { user } = data;
  const [profileData, setProfileData] = useState<ProfileData | null>(() => initialProfileData ?? null);
  const [loading, setLoading] = useState<boolean>(() => !initialProfileData);
  const [isProfileVisible, setIsProfileVisible] = useState<boolean>(() => {
    if (!initialProfileData) return true;
    if (initialProfileData.studio) return initialProfileData.studio.is_profile_visible !== false;
    return false;
  });
  const [saving, setSaving] = useState(false);

  // Animation hook for profile completion widget (desktop only)
  const { shouldAnimate, isDesktop, markAnimationComplete } = useProfileAnimation();

  // Listen for visibility changes from other components (e.g., burger menu)
  useEffect(() => {
    const handleVisibilityChange = (event: CustomEvent<{ isVisible: boolean }>) => {
      setIsProfileVisible(event.detail.isVisible);
    };
    
    window.addEventListener('profile-visibility-changed', handleVisibilityChange as EventListener);
    return () => {
      window.removeEventListener('profile-visibility-changed', handleVisibilityChange as EventListener);
    };
  }, []);

  const completionStats = useMemo(() => {
    if (!profileData) return { percentage: 0, allRequiredComplete: false };

    const stats = calculateCompletionStats({
      user: {
        username: profileData.user?.username || '',
        display_name: profileData.user?.display_name || '',
        email: profileData.user?.email || '',
        avatar_url: profileData.user?.avatar_url || null,
      },
      profile: {
        short_about: profileData.profile?.short_about || null,
        about: profileData.profile?.about || null,
        phone: profileData.profile?.phone || null,
        location: profileData.profile?.location || null,
        connection1: profileData.profile?.connection1 || null,
        connection2: profileData.profile?.connection2 || null,
        connection3: profileData.profile?.connection3 || null,
        connection4: profileData.profile?.connection4 || null,
        connection5: profileData.profile?.connection5 || null,
        connection6: profileData.profile?.connection6 || null,
        connection7: profileData.profile?.connection7 || null,
        connection8: profileData.profile?.connection8 || null,
        connection9: profileData.profile?.connection9 || null,
        connection10: profileData.profile?.connection10 || null,
        connection11: profileData.profile?.connection11 || null,
        connection12: profileData.profile?.connection12 || null,
        rate_tier_1: profileData.profile?.rate_tier_1 || null,
        equipment_list: profileData.profile?.equipment_list || null,
        services_offered: profileData.profile?.services_offered || null,
        facebook_url: profileData.profile?.facebook_url || null,
        x_url: profileData.profile?.x_url || null,
        linkedin_url: profileData.profile?.linkedin_url || null,
        instagram_url: profileData.profile?.instagram_url || null,
        youtube_url: profileData.profile?.youtube_url || null,
        tiktok_url: profileData.profile?.tiktok_url || null,
        threads_url: profileData.profile?.threads_url || null,
        soundcloud_url: profileData.profile?.soundcloud_url || null,
      },
      studio: {
        name: profileData.studio?.name || null,
        studio_types: profileData.studio?.studio_types?.map((st) => st.name) || [],
        images: profileData.studio?.images || [],
        website_url: profileData.studio?.website_url || null,
      },
    });

    return {
      percentage: stats.overall.percentage,
      allRequiredComplete: stats.required.completed === stats.required.total,
    };
  }, [profileData]);

  const completionPercentage = completionStats.percentage;

  const renderCompletionWidget = useCallback(
    (widget: ReactNode) => (
      <ProfileCompletionAnimation
        shouldAnimate={shouldAnimate && isDesktop}
        onAnimationComplete={markAnimationComplete}
        completionPercentage={completionPercentage}
        allRequiredComplete={completionStats.allRequiredComplete}
      >
        {widget}
      </ProfileCompletionAnimation>
    ),
    [shouldAnimate, isDesktop, markAnimationComplete, completionPercentage, completionStats.allRequiredComplete]
  );

  // Fetch profile data for completion progress
  useEffect(() => {
    let didCancel = false;

    // Only use initialProfileData if cache hasn't been explicitly invalidated
    // If cache is null but we have initialProfileData, it means cache was invalidated
    // and we should fetch fresh data, not reuse the stale initialProfileData
    if (initialProfileData && cachedProfileFetchedAt > 0) {
      cachedProfileData = initialProfileData;
      cachedProfileFetchedAt = Date.now();
    }

    const applyProfileData = (nextProfileData: ProfileData) => {
      if (didCancel) return;
      setProfileData(nextProfileData);

      // Set initial visibility state from studio data
      if (nextProfileData.studio) {
        const visible = nextProfileData.studio.is_profile_visible !== false;
        setIsProfileVisible(visible);
      } else {
        // No studio yet - default to hidden
        setIsProfileVisible(false);
      }

      setLoading(false);
    };

    const fetchProfile = async (): Promise<ProfileData | null> => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const result = await response.json();
          return result.data as ProfileData;
        }
      } catch (err) {
        logger.error('Failed to fetch profile:', err);
      }

      return null;
    };

    const loadProfile = async () => {
      // If another page updated the profile, force a refetch (bypass 5m cache)
      try {
        if (sessionStorage.getItem('invalidateProfileCache') === '1') {
          sessionStorage.removeItem('invalidateProfileCache');
          invalidateProfileCache();
        }
      } catch {
        // ignore (e.g. SSR / restricted environments)
      }

      const cacheAgeMs = getCachedProfileAgeMs();
      const isCacheFresh = !!cachedProfileData && cacheAgeMs < 5 * 60 * 1000; // 5 minutes

      if (isCacheFresh && cachedProfileData) {
        applyProfileData(cachedProfileData);
        return;
      }

      // Only show the placeholder if we don't already have content to render
      if (!initialProfileData && !cachedProfileData) setLoading(true);

      // De-dupe in-flight fetches (StrictMode/dev + quick tab switches)
      if (!inFlightProfileFetch) {
        inFlightProfileFetch = (async () => {
          const next = await fetchProfile();
          if (next) {
            cachedProfileData = next;
            cachedProfileFetchedAt = Date.now();
          }
          return next;
        })().finally(() => {
          inFlightProfileFetch = null;
        });
      }

      const nextProfileData = await inFlightProfileFetch;
      if (nextProfileData) applyProfileData(nextProfileData);
      else if (!didCancel) setLoading(false);
    };

    loadProfile();

    // Refetch when window regains focus (in case admin changed it)
    const handleFocus = () => {
      void loadProfile();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      didCancel = true;
      window.removeEventListener('focus', handleFocus);
    };
  }, [initialProfileData]);

  // Use allRequiredComplete from completionStats (single source of truth)
  const allRequiredComplete = completionStats.allRequiredComplete;

  // If required fields become incomplete while visible, force visibility OFF.
  useEffect(() => {
    if (!allRequiredComplete && isProfileVisible) {
      setIsProfileVisible(false);
      window.dispatchEvent(new CustomEvent('profile-visibility-changed', { detail: { isVisible: false } }));

      // Best-effort backend sync (don't block UI)
      void fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studio: { is_profile_visible: false } }),
      }).catch(() => undefined);
    }
  }, [allRequiredComplete, isProfileVisible]);

  // Handle profile visibility toggle
  const handleVisibilityToggle = async (visible: boolean) => {
    setSaving(true);
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
        if (cachedProfileData?.studio) {
          cachedProfileData = {
            ...cachedProfileData,
            studio: { ...cachedProfileData.studio, is_profile_visible: visible },
          } as any;
          cachedProfileFetchedAt = Date.now();
        }
        // Broadcast visibility change to other components
        window.dispatchEvent(new CustomEvent('profile-visibility-changed', { 
          detail: { isVisible: visible } 
        }));
        logger.log('[SUCCESS] Profile visibility updated successfully to:', visible);
      } else {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to update profile visibility:', errorData);
        showError('Failed to update profile visibility. Please try again.');
        // Revert on error
        setIsProfileVisible(!visible);
      }
    } catch (err) {
      logger.error('Error updating profile visibility:', err);
      showError('Error updating profile visibility. Please try again.');
      // Revert on error
      setIsProfileVisible(!visible);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Profile Visibility - Desktop enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="bg-white rounded-lg border border-gray-200 shadow-sm md:bg-white/95 md:backdrop-blur-md md:rounded-2xl md:border-gray-100"
        style={{
          boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 25px 50px -12px rgb(0 0 0 / 0.25)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Welcome Section */}
            <div className="flex items-center space-x-4">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <img
                  src="/images/avatar-vosf.jpg"
                  alt="Default avatar"
                  className="w-16 h-16 rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-text-primary md:font-extrabold md:tracking-tight flex items-center gap-2">
                  <span>Welcome back, {user.display_name}!</span>
                  {profileData?.studio?.is_verified && (
                    <span className="group relative inline-flex items-center">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 transition-colors">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </span>
                      {/* Hover expand text - desktop only */}
                      <span className="hidden md:inline-flex absolute left-full ml-1 items-center px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Verified
                      </span>
                    </span>
                  )}
                </h1>
                <p className="text-text-secondary">
                  <a
                    href={`${getBaseUrl()}/${user.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 hover:underline transition-colors"
                  >
                    {getBaseUrl()}/<span className="text-[#d42027] font-medium">{user.username}</span>
                  </a>
                </p>
              </div>
            </div>

            {/* Profile Visibility Toggle - Always visible, disabled when requirements not met */}
            {!loading && (
              <div className="flex items-center justify-between lg:justify-end gap-4 pl-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0">
                <div className="flex items-center space-x-3">
                  {!allRequiredComplete ? (
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <EyeOff className="w-5 h-5 text-gray-600" />
                    </div>
                  ) : isProfileVisible ? (
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Eye className="w-5 h-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <EyeOff className="w-5 h-5 text-red-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Profile Visibility</h3>
                    <p className="text-xs text-gray-600">
                      {isProfileVisible ? 'Visible' : 'Hidden'}
                    </p>
                    {!allRequiredComplete && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        Complete required fields first
                      </p>
                    )}
                  </div>
                </div>
                <div 
                  title={!allRequiredComplete ? 'Complete all required profile fields before making your profile visible' : ''}
                  className="relative"
                >
                  <Toggle
                    checked={isProfileVisible}
                    onChange={handleVisibilityToggle}
                    disabled={saving || !allRequiredComplete}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div>
        <div className="space-y-8">
          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 md:bg-white/95 md:backdrop-blur-md md:rounded-2xl md:border-gray-100 md:shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <Skeleton className="h-6 w-1/3" />
                  <SkeletonText lines={5} />
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                  </div>
                </div>
                <div className="lg:col-span-1 space-y-4">
                  <Skeleton className="h-6 w-1/2 mx-auto" />
                  <SkeletonText lines={6} />
                </div>
              </div>
            </div>
          ) : profileData ? (
            <>
              {/* Profile Completion Progress and Tips - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Completion Progress - Takes 2/3 width on large screens */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-6 md:bg-white/95 md:backdrop-blur-md md:rounded-2xl md:border-gray-100"
                  style={{
                    boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 25px 50px -12px rgb(0 0 0 / 0.25)'
                  }}
                >
                  <ProfileCompletionProgress 
                    profileData={{
                      display_name: profileData.user?.display_name,
                      username: profileData.user?.username,
                      email: profileData.user?.email,
                      about: profileData.profile?.about,
                      short_about: profileData.profile?.short_about,
                      phone: profileData.profile?.phone,
                      location: profileData.profile?.location,
                      studio_name: profileData.studio?.name,
                      facebook_url: profileData.profile?.facebook_url,
                      x_url: profileData.profile?.x_url,
                      linkedin_url: profileData.profile?.linkedin_url,
                      instagram_url: profileData.profile?.instagram_url,
                      youtube_url: profileData.profile?.youtube_url,
                      tiktok_url: profileData.profile?.tiktok_url,
                      threads_url: profileData.profile?.threads_url,
                      soundcloud_url: profileData.profile?.soundcloud_url,
                      connection1: profileData.profile?.connection1,
                      connection2: profileData.profile?.connection2,
                      connection3: profileData.profile?.connection3,
                      connection4: profileData.profile?.connection4,
                      connection5: profileData.profile?.connection5,
                      connection6: profileData.profile?.connection6,
                      connection7: profileData.profile?.connection7,
                      connection8: profileData.profile?.connection8,
                      connection9: profileData.profile?.connection9,
                      connection10: profileData.profile?.connection10,
                      connection11: profileData.profile?.connection11,
                      connection12: profileData.profile?.connection12,
                      rate_tier_1: profileData.profile?.rate_tier_1,
                      website_url: profileData.studio?.website_url,
                      images_count: profileData.studio?.images?.length || 0,
                      studio_types_count: profileData.studio?.studio_types?.length || 0,
                      avatar_url: profileData.user?.avatar_url,
                      equipment_list: profileData.profile?.equipment_list,
                      services_offered: profileData.profile?.services_offered,
                    }}
                    renderWidget={renderCompletionWidget}
                  />
                </motion.div>

                {/* Profile Tips - Takes 1/3 width on large screens */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="lg:col-span-1 bg-gray-50 border border-gray-300 shadow-sm rounded-lg p-6 text-center md:bg-gradient-to-br md:from-red-50 md:to-white md:border-gray-100 md:rounded-2xl"
                  style={{
                    boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 25px 50px -12px rgb(0 0 0 / 0.25)'
                  }}
                >
                  <h3 className="text-lg font-medium text-gray-900 mb-2 md:font-extrabold md:tracking-tight">Profile Tips</h3>
                  <ul className="space-y-2 text-sm text-text-secondary inline-block text-left">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Complete all required fields to make your profile LIVE!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <BarChart3 className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Complete profiles get more views</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Camera className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Add a professional photo to build trust</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <PenTool className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Fill in your About sections to stand out</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Link className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Add connection methods so clients can reach you easily</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Megaphone className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Link your social media to showcase your work</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Brain className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>A good description helps with your SEO</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Trophy className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Reach 85% completion to become eligible for Verified status</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Only profiles which are 100% complete can be shown on the home page as a Featured Studio</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Globe className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Add your location and website for better visibility in search results</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Upload a strong featured image – it's the first thing clients see</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Include a short "intro" that sums up your studio or voice style</span>
                    </li>
                  </ul>
                </motion.div>
              </div>

              {/* Share Promotional Card - Full Width */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-gradient-to-br from-red-50 to-white border border-gray-100 rounded-2xl p-8"
                style={{
                  boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 25px 50px -12px rgb(0 0 0 / 0.25)'
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
                  {/* Left Column - Content */}
                  <div className="flex flex-col items-start text-left">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <Share2 className="w-8 h-8 text-[#d42027]" aria-hidden="true" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tight">
                      Promote your studio. Get rewarded!
                    </h3>
                    <p className="text-base text-gray-700 leading-relaxed">
                      Share your profile on social media and receive a free month of membership! Submit the public post link to us to claim.
                    </p>
                  </div>
                  
                  {/* Right Column - CTA and Fine Print */}
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <ShareProfileButton
                      profileUrl={profileData?.user?.username ? `${getBaseUrl()}/${profileData.user.username}` : ''}
                      profileName={profileData?.user?.display_name || profileData?.user?.username || 'your studio'}
                      variant="primary"
                      size="lg"
                      className="px-8 py-3"
                    />
                    <p className="text-sm text-gray-500 text-center">
                      One reward per membership period.<br />
                      Submit your link for verification to{' '}
                      <a 
                        href="mailto:support@voiceoverstudiofinder.com" 
                        className="underline hover:text-[#d42027] transition-colors"
                      >
                        support@voiceoverstudiofinder.com
                      </a>
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center md:bg-white/95 md:backdrop-blur-md md:rounded-2xl md:border-gray-100"
              style={{
                boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 25px 50px -12px rgb(0 0 0 / 0.25)'
              }}
            >
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-text-primary mb-2">
                Welcome to Your Dashboard
              </h3>
              <p className="text-text-secondary max-w-md mx-auto">
                Complete your profile to see your progress and tips here.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

