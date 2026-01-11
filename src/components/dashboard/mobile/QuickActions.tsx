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
import { User, Image as ImageIcon, Settings, Loader2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { ProgressIndicators } from '@/components/dashboard/ProgressIndicators';
import { ProfileCompletionProgress } from '@/components/profile/ProfileCompletionProgress';
import { calculateCompletionStats } from '@/lib/utils/profile-completion';
import { Toggle } from '@/components/ui/Toggle';
import { logger } from '@/lib/logger';
import { showError } from '@/lib/toast';

export type QuickAction = 'edit-profile' | 'images' | 'settings';

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

  // Fetch profile data for completion stats
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    };
    fetchProfile();

    // Refetch when window regains focus (in case admin changed it)
    const handleFocus = () => {
      fetchProfile();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
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
  const allRequiredComplete = useMemo(() => {
    if (!profileData) return false;

    const requiredFields = [
      profileData.user?.username,
      profileData.user?.display_name,
      profileData.user?.email,
      profileData.profile?.about,
      profileData.profile?.short_about,
      profileData.profile?.phone,
      profileData.profile?.location,
      profileData.studio?.name,
      profileData.studio?.studio_types?.length > 0,
      profileData.studio?.images?.length > 0,
      profileData.studio?.website_url,
    ];

    const requiredFieldsComplete = requiredFields.every((field) => {
      if (typeof field === 'boolean') return field;
      if (typeof field === 'string') return field.trim().length > 0;
      return false;
    });

    return requiredFieldsComplete;
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
      id: 'images' as QuickAction,
      label: 'Manage Images',
      description: 'Upload and organise studio photos',
      icon: ImageIcon,
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
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back{displayName ? `, ${displayName}` : ''}!
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
                  twitter_url: profileData.profile?.twitter_url,
                  linkedin_url: profileData.profile?.linkedin_url,
                  instagram_url: profileData.profile?.instagram_url,
                  youtube_url: profileData.profile?.youtube_url,
                  vimeo_url: profileData.profile?.vimeo_url,
                  soundcloud_url: profileData.profile?.soundcloud_url,
                  connection1: profileData.profile?.connection1,
                  connection2: profileData.profile?.connection2,
                  connection3: profileData.profile?.connection3,
                  connection4: profileData.profile?.connection4,
                  connection5: profileData.profile?.connection5,
                  connection6: profileData.profile?.connection6,
                  connection7: profileData.profile?.connection7,
                  connection8: profileData.profile?.connection8,
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
              {isProfileVisible ? (
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-green-600" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <EyeOff className="w-5 h-5 text-gray-600" />
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
              <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#d42027]" />
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
    </div>
  );
}
