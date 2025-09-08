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
  Star, 
  Shield, 
  Award,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Music,
  DollarSign,
  Mic,
  Settings,
  Users,
  Calendar,
  Clock,
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

  // Social media links
  const socialLinks = [
    { 
      platform: 'Facebook', 
      url: profile?.facebookUrl, 
      icon: Facebook, 
      color: 'text-blue-600' 
    },
    { 
      platform: 'Twitter', 
      url: profile?.twitterUrl, 
      icon: Twitter, 
      color: 'text-sky-500' 
    },
    { 
      platform: 'LinkedIn', 
      url: profile?.linkedinUrl, 
      icon: Linkedin, 
      color: 'text-blue-700' 
    },
    { 
      platform: 'Instagram', 
      url: profile?.instagramUrl, 
      icon: Instagram, 
      color: 'text-pink-600' 
    },
    { 
      platform: 'YouTube', 
      url: profile?.youtubeUrl, 
      icon: Youtube, 
      color: 'text-red-600' 
    },
    { 
      platform: 'SoundCloud', 
      url: profile?.soundcloudUrl, 
      icon: Music, 
      color: 'text-orange-500' 
    }
  ].filter(link => link.url);

  // Professional badges
  const badges = [];
  if (profile?.isFeatured) badges.push({ label: 'Featured', icon: Star, color: 'bg-yellow-100 text-yellow-800' });
  if (profile?.isSpotlight) badges.push({ label: 'Spotlight', icon: Award, color: 'bg-purple-100 text-purple-800' });
  if (profile?.isCrbChecked) badges.push({ label: 'CRB Checked', icon: Shield, color: 'bg-green-100 text-green-800' });
  if (profile?.verificationLevel === 'verified') badges.push({ label: 'Verified', icon: Shield, color: 'bg-blue-100 text-blue-800' });

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8 text-white">
        <div className="flex items-start space-x-6">
          <div className="flex-shrink-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold">
              {profile?.firstName && profile?.lastName 
                ? `${profile.firstName} ${profile.lastName}`
                : user.displayName
              }
            </h1>
            {user.displayName !== `${profile?.firstName} ${profile?.lastName}` && (
              <p className="text-primary-100 text-lg">@{user.username}</p>
            )}
            
            {/* Badges */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {badges.map((badge, index) => {
                  const Icon = badge.icon;
                  return (
                    <span
                      key={index}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {badge.label}
                    </span>
                  );
                })}
              </div>
            )}
            
            {/* Location */}
            {profile?.location && (
              <div className="flex items-center mt-2 text-primary-100">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{profile.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            {profile?.about && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">About</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed">{profile.about}</p>
                </div>
              </section>
            )}

            {/* Equipment & Studio */}
            {(profile?.homeStudioDescription || profile?.equipmentList) && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <Mic className="w-5 h-5 mr-2" />
                  Studio & Equipment
                </h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {profile?.homeStudioDescription && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Studio Setup</h3>
                      <p className="text-gray-700">{profile.homeStudioDescription}</p>
                    </div>
                  )}
                  {profile?.equipmentList && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Equipment</h3>
                      <p className="text-gray-700">{profile.equipmentList}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Services */}
            {profile?.servicesOffered && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Services Offered
                </h2>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-700">{profile.servicesOffered}</p>
                </div>
              </section>
            )}

            {/* Pricing */}
            {profile?.showRates && (profile?.rateTier1 || profile?.rateTier2 || profile?.rateTier3) && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Pricing
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {profile?.rateTier1 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-medium text-green-900 mb-1">Basic Rate</h3>
                      <p className="text-green-700">{profile.rateTier1}</p>
                    </div>
                  )}
                  {profile?.rateTier2 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-medium text-blue-900 mb-1">Standard Rate</h3>
                      <p className="text-blue-700">{profile.rateTier2}</p>
                    </div>
                  )}
                  {profile?.rateTier3 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h3 className="font-medium text-purple-900 mb-1">Premium Rate</h3>
                      <p className="text-purple-700">{profile.rateTier3}</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact</h2>
              <div className="space-y-3">
                {profile?.showEmail && (
                  <div className="flex items-center text-gray-700">
                    <Mail className="w-4 h-4 mr-3 text-gray-400" />
                    <a href={`mailto:${user.email}`} className="hover:text-primary-600">
                      {user.email}
                    </a>
                  </div>
                )}
                {profile?.showPhone && profile?.phone && (
                  <div className="flex items-center text-gray-700">
                    <Phone className="w-4 h-4 mr-3 text-gray-400" />
                    <a href={`tel:${profile.phone}`} className="hover:text-primary-600">
                      {profile.phone}
                    </a>
                  </div>
                )}
              </div>
            </section>

            {/* Social Media */}
            {socialLinks.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Connect</h2>
                <div className="space-y-2">
                  {socialLinks.map((link, index) => {
                    const Icon = link.icon;
                    return (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors ${link.color}`}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        <span className="text-gray-700 hover:text-gray-900">
                          {link.platform}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Professional Info */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Professional</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Verification:</span>{' '}
                  <span className="capitalize">{profile?.verificationLevel || 'None'}</span>
                </div>
                <div>
                  <span className="font-medium">Member since:</span>{' '}
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
                {profile?.isCrbChecked && (
                  <div className="flex items-center text-green-600">
                    <Shield className="w-4 h-4 mr-1" />
                    <span>CRB Checked</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
