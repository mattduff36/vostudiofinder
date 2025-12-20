'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, 
  Mail, 
  Shield, 
  Eye, 
  EyeOff,
  Settings as SettingsIcon,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';

interface SettingsProps {
  data: {
    user: {
      id: string;
      display_name: string;
      email: string;
      username: string;
      role: string;
      avatar_url?: string;
    };
    studio?: {
      is_profile_visible?: boolean;
      completion_percentage?: number;
    };
  };
}

export function Settings({ data }: SettingsProps) {
  const [isProfileVisible, setIsProfileVisible] = useState(
    data.studio?.is_profile_visible !== false
  );
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch full profile data for completion status
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const result = await response.json();
          setProfileData(result.data);
          if (result.data.studio) {
            setIsProfileVisible(result.data.studio.is_profile_visible !== false);
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

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
      } else {
        alert('Failed to update profile visibility. Please try again.');
        setIsProfileVisible(!visible);
      }
    } catch (err) {
      console.error('Error updating profile visibility:', err);
      alert('Error updating profile visibility. Please try again.');
      setIsProfileVisible(!visible);
    } finally {
      setSaving(false);
    }
  };

  const handleNavigateToPrivacy = () => {
    window.location.hash = 'edit-profile';
    // Small delay to ensure tab switches, then click privacy section
    setTimeout(() => {
      const privacyButtons = document.querySelectorAll('[data-section="privacy"]');
      // Try mobile first (there's only one visible at a time due to responsive classes)
      privacyButtons.forEach((button) => {
        const element = button as HTMLElement;
        // Check if element is visible
        if (element.offsetParent !== null) {
          element.click();
        }
      });
    }, 150);
  };

  // Calculate profile completion
  const calculateCompletion = () => {
    if (!profileData) return 0;
    
    const requiredFields = [
      profileData.user?.username,
      profileData.user?.display_name,
      profileData.user?.email,
      profileData.studio?.name,
      profileData.profile?.short_about,
      profileData.profile?.about,
      profileData.studio?.studio_types?.length > 0,
      profileData.studio?.address,
      profileData.studio?.website_url,
    ];

    const optionalFields = [
      profileData.user?.avatar_url,
      profileData.profile?.phone,
      profileData.profile?.rate_tier_1,
      profileData.profile?.equipment_list,
      profileData.profile?.services_offered,
    ];

    const requiredComplete = requiredFields.filter(Boolean).length;
    const optionalComplete = optionalFields.filter(Boolean).length;
    const totalFields = requiredFields.length + optionalFields.length;
    const totalComplete = requiredComplete + optionalComplete;

    return Math.round((totalComplete / totalFields) * 100);
  };

  const completionPercentage = calculateCompletion();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#d42027]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* Desktop Header */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Mobile: Back Button (if needed, but hash navigation handles this) */}
      
      {/* Account Information */}
      <div className="bg-white md:bg-white rounded-lg border border-gray-200 shadow-sm md:shadow-sm">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <User className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
          </div>
          <p className="text-sm text-gray-600">Your account details and status</p>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {/* Username */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Username</p>
              <p className="text-sm text-gray-500 mt-0.5">@{data.user.username}</p>
            </div>
            <Link 
              href={`/${data.user.username}`} 
              target="_blank"
              className="text-[#d42027] hover:text-[#a1181d] transition-colors flex items-center space-x-1 text-sm"
            >
              <span>View Profile</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          {/* Display Name */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Display Name</p>
              <p className="text-sm text-gray-500 mt-0.5">{data.user.display_name || 'Not set'}</p>
            </div>
            <Link 
              href="/dashboard#edit-profile" 
              className="text-[#d42027] hover:text-[#a1181d] transition-colors text-sm"
            >
              Edit
            </Link>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-sm text-gray-500 mt-0.5">{data.user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium">Verified</span>
            </div>
          </div>

          {/* Account Type */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Account Type</p>
              <p className="text-sm text-gray-500 mt-0.5 capitalize">{data.user.role || 'User'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Status */}
      <div className="bg-white md:bg-white rounded-lg border border-gray-200 shadow-sm md:shadow-sm">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <SettingsIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Profile Status</h3>
          </div>
          <p className="text-sm text-gray-600">Manage how your profile appears to others</p>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          {/* Profile Visibility Toggle */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                {isProfileVisible ? (
                  <Eye className="w-4 h-4 text-green-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
                <p className="font-medium text-gray-900">Profile Visibility</p>
              </div>
              <p className="text-sm text-gray-600">
                {isProfileVisible 
                  ? 'Your profile is visible in search results and can be viewed by the public'
                  : 'Your profile is hidden from search results and public view'
                }
              </p>
            </div>
            <div className="ml-4">
              <Toggle
                checked={isProfileVisible}
                onChange={handleVisibilityToggle}
                disabled={saving}
                aria-label="Toggle profile visibility"
              />
            </div>
          </div>

          {/* Profile Completion */}
          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-gray-900">Profile Completion</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {completionPercentage < 85 
                    ? 'Complete your profile to appear in search results'
                    : completionPercentage < 100
                    ? 'Almost there! Complete your profile for better visibility'
                    : 'Your profile is complete!'
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{completionPercentage}%</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  completionPercentage >= 100
                    ? 'bg-green-500'
                    : completionPercentage >= 85
                    ? 'bg-yellow-500'
                    : 'bg-[#d42027]'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            {completionPercentage < 100 && (
              <Link 
                href="/dashboard#edit-profile"
                className="inline-flex items-center text-sm text-[#d42027] hover:text-[#a1181d] transition-colors"
              >
                <span>Complete your profile</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Privacy & Security */}
      <div className="bg-white md:bg-white rounded-lg border border-gray-200 shadow-sm md:shadow-sm">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Privacy & Security</h3>
          </div>
          <p className="text-sm text-gray-600">Control what information is visible on your profile</p>
        </div>

        <div className="p-4 md:p-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900 mb-1">Privacy Settings</p>
                <p className="text-sm text-gray-600 mb-3">
                  Manage email, phone, address visibility, and more
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded border border-gray-200">
                    {profileData?.profile?.show_email ? (
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-gray-400" />
                    )}
                    <span>Email {profileData?.profile?.show_email ? 'Visible' : 'Hidden'}</span>
                  </div>
                  <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded border border-gray-200">
                    {profileData?.profile?.show_phone ? (
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-gray-400" />
                    )}
                    <span>Phone {profileData?.profile?.show_phone ? 'Visible' : 'Hidden'}</span>
                  </div>
                  <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded border border-gray-200">
                    {profileData?.profile?.show_address ? (
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-gray-400" />
                    )}
                    <span>Address {profileData?.profile?.show_address ? 'Visible' : 'Hidden'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                onClick={handleNavigateToPrivacy}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                Manage Privacy Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

