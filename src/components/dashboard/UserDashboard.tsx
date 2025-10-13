'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  User, 
  Plus,
  Settings,
  Activity,
  Loader2
} from 'lucide-react';
import { ProfileCompletionProgress } from '@/components/profile/ProfileCompletionProgress';

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

  const isStudioOwner = user.role === 'STUDIO_OWNER' || user.role === 'ADMIN';

  // Fetch profile data for completion progress
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const result = await response.json();
          setProfileData(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-600" />
                </div>
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
            
            <div className="flex items-center space-x-4">
              {user.email === 'admin@mpdee.co.uk' && (
                <button
                  onClick={() => window.location.href = '/admin'}
                  className="bg-black hover:bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center transition-all font-medium"
                >
                  ADMIN
                </button>
              )}
              <Button
                onClick={() => window.location.href = '/profile'}
                variant="outline"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              
              {isStudioOwner && (
                <Button
                  onClick={() => window.location.href = '/studio/create'}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Studio
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : profileData ? (
            <>
              {/* Profile Completion Progress and Tips - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Completion Progress - Takes 2/3 width on large screens */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
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
                    }}
                  />
                </div>

                {/* Profile Tips - Takes 1/3 width on large screens */}
                <div className="lg:col-span-1 bg-blue-50 border border-blue-200 shadow-sm rounded-lg p-6">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Profile Tips</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li>• Complete profiles get 3x more views</li>
                    <li>• Fill in your about sections to stand out</li>
                    <li>• Upload quality images of your studio to build trust</li>
                    <li>• Add connection methods so clients can reach you easily</li>
                    <li>• Link at least 2 social media profiles to showcase your work</li>
                    <li>• All fields must be completed before publishing your profile</li>
                  </ul>
                </div>
              </div>

              {/* Additional Dashboard Sections Coming Soon */}
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-text-primary mb-2">
                  More Features Coming Soon
                </h3>
                <p className="text-text-secondary max-w-md mx-auto">
                  Activity insights, recent reviews, and messages will appear here soon.
                </p>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
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

