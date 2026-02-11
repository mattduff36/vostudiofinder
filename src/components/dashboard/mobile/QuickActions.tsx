/**
 * QuickActions - Mobile Dashboard Accordion
 * 
 * Accordion-style dashboard sections matching edit-profile design
 * Includes Profile Visibility toggle and navigation cards
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 4.
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { User, Settings, Loader2, ChevronDown, ChevronUp, Eye, EyeOff, Check, Share2 } from 'lucide-react';
import { ProgressIndicators } from '@/components/dashboard/ProgressIndicators';
import { ProfileCompletionProgress } from '@/components/profile/ProfileCompletionProgress';
import { calculateCompletionStats } from '@/lib/utils/profile-completion';
import { Toggle } from '@/components/ui/Toggle';
import { ShareProfileButton } from '@/components/profile/ShareProfileButton';
import { logger } from '@/lib/logger';
import { showError } from '@/lib/toast';
import { getBaseUrl } from '@/lib/seo/site';

export type QuickAction = 'edit-profile' | 'settings';

interface QuickActionsProps {
  onActionClick: (action: QuickAction) => void;
  displayName?: string;
}

export function QuickActions({ 
  onActionClick, 
  displayName,
}: QuickActionsProps) {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCompletionExpanded, setIsCompletionExpanded] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPromotionExpanded, setIsPromotionExpanded] = useState(false);

  // Fetch profile data for completion stats
  useEffect(() => {
    interface FetchProfileOptions {
      showLoading: boolean;
    }

    const fetchProfile = async ({ showLoading }: FetchProfileOptions) => {
      try {
        if (showLoading) setLoading(true);

        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const result = await response.json();
          setProfileData(result.data);
          
          // Set initial visibility state from studio data
          if (result.data.studio) {
            const visible = result.data.studio.is_profile_visible !== false;
            setIsProfileVisible(visible);
            logger.log('[Mobile Dashboard] Profile visibility loaded:', visible);
          } else {
            // No studio yet - default to hidden
            setIsProfileVisible(false);
            logger.log('[Mobile Dashboard] No studio yet - visibility defaulting to hidden');
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        if (showLoading) setLoading(false);
      }
    };
    fetchProfile({ showLoading: true });

    // Refetch when window regains focus (in case admin changed it)
    const handleFocus = () => {
      // Silent refresh: don't flip `loading` or collapse/hide the accordion UI
      fetchProfile({ showLoading: false });
    };
    // Refetch immediately when profile is saved in the Edit Profile modal
    const handleProfileUpdated = () => {
      fetchProfile({ showLoading: false });
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('profileDataUpdated', handleProfileUpdated);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('profileDataUpdated', handleProfileUpdated);
    };
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

  // Compute if all required fields are complete
  // Must match the 11 required fields defined in profile-completion.ts
  const allRequiredComplete = useMemo(() => {
    if (!profileData) return false;

    // Check if at least one connection method is selected (required field #9)
    const hasConnectionMethod = !!(
      profileData.profile?.connection1 === '1' ||
      profileData.profile?.connection2 === '1' ||
      profileData.profile?.connection3 === '1' ||
      profileData.profile?.connection4 === '1' ||
      profileData.profile?.connection5 === '1' ||
      profileData.profile?.connection6 === '1' ||
      profileData.profile?.connection7 === '1' ||
      profileData.profile?.connection8 === '1' ||
      profileData.profile?.connection9 === '1' ||
      profileData.profile?.connection10 === '1' ||
      profileData.profile?.connection11 === '1' ||
      profileData.profile?.connection12 === '1'
    );

    // Required fields matching profile-completion.ts (11 fields):
    // 1. username (not starting with temp_)
    // 2. display_name
    // 3. email
    // 4. studio.name
    // 5. short_about
    // 6. about
    // 7. studio_types.length >= 1
    // 8. location
    // 9. hasConnectionMethod (at least one connection1-12 === '1')
    // 10. website_url
    // 11. images.length >= 1
    const requiredFields = [
      !!(profileData.user?.username && !profileData.user.username.startsWith('temp_')),
      !!(profileData.user?.display_name && profileData.user.display_name.trim()),
      !!(profileData.user?.email && profileData.user.email.trim()),
      !!(profileData.studio?.name && profileData.studio.name.trim()),
      !!(profileData.profile?.short_about && profileData.profile.short_about.trim()),
      !!(profileData.profile?.about && profileData.profile.about.trim()),
      !!(profileData.studio?.studio_types && profileData.studio.studio_types.length >= 1),
      !!(profileData.profile?.location && profileData.profile.location.trim()),
      hasConnectionMethod,
      !!(profileData.studio?.website_url && profileData.studio.website_url.trim()),
      !!(profileData.studio?.images && profileData.studio.images.length >= 1),
    ];

    return requiredFields.every(field => field === true);
  }, [profileData]);

  // Compute tile-specific completion statuses for icon colors
  const tileCompletionStatus = useMemo(() => {
    if (!profileData) {
      return {
        editProfile: false,
      };
    }

    // Edit Profile tile: all Edit Profile sections complete (basic, contact, connections, rates, social, images)
    // Basic: username, display_name, email, studio.name, studio_types>=1, short_about, about
    const isBasicComplete = !!(
      profileData.user?.username &&
      !profileData.user.username.startsWith('temp_') &&
      profileData.user?.display_name?.trim() &&
      profileData.user?.email?.trim() &&
      profileData.studio?.name?.trim() &&
      (profileData.studio?.studio_types?.length || 0) >= 1 &&
      profileData.profile?.short_about?.trim() &&
      profileData.profile?.about?.trim()
    );

    // Contact: location, website_url
    const isContactComplete = !!(
      profileData.profile?.location?.trim() &&
      profileData.studio?.website_url?.trim()
    );

    // Connections: at least one connection1-12 === '1'
    const isConnectionsComplete = !!(
      profileData.profile?.connection1 === '1' ||
      profileData.profile?.connection2 === '1' ||
      profileData.profile?.connection3 === '1' ||
      profileData.profile?.connection4 === '1' ||
      profileData.profile?.connection5 === '1' ||
      profileData.profile?.connection6 === '1' ||
      profileData.profile?.connection7 === '1' ||
      profileData.profile?.connection8 === '1' ||
      profileData.profile?.connection9 === '1' ||
      profileData.profile?.connection10 === '1' ||
      profileData.profile?.connection11 === '1' ||
      profileData.profile?.connection12 === '1'
    );

    // Rates: rate_tier_1 > 0
    const isRatesComplete = !!(
      profileData.profile?.rate_tier_1 &&
      (typeof profileData.profile.rate_tier_1 === 'number'
        ? profileData.profile.rate_tier_1 > 0
        : parseFloat(profileData.profile.rate_tier_1 as any) > 0)
    );

    // Social: at least 2 social links
    const socialLinks = [
      profileData.profile?.facebook_url,
      profileData.profile?.x_url,
      profileData.profile?.youtube_url,
      profileData.profile?.instagram_url,
      profileData.profile?.soundcloud_url,
      profileData.profile?.vimeo_url,
      profileData.profile?.bluesky_url,
      profileData.profile?.tiktok_url,
      profileData.profile?.linkedin_url,
      profileData.profile?.threads_url,
    ].filter((url) => url && url.trim() !== '');
    const isSocialComplete = socialLinks.length >= 2;

    // Images: at least 1 image
    const isImagesComplete = (profileData.studio?.images?.length || 0) >= 1;

    const isEditProfileComplete =
      isBasicComplete &&
      isContactComplete &&
      isConnectionsComplete &&
      isRatesComplete &&
      isSocialComplete &&
      isImagesComplete;

    return {
      editProfile: isEditProfileComplete,
    };
  }, [profileData]);

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

  const actions = [
    {
      id: 'edit-profile' as QuickAction,
      label: 'Edit Profile',
      description: 'Update your personal information',
      icon: User,
    },
    {
      id: 'settings' as QuickAction,
      label: 'Settings',
      description: 'Configure your preferences',
      icon: Settings,
    },
  ];

  return (
    <div className="md:hidden py-6 space-y-3">
      {/* Welcome Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span>Welcome back{displayName ? `, ${displayName}` : ''}!</span>
          {profileData?.studio?.is_verified && (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 flex-shrink-0"
              title="Verified studio — approved by our team"
            >
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </span>
          )}
        </h2>
      </div>

      {/* Profile Completion Accordion */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="!bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          {/* Accordion Header */}
          <button
            onClick={() => setIsCompletionExpanded(!isCompletionExpanded)}
            className="w-full flex items-center p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            aria-expanded={isCompletionExpanded}
            aria-label="Profile completion details"
          >
            <div className="flex-1 flex justify-center">
              <ProgressIndicators
                requiredFieldsCompleted={completionStats.required.completed}
                totalRequiredFields={completionStats.required.total}
                overallCompletionPercentage={completionStats.overall.percentage}
                variant="minimal"
              />
            </div>
            <div className="ml-2 flex-shrink-0">
              {isCompletionExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>

          {/* Expanded Content */}
          {isCompletionExpanded && profileData && (
            <div className="border-t border-gray-100 p-4 bg-white">
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
                  vimeo_url: profileData.profile?.vimeo_url,
                  bluesky_url: profileData.profile?.bluesky_url,
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
                showLists={true}
                showTitle={true}
                mobileVariant={true}
              />
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div className="mt-4 mb-2">
        <p className="text-sm text-gray-600">
          Choose an option to manage your profile
        </p>
      </div>

      {/* Profile Visibility Card */}
      {!loading && (
        <div className="!bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {!allRequiredComplete ? (
                <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <EyeOff className="w-5 h-5 text-gray-600" />
                </div>
              ) : isProfileVisible ? (
                <div className="flex-shrink-0 w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-green-600" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <EyeOff className="w-5 h-5 text-[#d42027]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-base">Profile Visibility</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isProfileVisible ? 'Visible to public' : 'Hidden from public'}
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
              className="flex-shrink-0 ml-3"
            >
              <Toggle
                checked={isProfileVisible}
                onChange={handleVisibilityToggle}
                disabled={saving || !allRequiredComplete}
              />
            </div>
          </div>
        </div>
      )}

      {/* Accordion Cards */}
      {actions.map((action) => {
        const Icon = action.icon;

        // Determine icon colors based on tile completion status
        let iconBgClass = 'bg-red-50';
        let iconColorClass = 'text-[#d42027]';

        if (action.id === 'edit-profile') {
          iconBgClass = tileCompletionStatus.editProfile ? 'bg-green-50' : 'bg-red-50';
          iconColorClass = tileCompletionStatus.editProfile ? 'text-green-600' : 'text-[#d42027]';
        } else if (action.id === 'settings') {
          iconBgClass = 'bg-gray-50';
          iconColorClass = 'text-gray-500';
        }

        return (
          <div
            key={action.id}
            className="!bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
          >
            {/* Action Button */}
            <button
              onClick={() => onActionClick(action.id)}
              className="w-full flex items-center space-x-3 p-4 text-left hover:bg-gray-50 transition-colors active:bg-gray-100"
            >
              <div className={`flex-shrink-0 w-10 h-10 ${iconBgClass} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconColorClass}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-base">
                  {action.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {action.description}
                </p>
              </div>
            </button>
          </div>
        );
      })}

      {/* Promotions Section */}
      <div className="mt-4 mb-2">
        <p className="text-sm text-gray-600">
          Promotions
        </p>
      </div>

      {/* Share Promotional Accordion Card - Mobile (after Settings) */}
      {!loading && (
        <div className="!bg-gradient-to-br from-red-50 to-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          {/* Collapsed Header */}
          <button
            onClick={() => setIsPromotionExpanded(!isPromotionExpanded)}
            className="w-full flex items-center p-4 hover:opacity-90 transition-opacity active:opacity-80"
            aria-expanded={isPromotionExpanded}
            aria-label="Promotion details"
          >
            <div className="flex-1 flex justify-center items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Share2 className="w-5 h-5 text-[#d42027]" />
              </div>
              <p className="font-semibold text-gray-900 text-base leading-none m-0 !pb-0">
                {profileData?.user?.membership_tier === 'PREMIUM'
                  ? 'Share your studio. Get an extra month of Premium free!'
                  : 'Share your studio. Get a free month of Premium!'
                }
              </p>
            </div>
            <div className="ml-2 flex-shrink-0">
              {isPromotionExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>

          {/* Expanded Content */}
          {isPromotionExpanded && (
            <div className="border-t border-red-100 p-4">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                  Post your profile publicly on social media and send us the link.
                </p>
                <div className="mb-3 w-full">
                  <ShareProfileButton
                    profileUrl={profileData?.user?.username ? `${getBaseUrl()}/${profileData.user.username}` : ''}
                    profileName={profileData?.user?.display_name || profileData?.user?.username || 'your studio'}
                    {...(() => {
                      const region = profileData?.studio?.city || profileData?.profile?.location;
                      return region ? { region } : {};
                    })()}
                    variant="primary"
                    size="md"
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  One free month of Premium membership per user.<br />
                  Email the link to{' '}
                  <a 
                    href="mailto:support@voiceoverstudiofinder.com" 
                    className="underline hover:text-[#d42027] transition-colors"
                  >
                    support@voiceoverstudiofinder.com
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
