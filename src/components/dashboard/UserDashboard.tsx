'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Activity,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { ProfileCompletionProgress } from '@/components/profile/ProfileCompletionProgress';
import { Toggle } from '@/components/ui/Toggle';

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
}

export function UserDashboard({ data }: UserDashboardProps) {
  const { user } = data;
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileVisible, setIsProfileVisible] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch profile data for completion progress
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const result = await response.json();
          setProfileData(result.data);
          
          // Set initial visibility state from studio data
          if (result.data.studio) {
            const visible = result.data.studio.is_profile_visible !== false;
            setIsProfileVisible(visible);
            console.log('[Dashboard] Profile visibility loaded:', visible);
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

  // Compute if all required fields are complete (recalculates whenever profileData changes)
  const allRequiredComplete = useMemo(() => {
    if (!profileData) return false;
    
    // Check if at least one connection method is selected
    const hasConnectionMethod = !!(
      profileData.profile?.connection1 === '1' || 
      profileData.profile?.connection2 === '1' || 
      profileData.profile?.connection3 === '1' || 
      profileData.profile?.connection4 === '1' || 
      profileData.profile?.connection5 === '1' || 
      profileData.profile?.connection6 === '1' || 
      profileData.profile?.connection7 === '1' || 
      profileData.profile?.connection8 === '1'
    );

    // Check all 11 required fields
    const requiredFieldsComplete = !!(
      profileData.user?.username?.trim() &&
      profileData.user?.display_name?.trim() &&
      profileData.user?.email?.trim() &&
      profileData.profile?.studio_name?.trim() &&
      profileData.profile?.short_about?.trim() &&
      profileData.profile?.about?.trim() &&
      (profileData.studio?.studio_types?.length || 0) >= 1 &&
      profileData.profile?.location?.trim() &&
      hasConnectionMethod &&
      profileData.studio?.website_url?.trim() &&
      (profileData.studio?.images?.length || 0) >= 1
    );

    console.log('[Dashboard] Required fields complete:', requiredFieldsComplete);
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
        console.log('✅ Profile visibility updated successfully to:', visible);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to update profile visibility:', errorData);
        alert('Failed to update profile visibility. Please try again.');
        // Revert on error
        setIsProfileVisible(!visible);
      }
    } catch (err) {
      console.error('Error updating profile visibility:', err);
      alert('Error updating profile visibility. Please try again.');
      // Revert on error
      setIsProfileVisible(!visible);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Profile Visibility */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
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
                <h1 className="text-3xl font-bold text-text-primary">
                  Welcome back, {user.display_name}!
                </h1>
                <p className="text-text-secondary">
                  @{user.username} • {user.role.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>

            {/* Profile Visibility Toggle */}
            {!loading && profileData?.studio && (
              <div className="flex items-center justify-between lg:justify-end gap-4 pl-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0">
                <div className="flex items-center space-x-3">
                  {isProfileVisible ? (
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Eye className="w-5 h-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <EyeOff className="w-5 h-5 text-gray-600" />
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
      </div>

      {/* Content */}
      <div>
        <div className="space-y-8">
          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
          ) : profileData ? (
            <>
              {/* Profile Completion Progress and Tips - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Completion Progress - Takes 2/3 width on large screens */}
                <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <ProfileCompletionProgress 
                    profileData={{
                      display_name: profileData.user?.display_name,
                      username: profileData.user?.username,
                      email: profileData.user?.email,
                      about: profileData.profile?.about,
                      short_about: profileData.profile?.short_about,
                      phone: profileData.profile?.phone,
                      location: profileData.profile?.location,
                      studio_name: profileData.profile?.studio_name,
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
                  />
                </div>

                {/* Profile Tips - Takes 1/3 width on large screens */}
                <div className="lg:col-span-1 bg-gray-50 border border-gray-300 shadow-sm rounded-lg p-6 text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Tips</h3>
                  <ul className="space-y-2 text-sm text-text-secondary inline-block text-left">
                    <li>✅ Complete all required fields to make your profile LIVE!</li>
                    <li>📊 Complete profiles get more views</li>
                    <li>📸 Add a professional photo to build trust</li>
                    <li>✍️ Fill in your About sections to stand out</li>
                    <li>🔗 Add connection methods so clients can reach you easily</li>
                    <li>📣 Link your social media to showcase your work</li>
                    <li>🧠 A good description helps with your SEO</li>
                    <li>🏆 Reach 85% completion to become eligible for Verified status</li>
                    <li>⭐ Only profiles which are 100% complete can be shown on the home page as a Featured Studio</li>
                    <li>🌍 Add your location and website for better visibility in search results</li>
                    <li>🎯 Upload a strong featured image – it's the first thing clients see</li>
                    <li>💬 Include a short "intro" that sums up your studio or voice style</li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-text-primary mb-2">
                Welcome to Your Dashboard
              </h3>
              <p className="text-text-secondary max-w-md mx-auto">
                Complete your profile to see your progress and tips here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

