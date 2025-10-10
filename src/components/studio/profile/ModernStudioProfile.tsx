'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { cleanDescription } from '@/lib/utils/text';
import clsx from 'clsx';

import { 
  MapPin, 
  Star, 
  Globe, 
  Phone, 
  Mail, 
  Crown,
  Share2,
  Shield,
  ExternalLink,
  MessageCircle,
  Mic,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Music
} from 'lucide-react';

interface ModernStudioProfileProps {
  studio: {
    id: string;
    name: string;
    description: string;
    studio_type: string;
    address: string;
    website_url?: string;
    phone?: string;
    is_premium: boolean;
    is_verified: boolean;
    latitude?: number;
    longitude?: number;
    studio_images: Array<{
      id: string;
      imageUrl: string;
      alt_text?: string;
      sort_order: number;
    }>;
    studio_services: Array<{
      service: string;
    }>;
    reviews: Array<{
      id: string;
      rating: number;
      content: string;
      created_at: Date;
      reviewer: {
        display_name: string;
      };
    }>;
    owner: {
      id: string;
      display_name: string;
      username: string;
      email: string;
      role: string;
      avatar_url?: string;
      profile?: {
        studioName?: string | null;
        lastName?: string | null;
        phone?: string | null;
        about?: string | null;
        short_about?: string | null;
        location?: string | null;
        rateTier1?: string | null;
        rateTier2?: string | null;
        rateTier3?: string | null;
        showRates?: boolean | null;
        facebookUrl?: string | null;
        twitterUrl?: string | null;
        linkedinUrl?: string | null;
        instagramUrl?: string | null;
        youtubeUrl?: string | null;
        vimeoUrl?: string | null;
        soundcloudUrl?: string | null;
        isCrbChecked?: boolean | null;
        isFeatured?: boolean | null;
        isSpotlight?: boolean | null;
        verificationLevel?: string | null;
        homeStudioDescription?: string | null;
        equipmentList?: string | null;
        servicesOffered?: string | null;
        showEmail?: boolean | null;
        showPhone?: boolean | null;
        showAddress?: boolean | null;
      } | null;
    };
    created_at: Date;
    updated_at: Date;
    averageRating: number;
    _count: {
      reviews: number;
    };
  };
}

export function ModernStudioProfile({ studio }: ModernStudioProfileProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Calculate average rating
  const averageRating = studio.reviews.length > 0
    ? studio.reviews.reduce((sum, review) => sum + review.rating, 0) / studio.reviews.length
    : 0;

  // Studio type mapping
  const studioTypeLabels = {
    'VOICEOVER': 'Voiceover Studio',
    'RECORDING': 'Recording Studio', 
    'PODCAST': 'Podcast Studio',
    'PRODUCTION': 'Production Studio',
    'MOBILE': 'Mobile Studio'
  };

  // Service type mapping
  const serviceLabels = {
    'ISDN': 'ISDN',
    'SOURCE_CONNECT': 'Source Connect',
    'SOURCE_CONNECT_NOW': 'Source Connect Now',
    'CLEANFEED': 'Cleanfeed',
    'SESSION_LINK_PRO': 'Session Link Pro',
    'ZOOM': 'Zoom',
    'SKYPE': 'Skype',
    'TEAMS': 'Microsoft Teams'
  };

  // Social media links from owner profile
  const profile = studio.owner.profile;
  const socialLinks = [
    { 
      platform: 'Facebook', 
      url: profile?.facebookUrl, 
      icon: Facebook, 
      color: 'text-blue-600 hover:text-blue-800' 
    },
    { 
      platform: 'Twitter', 
      url: profile?.twitterUrl, 
      icon: Twitter, 
      color: 'text-sky-500 hover:text-sky-700' 
    },
    { 
      platform: 'LinkedIn', 
      url: profile?.linkedinUrl, 
      icon: Linkedin, 
      color: 'text-blue-700 hover:text-blue-900' 
    },
    { 
      platform: 'Instagram', 
      url: profile?.instagramUrl, 
      icon: Instagram, 
      color: 'text-pink-600 hover:text-pink-800' 
    },
    { 
      platform: 'YouTube', 
      url: profile?.youtubeUrl, 
      icon: Youtube, 
      color: 'text-red-600 hover:text-red-800' 
    },
    { 
      platform: 'Vimeo', 
      url: profile?.vimeoUrl, 
      icon: Globe, 
      color: 'text-green-600 hover:text-green-800' 
    },
    { 
      platform: 'SoundCloud', 
      url: profile?.soundcloudUrl, 
      icon: Music, 
      color: 'text-orange-500 hover:text-orange-700' 
    }
  ].filter(link => link.url);

  // Rates from profile data
  const rates = [];
  if (profile?.rateTier1) rates.push({ duration: '15 minutes', price: profile.rateTier1 });
  if (profile?.rateTier2) rates.push({ duration: '30 minutes', price: profile.rateTier2 });
  if (profile?.rateTier3) rates.push({ duration: '60 minutes', price: profile.rateTier3 });
  
  // Fallback rates if none are set
  if (rates.length === 0) {
    rates.push(
      { duration: '15 minutes', price: '£80' },
      { duration: '30 minutes', price: '£100' },
      { duration: '60 minutes', price: '£125' }
    );
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === studio.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? studio.images.length - 1 : prev - 1
    );
  };

  const getDirectionsUrl = () => {
    if (studio.latitude && studio.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${studio.latitude},${studio.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.address)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Section - Image Carousel and Location */}
      <div className="relative">
        {/* Image Carousel */}
        <div className="relative h-96 md:h-[500px] bg-gray-200 overflow-hidden">
          {studio.images.length > 0 ? (
            <>
              <Image
                src={studio.images[currentImageIndex]?.imageUrl || ''}
                alt={studio.images[currentImageIndex]?.alt_text || studio.name}
                fill
                className="object-cover"
                priority
              />
              
              {/* Navigation Arrows */}
              {studio.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
              
              {/* Image Counter */}
              {studio.images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {studio.images.length}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Mic className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg">No images available</p>
              </div>
            </div>
          )}
        </div>

        {/* Location Box - Overlay on Desktop */}
        <div className="absolute top-4 right-4 hidden md:block">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs">
            <div className="flex items-center mb-2">
              <MapPin className="w-5 h-5 text-gray-600 mr-2" />
              <span className="font-medium text-gray-900">Location</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{studio.address}</p>
            <Button
              size="sm"
              onClick={() => window.open(getDirectionsUrl(), '_blank')}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Get Directions
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2">
            {/* Studio Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{studio.name}</h1>
                  <div className="flex items-center space-x-4 mb-4">
                    {/* Studio Type Badges */}
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {studioTypeLabels[studio.studio_type as keyof typeof studioTypeLabels] || studio.studio_type}
                      </span>
                      {studio.is_premium && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                          <Crown className="w-4 h-4 mr-1" />
                          Premium
                        </span>
                      )}
                      {studio.is_verified && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <Shield className="w-4 h-4 mr-1" />
                          Verified
                        </span>
                      )}
                      {profile?.isCrbChecked && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <Shield className="w-4 h-4 mr-1" />
                          CRB Checked
                        </span>
                      )}
                      {profile?.isFeatured && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                          <Star className="w-4 h-4 mr-1" />
                          Featured
                        </span>
                      )}
                      {profile?.isSpotlight && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                          <Star className="w-4 h-4 mr-1" />
                          Spotlight
                        </span>
                      )}
                      {profile?.verificationLevel && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                          <Shield className="w-4 h-4 mr-1" />
                          {profile.verificationLevel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Share Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: studio.name,
                        text: studio.description,
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                    }
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>

              {/* Rating and Reviews */}
              {studio.reviews.length > 0 && (
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={clsx(
                          'w-5 h-5',
                          i < Math.floor(averageRating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {averageRating.toFixed(1)} ({studio._count.reviews} reviews)
                  </span>
                </div>
              )}
            </div>

            {/* Connections Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Connections</h2>
              <div className="flex flex-wrap gap-3">
                {studio.services.map((service, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium"
                  >
                    {serviceLabels[service.service as keyof typeof serviceLabels] || service.service}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About this studio</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {cleanDescription(profile?.about || profile?.short_about || studio.description)}
                </p>
                {profile?.equipmentList && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Equipment</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {profile.equipmentList}
                    </p>
                  </div>
                )}
                {profile?.servicesOffered && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Services Offered</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {profile.servicesOffered}
                    </p>
                  </div>
                )}
                {profile?.homeStudioDescription && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Home Studio</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {profile.homeStudioDescription}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Social Media Links */}
            {socialLinks.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Get social</h2>
                <div className="flex space-x-4">
                  {socialLinks.map((link, index) => {
                    const Icon = link.icon;
                    return (
                      <a
                        key={index}
                        href={link.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={clsx(
                          'flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors',
                          link.color,
                          'hover:bg-gray-50'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{link.platform}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            {studio.reviews.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Reviews</h2>
                <div className="space-y-4">
                  {studio.reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {review.reviewer.display_name.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{review.reviewer.display_name}</span>
                        </div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={clsx(
                                'w-4 h-4',
                                i < review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm">{review.content}</p>
                      <p className="text-gray-500 text-xs mt-2">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Sticky on Desktop */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {/* Studio Details Card */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Studio Details</h3>
                
                <div className="space-y-4">
                  {/* Address */}
                  {(profile?.showAddress !== false) && studio.address && (
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">{studio.address}</p>
                        {profile?.location && (
                          <p className="text-xs text-gray-500 mt-1">{profile.location}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Phone */}
                  {(profile?.showPhone !== false) && (profile?.phone || studio.phone) && (
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <a
                        href={`tel:${profile?.phone || studio.phone}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {profile?.phone || studio.phone}
                      </a>
                    </div>
                  )}

                  {/* Website */}
                  {studio.website_url && (
                    <div className="flex items-center space-x-3">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <a
                        href={studio.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        Visit Website
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}

                  {/* Email */}
                  {(profile?.showEmail !== false) && (
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <a
                        href={`mailto:${studio.owner.email}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {studio.owner.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Rates Card */}
              {profile?.showRates !== false && rates.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Rates</h3>
                  <div className="space-y-3">
                    {rates.map((rate, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{rate.duration}</span>
                        <span className="font-semibold text-gray-900">{rate.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Map Card */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Studio location</h3>
                <div className="bg-gray-200 rounded-lg h-48 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MapPin className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Map placeholder</p>
                    <p className="text-xs text-gray-400">{studio.address}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => window.open(getDirectionsUrl(), '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Get directions
                </Button>
              </div>

              {/* Contact CTA */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <Button
                  size="lg"
                  className="w-full mb-4"
                  onClick={() => setIsContactModalOpen(true)}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Message Studio
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Member of Studio Finder since: {new Date(studio.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal Placeholder */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Contact {studio.name}</h3>
            <p className="text-gray-600 mb-4">Contact modal would go here...</p>
            <Button onClick={() => setIsContactModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
