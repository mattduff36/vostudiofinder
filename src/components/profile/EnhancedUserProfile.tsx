'use client';

import Image from 'next/image';
import { User, UserProfile, UserMetadata } from '@/types/prisma';
import { colors } from '@/components/home/HomePage';
import { formatRateWithCurrency } from '@/lib/utils/currency';
import { 
  MapPin, 
  Users,
  CheckCircle,
  ExternalLink,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Music,
  Globe,
  Video,
  MessageCircle
} from 'lucide-react';

interface EnhancedUserProfileProps {
  user: User & {
    profile?: UserProfile | null;
    metadata?: UserMetadata[];
    studio_profiles?: { status: string; is_profile_visible?: boolean } | null;
  };
  isHidden?: boolean;
}

export function EnhancedUserProfile({ user, isHidden = false }: EnhancedUserProfileProps) {
  const profile = user.profile;
  const metadata = user.metadata || [];
  const hasInactiveStudio = !isHidden && user.studio_profiles && user.studio_profiles.status === 'INACTIVE';
  
  // Helper function to get metadata value
  // const getMetadata = (key: string) => {
  //   return metadata.find(m => m.key === key)?.value;
  // };

  // Social media links with proper styling
  const socialLinks = [
    { 
      platform: 'Facebook', 
      url: profile?.facebook_url, 
      icon: Facebook, 
      color: 'hover:bg-blue-50 hover:text-blue-600 border-blue-200' 
    },
    { 
      platform: 'X', 
      url: profile?.x_url || profile?.twitter_url, 
      icon: Twitter, 
      color: 'hover:bg-blue-50 hover:text-blue-400 border-blue-200' 
    },
    { 
      platform: 'LinkedIn', 
      url: profile?.linkedin_url, 
      icon: Linkedin, 
      color: 'hover:bg-blue-50 hover:text-blue-700 border-blue-200' 
    },
    { 
      platform: 'Instagram', 
      url: profile?.instagram_url, 
      icon: Instagram, 
      color: 'hover:bg-pink-50 hover:text-pink-600 border-pink-200' 
    },
    { 
      platform: 'TikTok', 
      url: profile?.tiktok_url, 
      icon: Video, 
      color: 'hover:bg-gray-50 hover:text-gray-900 border-gray-200' 
    },
    { 
      platform: 'Threads', 
      url: profile?.threads_url, 
      icon: MessageCircle, 
      color: 'hover:bg-gray-50 hover:text-gray-900 border-gray-200' 
    },
    { 
      platform: 'YouTube', 
      url: profile?.youtube_url, 
      icon: Youtube, 
      color: 'hover:bg-red-50 hover:text-red-600 border-red-200' 
    },
    { 
      platform: 'SoundCloud', 
      url: profile?.soundcloud_url, 
      icon: Music, 
      color: 'hover:bg-orange-50 hover:text-orange-600 border-orange-200' 
    },
    { 
      platform: 'Vimeo', 
      url: profile?.vimeo_url, 
      icon: Globe, 
      color: 'hover:bg-green-50 hover:text-green-600 border-green-200' 
    },
  ].filter(link => link.url);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      {/* Hero Section - Similar to home page style */}
      <div className="relative py-16 overflow-hidden" style={{ background: `linear-gradient(to right, ${colors.primary}e6, ${colors.primary}cc)` }}>
        <div className="absolute inset-0 opacity-10">
          <Image
            src="/background-images/21920-2.jpg"
            alt="Profile background"
            fill
            className="object-cover"
            priority={false}
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Image */}
            <div className="relative">
              {user.avatar_url ? (
                <div className="relative w-32 h-32">
                  <Image
                    src={user.avatar_url}
                    alt={user.display_name}
                    fill
                    className="rounded-full border-4 border-white shadow-lg object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-300 flex items-center justify-center">
                  <Users className="w-12 h-12 text-gray-600" />
                </div>
              )}
              {user.email_verified && (
                <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                {profile?.studio_name && profile?.last_name 
                  ? `${profile.studio_name} ${profile.last_name}` 
                  : user.display_name
                }
              </h1>
              <div className="w-24 h-1 bg-white mx-auto md:mx-0 mb-4"></div>
              <p className="text-xl text-white/90 mb-2">@{user.username}</p>
              {profile?.short_about && (
                <p className="text-lg text-white/80 mb-4 max-w-2xl">
                  {profile.short_about}
                </p>
              )}
              {profile?.location && (
                <div className="flex items-center justify-center md:justify-start text-white/90">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>{profile.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Notice */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {isHidden ? (
          /* Hidden Profile Notice */
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Profile visibility has been turned off.</span> This profile is hidden from search results but can still be accessed via direct link.
                </p>
              </div>
            </div>
          </div>
        ) : hasInactiveStudio ? (
          /* Inactive Profile Notice */
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <span className="font-medium">Profile not active.</span> If you are the owner of this profile and wish to re-activate it, contact us:{' '}
                  <a 
                    href="mailto:support@voiceoverstudiofinder.com" 
                    className="font-medium underline text-yellow-700 hover:text-yellow-600"
                  >
                    support@voiceoverstudiofinder.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* About Section */}
            {profile?.about && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-md p-6">
                <h2 className="text-2xl font-semibold mb-4" style={{ color: colors.textPrimary }}>
                  About
                </h2>
                <div className="prose max-w-none">
                  <p className="text-base leading-relaxed" style={{ color: colors.textSecondary }}>
                    {profile.about}
                  </p>
                </div>
              </div>
            )}

            {/* Pricing Information */}
            {profile?.show_rates && (profile?.rate_tier_1 || profile?.rate_tier_2 || profile?.rate_tier_3) && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-semibold mb-4" style={{ color: colors.textPrimary }}>
                  Pricing
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {profile.rate_tier_1 && (
                    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center mb-3">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors.primary }}></div>
                        <span className="font-semibold" style={{ color: colors.textPrimary }}>15 minutes</span>
                      </div>
                      <p style={{ color: colors.textSecondary }}>{formatRateWithCurrency(profile.rate_tier_1, profile.location)}</p>
                    </div>
                  )}
                  {profile.rate_tier_2 && (
                    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center mb-3">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors.primary }}></div>
                        <span className="font-semibold" style={{ color: colors.textPrimary }}>30 minutes</span>
                      </div>
                      <p style={{ color: colors.textSecondary }}>{formatRateWithCurrency(profile.rate_tier_2, profile.location)}</p>
                    </div>
                  )}
                  {profile.rate_tier_3 && (
                    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center mb-3">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors.primary }}></div>
                        <span className="font-semibold" style={{ color: colors.textPrimary }}>60 minutes</span>
                      </div>
                      <p style={{ color: colors.textSecondary }}>{formatRateWithCurrency(profile.rate_tier_3, profile.location)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Information from Metadata */}
            {metadata.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-semibold mb-4" style={{ color: colors.textPrimary }}>
                  Professional Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {metadata.map((meta) => (
                    <div key={meta.id} className="border-l-4 pl-4 py-2" style={{ borderColor: colors.primary }}>
                      <div className="font-medium mb-1" style={{ color: colors.textPrimary }}>
                        {meta.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="text-sm" style={{ color: colors.textSecondary }}>{meta.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            

            {/* Social Media Links */}
            {socialLinks.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
                  Connect
                </h3>
                <div className="space-y-2">
                  {socialLinks
                    .filter((link) => link.url) // Only show links that have URLs
                    .map((link) => {
                      const IconComponent = link.icon;
                      return (
                        <a
                          key={link.platform}
                          href={link.url || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center p-3 rounded-lg border transition-all ${link.color}`}
                        >
                          <IconComponent className="w-4 h-4 mr-3" />
                          <span className="text-sm font-medium">{link.platform}</span>
                          <ExternalLink className="w-3 h-3 ml-auto" />
                        </a>
                      );
                    })}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
