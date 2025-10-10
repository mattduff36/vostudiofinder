'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { cleanDescription } from '@/lib/utils/text';
import { SimpleStudioMap } from '@/components/maps/SimpleStudioMap';
import clsx from 'clsx';

import { 
  MapPin, 
  Star, 
  Globe, 
  Phone, 
  Mail, 
  Shield,
  ExternalLink,
  MessageCircle,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Music
} from 'lucide-react';

interface ModernStudioProfileV3Props {
  studio: {
    id: string;
    name: string;
    description: string;
    studioTypes: string[];
    address: string;
    website_url?: string;
    phone?: string;
    is_premium: boolean;
    is_verified: boolean;
    latitude?: number;
    longitude?: number;
    images: Array<{
      id: string;
      imageUrl: string;
      altText?: string;
      sortOrder: number;
    }>;
    services: Array<{
      service: string;
    }>;
    reviews: Array<{
      id: string;
      rating: number;
      content: string;
      created_at: Date;
      reviewer: {
        displayName: string;
      };
    }>;
    owner: {
      id: string;
      displayName: string;
      username: string;
      email: string;
      role: string;
      avatarUrl?: string;
      profile?: {
        studioName?: string | null;
        lastName?: string | null;
        phone?: string | null;
        about?: string | null;
        shortAbout?: string | null;
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

export function ModernStudioProfileV3({ studio }: ModernStudioProfileV3Props) {
  const [displayImages, setDisplayImages] = useState(studio.images);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);

  // Calculate average rating
  const averageRating = studio.reviews.length > 0
    ? studio.reviews.reduce((sum, review) => sum + review.rating, 0) / studio.reviews.length
    : 0;

  // Function to swap images when thumbnail is clicked
  const handleThumbnailClick = (clickedIndex: number) => {
    if (clickedIndex >= displayImages.length || clickedIndex < 0) return;
    
    const newImages = [...displayImages];
    const clickedImage = newImages[clickedIndex];
    const mainImage = newImages[0];
    
    // Only swap if both images exist
    if (clickedImage && mainImage) {
      newImages[0] = clickedImage;
      newImages[clickedIndex] = mainImage;
      setDisplayImages(newImages);
    }
  };

  // Studio type mapping
  const studioTypeLabels: { [key: string]: string } = {
    'HOME': 'Home Studio',
    'RECORDING': 'Recording Studio',
    'PODCAST': 'Podcast Studio',
    'EDITING': 'Editing Service',
    'VO_COACH': 'Voiceover Coaching',
    'VOICEOVER': 'Voiceover Artist'
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

  // Email and contact handling
  const canContactViaEmail = profile?.showEmail !== false && studio.owner.email;
  
  const getMailtoLink = () => {
    if (!canContactViaEmail) return '#';
    const subject = encodeURIComponent(
      `Enquiry about ${studio.name} from voiceoverstudiofinder.com`
    );
    return `mailto:${studio.owner.email}?subject=${subject}`;
  };

  const handleContactClick = () => {
    if (!canContactViaEmail) {
      setShowUnavailableModal(true);
    }
    // If email is available, mailto link will handle it
  };

  // Directions handling with platform detection
  const handleGetDirections = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (studio.latitude && studio.longitude) {
      if (isMobile) {
        // Try to open native app first
        let appUrl = '';
        if (isIOS) {
          appUrl = `comgooglemaps://?daddr=${studio.latitude},${studio.longitude}&directionsmode=driving`;
        } else if (isAndroid) {
          appUrl = `google.navigation:q=${studio.latitude},${studio.longitude}`;
        }
        
        // Try app URL, fallback to web if it fails
        if (appUrl) {
          window.location.href = appUrl;
          // Fallback to web after a short delay if app doesn't open
          setTimeout(() => {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${studio.latitude},${studio.longitude}`, '_blank');
          }, 1000);
        }
      } else {
        // Desktop: open in new tab
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${studio.latitude},${studio.longitude}`, '_blank');
      }
    } else if (studio.address) {
      // Fallback to address if no coordinates
      const encodedAddress = encodeURIComponent(studio.address);
      if (isMobile) {
        window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images & Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery - Large Featured + Thumbnails */}
            {displayImages.length > 0 && (
              <div className="mb-8">
                {/* Featured Image */}
                <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden mb-4">
                  <Image
                    src={displayImages[0]?.imageUrl || ''}
                    alt={displayImages[0]?.altText || studio.name}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                
                {/* Thumbnail Row */}
                {displayImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-3">
                    {displayImages.slice(1, 5).map((image, index) => (
                      <div 
                        key={image.id} 
                        className="relative h-24 bg-gray-200 rounded-md overflow-hidden cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-[#d42027] transition-all"
                        onClick={() => handleThumbnailClick(index + 1)}
                      >
                        <Image
                          src={image.imageUrl}
                          alt={image.altText || studio.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Studio Header */}
            <div className="mb-6">
              <div className="mb-3">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{studio.name}</h1>
                <div className="flex items-center space-x-4 mb-3">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {studio.is_verified && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <Shield className="w-4 h-4 mr-1" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>
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

            {/* Description */}
            <div className="mb-6">
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {cleanDescription(profile?.about || profile?.shortAbout || studio.description)}
                </p>
                {profile?.equipmentList && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Equipment</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {profile.equipmentList}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Social Media Links */}
            {socialLinks.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Find us on socials</h2>
                <div className="flex flex-wrap gap-3">
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

            {/* Connections Section */}
            {(() => {
              const connections = [
                { id: 'connection1', label: 'Source Connect', icon: '🔗', value: profile?.connection1 },
                { id: 'connection2', label: 'Source Connect Now', icon: '🔗', value: profile?.connection2 },
                { id: 'connection3', label: 'Phone patch', icon: '📞', value: profile?.connection3 },
                { id: 'connection4', label: 'Session Link Pro', icon: '🎤', value: profile?.connection4 },
                { id: 'connection5', label: 'Zoom or Teams', icon: '💻', value: profile?.connection5 },
                { id: 'connection6', label: 'Cleanfeed', icon: '🎵', value: profile?.connection6 },
                { id: 'connection7', label: 'Riverside', icon: '🎬', value: profile?.connection7 },
                { id: 'connection8', label: 'Google Hangouts', icon: '📹', value: profile?.connection8 },
              ].filter(conn => conn.value === '1');

              return connections.length > 0 ? (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">Connections</h2>
                  <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                    {connections.map((connection) => (
                      <div key={connection.id} className="flex items-center px-4 py-3">
                        <span className="text-xl mr-3">{connection.icon}</span>
                        <span className="text-sm font-medium text-gray-900">{connection.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Reviews Section */}
            {studio.reviews.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Reviews</h2>
                <div className="space-y-4">
                  {studio.reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {review.reviewer.displayName.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{review.reviewer.displayName}</span>
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
            <div className="sticky top-8 space-y-6">
              {/* Map Card - Integrated Design */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                {/* Map section - matches main image height (h-96 = 384px) */}
                <div className="h-96">
                  <SimpleStudioMap
                    latitude={studio.latitude}
                    longitude={studio.longitude}
                    address={studio.address}
                    height="384px"
                  />
                </div>
                {/* Gap - matches the gap between main image and thumbnails (gap-3 = 12px) */}
                <div className="h-3"></div>
                {/* Directions section - matches thumbnail row height (h-24 = 96px) */}
                <div className="h-24 flex flex-col justify-center px-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <p className="text-xs text-gray-600 line-clamp-1">{studio.address}</p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleGetDirections}
                    disabled={!studio.latitude && !studio.longitude && !studio.address}
                  >
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Get directions
                  </Button>
                </div>
              </div>

              {/* Studio Details Card - Compact */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-0">Studio Details</h3>
                
                <div className="space-y-2">
                  {/* Studio Types */}
                  {studio.studioTypes && studio.studioTypes.length > 0 && (
                    <div className="pb-2 border-b border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        {studio.studioTypes.map((type, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {studioTypeLabels[type] || type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phone */}
                  {(profile?.showPhone !== false) && (profile?.phone || studio.phone) && (
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-gray-600" />
                      </div>
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
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Globe className="w-4 h-4 text-gray-600" />
                      </div>
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

                </div>
                
                {/* Message Studio Button */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  {canContactViaEmail ? (
                    <a 
                      href={getMailtoLink()} 
                      rel="nofollow noopener noreferrer"
                      onClick={(e) => {
                        // Additional bot protection - only works with actual user clicks
                        if (!e.isTrusted) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <Button
                        size="sm"
                        className="w-full"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Message Studio
                      </Button>
                    </a>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handleContactClick}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message Studio
                    </Button>
                  )}
                </div>
              </div>

              {/* Rates Card */}
              {profile?.showRates !== false && rates.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-3">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-0">Rates</h3>
                  <div className="space-y-1">
                    {rates.map((rate, index) => (
                      <div key={index} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-600">{rate.duration}</span>
                        <span className="font-semibold text-gray-900">{rate.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Email Unavailable Modal */}
      {showUnavailableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowUnavailableModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Contact Information Not Available</h3>
            <p className="text-gray-600 mb-4">
              Contact information not available, please visit the studio's website directly.
            </p>
            {studio.website_url && (
              <a 
                href={studio.website_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
              >
                <Globe className="w-4 h-4 mr-2" />
                Visit Studio Website
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
            <div className="flex justify-end mt-4">
              <Button onClick={() => setShowUnavailableModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

