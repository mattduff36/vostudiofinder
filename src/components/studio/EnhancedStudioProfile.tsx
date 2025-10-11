'use client';

import React from 'react';
import { Studio, User, UserProfile, StudioImage, StudioService } from '@/types/prisma';
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
  Camera,
  Users,
  Headphones,
  Wifi
} from 'lucide-react';

interface EnhancedStudioProfileProps {
  studio: Studio & {
    owner: User & {
      profile?: UserProfile | null;
    };
    studio_images: StudioImage[];
    studio_services: StudioService[];
    studioTypes?: Array<{ studio_type: string }>;
    reviews?: any[];
  };
}

export function EnhancedStudioProfile({ studio }: EnhancedStudioProfileProps) {
  const ownerProfile = studio.owner.profile;
  
  // Social media links from owner profile
  const socialLinks = [
    { 
      platform: 'Facebook', 
      url: ownerProfile?.facebookUrl, 
      icon: Facebook, 
      color: 'text-blue-600' 
    },
    { 
      platform: 'Twitter', 
      url: ownerProfile?.twitterUrl, 
      icon: Twitter, 
      color: 'text-sky-500' 
    },
    { 
      platform: 'LinkedIn', 
      url: ownerProfile?.linkedinUrl, 
      icon: Linkedin, 
      color: 'text-blue-700' 
    },
    { 
      platform: 'Instagram', 
      url: ownerProfile?.instagramUrl, 
      icon: Instagram, 
      color: 'text-pink-600' 
    },
    { 
      platform: 'YouTube', 
      url: ownerProfile?.youtubeUrl, 
      icon: Youtube, 
      color: 'text-red-600' 
    },
    { 
      platform: 'SoundCloud', 
      url: ownerProfile?.soundcloudUrl, 
      icon: Music, 
      color: 'text-orange-500' 
    }
  ].filter(link => link.url);

  // Professional badges
  const badges = [];
  if (studio.is_premium) badges.push({ label: 'Premium', icon: Star, color: 'bg-yellow-100 text-yellow-800' });
  if (studio.is_verified) badges.push({ label: 'Verified', icon: Shield, color: 'bg-green-100 text-green-800' });
  if (ownerProfile?.is_featured) badges.push({ label: 'Featured Owner', icon: Award, color: 'bg-purple-100 text-purple-800' });
  if (ownerProfile?.isCrbChecked) badges.push({ label: 'CRB Checked', icon: Shield, color: 'bg-blue-100 text-blue-800' });

  // Service icons mapping
  const serviceIcons: { [key: string]: any } = {
    'ISDN': Wifi,
    'SOURCE_CONNECT': Headphones,
    'PHONE_PATCH': Phone,
    'REMOTE_RECORDING': Mic,
    'LIVE_DIRECTION': Users,
    'EDITING': Settings,
    'MIXING': Music
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Hero Section with Images */}
      <div className="relative h-64 md:h-80 bg-gray-200">
        {studio.studio_images.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 h-full">
            {studio.studio_images.slice(0, 3).map((image, index) => (
              <div key={image.id} className={`relative ${index === 0 ? 'md:col-span-2' : ''}`}>
                <img
                  src={image.imageUrl}
                  alt={image.alt_text || `${studio.name} studio image`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary-100 to-primary-200">
            <Camera className="w-16 h-16 text-primary-400" />
          </div>
        )}
        
        {/* Studio Type Badge */}
        {studio.studioTypes && studio.studioTypes.length > 0 && studio.studioTypes[0] && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/90 text-gray-800">
              {studio.studioTypes[0].studio_type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Studio
            </span>
          </div>
        )}
      </div>

      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{studio.name}</h1>
            
            {/* Owner Info */}
            <div className="flex items-center space-x-3 mb-3">
              {studio.owner.avatar_url && (
                <img
                  src={studio.owner.avatar_url}
                  alt={studio.owner.display_name}
                  className="w-8 h-8 rounded-full border-2 border-white/50"
                />
              )}
              <span className="text-primary-100">
                Owned by {ownerProfile?.studioName && ownerProfile?.lastName 
                  ? `${ownerProfile.studioName} ${ownerProfile.lastName}`
                  : studio.owner.display_name
                }
              </span>
            </div>
            
            {/* Badges */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
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
            {studio.address && (
              <div className="flex items-center text-primary-100">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{studio.address}</span>
              </div>
            )}
          </div>

          {/* Contact Actions */}
          <div className="flex flex-col space-y-2">
            {studio.phone && (
              <a
                href={`tel:${studio.phone}`}
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Studio
              </a>
            )}
            {studio.website_url && (
              <a
                href={studio.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <Globe className="w-4 h-4 mr-2" />
                Visit Website
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {studio.description && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">About This Studio</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {studio.description}
                  </p>
                </div>
              </section>
            )}

            {/* Equipment & Setup */}
            {ownerProfile?.homeStudioDescription && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <Mic className="w-5 h-5 mr-2" />
                  Studio Setup & Equipment
                </h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {ownerProfile.homeStudioDescription}
                  </p>
                  {ownerProfile.equipmentList && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h3 className="font-medium text-gray-900 mb-2">Equipment List</h3>
                      <p className="text-gray-700">{ownerProfile.equipmentList}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Services & Capabilities */}
            {(studio.studio_services.length > 0 || ownerProfile?.servicesOffered) && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Services & Capabilities
                </h2>
                
                {/* Technical Services */}
                {studio.studio_services.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-900 mb-2">Technical Services</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {studio.studio_services.map((service) => {
                        const Icon = serviceIcons[service.service] || Settings;
                        return (
                          <div
                            key={service.id}
                            className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg"
                          >
                            <Icon className="w-4 h-4 mr-2 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">
                              {service.service.replace(/_/g, ' ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Additional Services */}
                {ownerProfile?.servicesOffered && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Additional Services</h3>
                    <p className="text-gray-700">{ownerProfile.servicesOffered}</p>
                  </div>
                )}
              </section>
            )}

            {/* Pricing */}
            {ownerProfile?.showRates && (ownerProfile?.rateTier1 || ownerProfile?.rateTier2 || ownerProfile?.rateTier3) && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Studio Rates
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ownerProfile?.rateTier1 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-medium text-green-900 mb-1">Basic Rate</h3>
                      <p className="text-green-700">{ownerProfile.rateTier1}</p>
                    </div>
                  )}
                  {ownerProfile?.rateTier2 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-medium text-blue-900 mb-1">Standard Rate</h3>
                      <p className="text-blue-700">{ownerProfile.rateTier2}</p>
                    </div>
                  )}
                  {ownerProfile?.rateTier3 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h3 className="font-medium text-purple-900 mb-1">Premium Rate</h3>
                      <p className="text-purple-700">{ownerProfile.rateTier3}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Studio Images Gallery */}
            {studio.studio_images.length > 3 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <Camera className="w-5 h-5 mr-2" />
                  Studio Gallery
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {studio.studio_images.slice(3).map((image) => (
                    <div key={image.id} className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={image.imageUrl}
                        alt={image.alt_text || `${studio.name} studio image`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <section className="bg-gray-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Info</h2>
              <div className="space-y-2 text-sm">
                {studio.studioTypes && studio.studioTypes.length > 0 && studio.studioTypes[0] && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Studio Type:</span>
                    <span className="font-medium capitalize">
                      {studio.studioTypes[0].studio_type.replace('_', ' ').toLowerCase()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-green-600">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Member Since:</span>
                  <span className="font-medium">
                    {new Date(studio.created_at).toLocaleDateString()}
                  </span>
                </div>
                {studio.reviews && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reviews:</span>
                    <span className="font-medium">{studio.reviews.length}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact Studio</h2>
              <div className="space-y-3">
                {ownerProfile?.showEmail && (
                  <div className="flex items-center text-gray-700">
                    <Mail className="w-4 h-4 mr-3 text-gray-400" />
                    <a href={`mailto:${studio.owner.email}`} className="hover:text-primary-600">
                      {studio.owner.email}
                    </a>
                  </div>
                )}
                {ownerProfile?.showPhone && studio.phone && (
                  <div className="flex items-center text-gray-700">
                    <Phone className="w-4 h-4 mr-3 text-gray-400" />
                    <a href={`tel:${studio.phone}`} className="hover:text-primary-600">
                      {studio.phone}
                    </a>
                  </div>
                )}
                {studio.website_url && (
                  <div className="flex items-center text-gray-700">
                    <Globe className="w-4 h-4 mr-3 text-gray-400" />
                    <a 
                      href={studio.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-primary-600"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>
            </section>

            {/* Social Media */}
            {socialLinks.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Follow Studio</h2>
                <div className="space-y-2">
                  {socialLinks
                    .filter((link) => link.url)
                    .map((link, index) => {
                      const Icon = link.icon;
                      return (
                        <a
                          key={index}
                          href={link.url || undefined}
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

            {/* Book Studio CTA */}
            <section className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <h3 className="font-semibold text-primary-900 mb-2">Ready to Book?</h3>
              <p className="text-sm text-primary-700 mb-3">
                Contact this studio directly to discuss your project and availability.
              </p>
              <button className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                Contact Studio
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
