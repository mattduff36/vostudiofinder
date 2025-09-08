'use client';

import React from 'react';
import Image from 'next/image';
import { User, UserProfile, UserMetadata } from '@prisma/client';
import { colors } from '@/components/home/HomePage';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Shield, 
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Music,
  Mic,
  Users,
  Calendar,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface EnhancedUserProfileProps {
  user: User & {
    profile?: UserProfile | null;
    metadata?: UserMetadata[];
  };
}

export function EnhancedUserProfile({ user }: EnhancedUserProfileProps) {
  const profile = user.profile;
  const metadata = user.metadata || [];
  
  // Helper function to get metadata value
  const getMetadata = (key: string) => {
    return metadata.find(m => m.key === key)?.value;
  };

  // Social media links with proper styling
  const socialLinks = [
    { 
      platform: 'Facebook', 
      url: profile?.facebookUrl, 
      icon: Facebook, 
      color: 'hover:bg-blue-50 hover:text-blue-600 border-blue-200' 
    },
    { 
      platform: 'Twitter', 
      url: profile?.twitterUrl, 
      icon: Twitter, 
      color: 'hover:bg-blue-50 hover:text-blue-400 border-blue-200' 
    },
    { 
      platform: 'LinkedIn', 
      url: profile?.linkedinUrl, 
      icon: Linkedin, 
      color: 'hover:bg-blue-50 hover:text-blue-700 border-blue-200' 
    },
    { 
      platform: 'Instagram', 
      url: profile?.instagramUrl, 
      icon: Instagram, 
      color: 'hover:bg-pink-50 hover:text-pink-600 border-pink-200' 
    },
    { 
      platform: 'YouTube', 
      url: profile?.youtubeUrl, 
      icon: Youtube, 
      color: 'hover:bg-red-50 hover:text-red-600 border-red-200' 
    },
    { 
      platform: 'SoundCloud', 
      url: profile?.soundcloudUrl, 
      icon: Music, 
      color: 'hover:bg-orange-50 hover:text-orange-600 border-orange-200' 
    },
    { 
      platform: 'Vimeo', 
      url: profile?.vimeoUrl, 
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
            src="/bakground-images/21920-2.jpg"
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
              {user.avatarUrl ? (
                <div className="relative w-32 h-32">
                  <Image
                    src={user.avatarUrl}
                    alt={user.displayName}
                    fill
                    className="rounded-full border-4 border-white shadow-lg object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-300 flex items-center justify-center">
                  <Users className="w-12 h-12 text-gray-600" />
                </div>
              )}
              {user.emailVerified && (
                <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                {profile?.firstName && profile?.lastName 
                  ? `${profile.firstName} ${profile.lastName}` 
                  : user.displayName
                }
              </h1>
              <div className="w-24 h-1 bg-white mx-auto md:mx-0 mb-4"></div>
              <p className="text-xl text-white/90 mb-2">@{user.username}</p>
              {profile?.shortAbout && (
                <p className="text-lg text-white/80 mb-4 max-w-2xl">
                  {profile.shortAbout}
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

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* About Section */}
            {profile?.about && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
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
            {profile?.showRates && (profile?.rateTier1 || profile?.rateTier2 || profile?.rateTier3) && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-semibold mb-4" style={{ color: colors.textPrimary }}>
                  Pricing
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {profile.rateTier1 && (
                    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center mb-3">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors.primary }}></div>
                        <span className="font-semibold" style={{ color: colors.textPrimary }}>Basic Rate</span>
                      </div>
                      <p style={{ color: colors.textSecondary }}>{profile.rateTier1}</p>
                    </div>
                  )}
                  {profile.rateTier2 && (
                    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center mb-3">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors.primary }}></div>
                        <span className="font-semibold" style={{ color: colors.textPrimary }}>Standard Rate</span>
                      </div>
                      <p style={{ color: colors.textSecondary }}>{profile.rateTier2}</p>
                    </div>
                  )}
                  {profile.rateTier3 && (
                    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center mb-3">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors.primary }}></div>
                        <span className="font-semibold" style={{ color: colors.textPrimary }}>Premium Rate</span>
                      </div>
                      <p style={{ color: colors.textSecondary }}>{profile.rateTier3}</p>
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
            
            {/* Contact Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
                Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-3 flex-shrink-0" style={{ color: colors.textSubtle }} />
                  <span className="text-sm" style={{ color: colors.textSecondary }}>{user.email}</span>
                </div>
                {profile?.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-3 flex-shrink-0" style={{ color: colors.textSubtle }} />
                    <span className="text-sm" style={{ color: colors.textSecondary }}>{profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-3 flex-shrink-0" style={{ color: colors.textSubtle }} />
                  <span className="text-sm" style={{ color: colors.textSecondary }}>
                    Member since {new Date(user.createdAt).getFullYear()}
                  </span>
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            {socialLinks.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
                  Connect
                </h3>
                <div className="space-y-2">
                  {socialLinks.map((link) => {
                    const IconComponent = link.icon;
                    return (
                      <a
                        key={link.platform}
                        href={link.url}
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

            {/* Professional Status */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
                Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-3 text-green-600" />
                  <span className="text-sm" style={{ color: colors.textSecondary }}>Verified Member</span>
                </div>
                <div className="flex items-center">
                  <Mic className="w-4 h-4 mr-3" style={{ color: colors.primary }} />
                  <span className="text-sm" style={{ color: colors.textSecondary }}>Voice Over Professional</span>
                </div>
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-3 text-blue-600" />
                  <span className="text-sm" style={{ color: colors.textSecondary }}>Trusted Profile</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
