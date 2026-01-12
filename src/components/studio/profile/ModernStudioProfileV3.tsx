'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { cleanDescription } from '@/lib/utils/text';
import { SimpleStudioMap } from '@/components/maps/SimpleStudioMap';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { formatRateWithCurrency } from '@/lib/utils/currency';
import { Footer } from '@/components/home/Footer';
import clsx from 'clsx';
import { generateStudioImageAlt } from '@/lib/utils/image-alt';

// Phase 3: Mobile profile components
import { CompactHero } from './mobile/CompactHero';
import { AboutCollapsible } from './mobile/AboutCollapsible';
import { ServicesListCompact } from './mobile/ServicesListCompact';
import { MapFullscreen } from './mobile/MapFullscreen';

// Force rebuild: Updated types for connection9-12 and custom_connection_methods
import { 
  MapPin, 
  Star, 
  Globe, 
  Phone, 
  Mail, 
  Check,
  ExternalLink,
  MessageCircle,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  Music,
  Video
} from 'lucide-react';
import { XLogo } from '@/components/icons/XLogo';

interface ModernStudioProfileV3Props {
  studio: {
    id: string;
    name: string;
    description: string;
    studio_studio_types: string[];
    address?: string; // Legacy field
    full_address?: string;
    city?: string;
    website_url?: string;
    phone?: string;
    is_premium: boolean;
    is_verified: boolean;
    latitude?: number;
    longitude?: number;
    show_exact_location?: boolean;
    studio_images?: Array<{
      id: string;
      image_url: string;
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
        studio_name?: string | null;
        last_name?: string | null;
        phone?: string | null;
        about?: string | null;
        short_about?: string | null;
        location?: string | null;
        rate_tier_1?: string | null;
        rate_tier_2?: string | null;
        rate_tier_3?: string | null;
        show_rates?: boolean | null;
        facebook_url?: string | null;
        twitter_url?: string | null;
        linkedin_url?: string | null;
        instagram_url?: string | null;
        youtube_url?: string | null;
        vimeo_url?: string | null;
        soundcloud_url?: string | null;
        is_crb_checked?: boolean | null;
        is_featured?: boolean | null;
        is_spotlight?: boolean | null;
        verification_level?: string | null;
        home_studio_description?: string | null;
        equipment_list?: string | null;
        services_offered?: string | null;
        show_email?: boolean | null;
        show_phone?: boolean | null;
        show_address?: boolean | null;
        show_directions?: boolean | null;
        use_coordinates_for_map?: boolean | null;
        connection1?: string | null;
        connection2?: string | null;
        connection3?: string | null;
        connection4?: string | null;
        connection5?: string | null;
        connection6?: string | null;
        connection7?: string | null;
        connection8?: string | null;
        connection9?: string | null;
        connection10?: string | null;
        connection11?: string | null;
        connection12?: string | null;
        custom_connection_methods?: string[] | null;
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
  const [displayImages, setDisplayImages] = useState(studio.studio_images || []);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

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
    'VO_COACH': 'Voiceover Coaching Service',
    'VOICEOVER': 'Voiceover Artist'
  };

  // Social media links from owner profile
  const profile = studio.owner.profile;
  const socialLinks = [
    { 
      platform: 'Facebook', 
      url: profile?.facebook_url, 
      icon: Facebook, 
      color: 'text-blue-600 hover:text-blue-800' 
    },
    { 
      platform: 'X (formerly Twitter)', 
      url: profile?.x_url || profile?.twitter_url, 
      icon: XLogo, 
      color: 'text-sky-500 hover:text-sky-700' 
    },
    { 
      platform: 'LinkedIn', 
      url: profile?.linkedin_url, 
      icon: Linkedin, 
      color: 'text-blue-700 hover:text-blue-900' 
    },
    { 
      platform: 'Instagram', 
      url: profile?.instagram_url, 
      icon: Instagram, 
      color: 'text-pink-600 hover:text-pink-800' 
    },
    { 
      platform: 'TikTok', 
      url: profile?.tiktok_url, 
      icon: Video, 
      color: 'text-gray-900 hover:text-black' 
    },
    { 
      platform: 'Threads', 
      url: profile?.threads_url, 
      icon: MessageCircle, 
      color: 'text-gray-900 hover:text-black' 
    },
    { 
      platform: 'YouTube', 
      url: profile?.youtube_url, 
      icon: Youtube, 
      color: 'text-red-600 hover:text-red-800' 
    },
    { 
      platform: 'SoundCloud', 
      url: profile?.soundcloud_url, 
      icon: Music, 
      color: 'text-orange-500 hover:text-orange-700' 
    }
  ].filter(link => link.url);

  // Rates from profile data with currency formatting
  const rates = [];
  const country = profile?.location;
  if (profile?.rate_tier_1) {
    rates.push({ 
      duration: '15 minutes', 
      price: formatRateWithCurrency(profile.rate_tier_1, country) 
    });
  }
  if (profile?.rate_tier_2) {
    rates.push({ 
      duration: '30 minutes', 
      price: formatRateWithCurrency(profile.rate_tier_2, country) 
    });
  }
  if (profile?.rate_tier_3) {
    rates.push({ 
      duration: '60 minutes', 
      price: formatRateWithCurrency(profile.rate_tier_3, country) 
    });
  }

  // Email and contact handling
  const canContactViaEmail = profile?.show_email !== false && studio.owner.email;
  
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
  // Request location permission when user clicks "Get Directions" (for better directions)
  const handleGetDirections = async () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Request user's current location for better directions (optional - will use if available)
    let userLocation: { lat: number; lng: number } | null = null;
    try {
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 3000, // Quick timeout - don't wait too long
            maximumAge: 300000, // Accept cached location up to 5 minutes old
          });
        });
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      }
    } catch (error) {
      // Silently fail - location is optional for directions
      // Google Maps will use browser's location if available
    }
    
    if (studio.latitude && studio.longitude) {
      // Build directions URL with optional origin
      let directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${studio.latitude},${studio.longitude}`;
      if (userLocation) {
        directionsUrl += `&origin=${userLocation.lat},${userLocation.lng}`;
      }
      
      if (isMobile) {
        // Detect platform only within mobile check to prevent inconsistent state
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isAndroid = /Android/i.test(navigator.userAgent);
        
        // Try to open native app first
        let appUrl = '';
        if (isIOS) {
          appUrl = `comgooglemaps://?daddr=${studio.latitude},${studio.longitude}&directionsmode=driving`;
          if (userLocation) {
            appUrl += `&saddr=${userLocation.lat},${userLocation.lng}`;
          }
        } else if (isAndroid) {
          // Android navigation scheme doesn't support origin parameter
          // Only destination is supported: google.navigation:q=lat,lng
          appUrl = `google.navigation:q=${studio.latitude},${studio.longitude}`;
        }
        
        // Try app URL, fallback to web if it fails
        if (appUrl) {
          window.location.href = appUrl;
          // Fallback to web after a short delay if app doesn't open
          setTimeout(() => {
            window.open(directionsUrl, '_blank');
          }, 1000);
        } else {
          window.open(directionsUrl, '_blank');
        }
      } else {
        // Desktop: open in new tab
        window.open(directionsUrl, '_blank');
      }
    } else if (studio.full_address || studio.address) {
      // Fallback to full_address or legacy address if no coordinates
      const addressToUse = studio.full_address || studio.address || '';
      const encodedAddress = encodeURIComponent(addressToUse);
      let directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
      if (userLocation) {
        directionsUrl += `&origin=${userLocation.lat},${userLocation.lng}`;
      }
      
      if (isMobile) {
        window.location.href = directionsUrl;
      } else {
        window.open(directionsUrl, '_blank');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Compact Hero (< 768px only) */}
      <CompactHero
        studioName={studio.name}
        ownerDisplayName={studio.owner.display_name}
        ownerUsername={studio.owner.username}
        ownerAvatarUrl={studio.owner.avatar_url}
        studioImages={displayImages}
        isVerified={studio.is_verified}
        address={studio.city || studio.full_address || studio.address || ''}
        showAddress={profile?.show_address}
      />

      {/* Main Content Wrapper with flex-1 */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Components (< 768px only) */}
        <>
          {/* Top Action Button - Same logic as desktop Studio Details section */}
          <div className="bg-white border-b border-gray-200 md:hidden px-4 py-3">
            {canContactViaEmail ? (
              <a 
                href={getMailtoLink()} 
                rel="nofollow noopener noreferrer"
                onClick={(e) => {
                  if (!e.isTrusted) {
                    e.preventDefault();
                  }
                }}
                className="block w-full"
              >
                <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-[#d42027] text-white rounded-lg hover:bg-[#a1181d] transition-colors font-medium">
                  <Mail className="w-5 h-5" aria-hidden="true" />
                  <span>Message Studio</span>
                </button>
              </a>
            ) : studio.website_url && (profile?.show_email === false) ? (
              <a 
                href={studio.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-[#d42027] text-white rounded-lg hover:bg-[#a1181d] transition-colors font-medium">
                  <Globe className="w-5 h-5" aria-hidden="true" />
                  <span>Visit Website</span>
                </button>
              </a>
            ) : (
              <button 
                onClick={handleContactClick}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-[#d42027] text-white rounded-lg hover:bg-[#a1181d] transition-colors font-medium"
              >
                <MessageCircle className="w-5 h-5" aria-hidden="true" />
                <span>Contact Studio</span>
              </button>
            )}
          </div>

          {/* Contact Info */}
          {((profile?.show_phone !== false && (profile?.phone || studio.phone)) || 
            (profile?.show_email !== false && studio.owner.email)) && (
            <div className="bg-white border-b border-gray-200 md:hidden px-4 py-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact</h3>
              <div className="space-y-2">
                {profile?.show_phone !== false && (profile?.phone || studio.phone) && (
                  <a
                    href={`tel:${profile?.phone || studio.phone}`}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Phone className="w-5 h-5 text-[#d42027]" aria-hidden="true" />
                    <span className="text-sm text-gray-700">{profile?.phone || studio.phone}</span>
                  </a>
                )}
                {profile?.show_email !== false && studio.owner.email && (
                  <a
                    href={`mailto:${studio.owner.email}?subject=Enquiry about ${studio.name}`}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Mail className="w-5 h-5 text-[#d42027]" aria-hidden="true" />
                    <span className="text-sm text-gray-700">{studio.owner.email}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          <AboutCollapsible
            about={profile?.about || profile?.short_about || studio.description}
            equipmentList={profile?.equipment_list}
            servicesOffered={profile?.services_offered}
            studioTypes={studio.studio_studio_types}
          />

          {/* Rates Section */}
          {profile?.show_rates !== false && rates.length > 0 && (
            <div className="bg-white border-b border-gray-200 md:hidden px-4 py-4">
              <p className="text-xs text-gray-500 mb-3">Rates</p>
              <div className="space-y-2">
                {rates.map((rate, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{rate.duration}</span>
                    <span className="text-sm font-semibold text-[#d42027]">{rate.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connections Section */}
          {(() => {
            // Type-safe access to connection fields with fallback
            const getConnection = (field: string) => {
              return (profile as any)?.[field] || null;
            };

            const standardConnections = [
              { id: 'connection1', value: profile?.connection1, label: 'Source Connect' },
              { id: 'connection2', value: profile?.connection2, label: 'Source Connect Now' },
              { id: 'connection3', value: profile?.connection3, label: 'Phone Patch' },
              { id: 'connection4', value: profile?.connection4, label: 'Session Link Pro' },
              { id: 'connection5', value: profile?.connection5, label: 'Zoom or Teams' },
              { id: 'connection6', value: profile?.connection6, label: 'Cleanfeed' },
              { id: 'connection7', value: profile?.connection7, label: 'Riverside' },
              { id: 'connection8', value: profile?.connection8, label: 'Google Hangouts' },
              { id: 'connection9', value: getConnection('connection9'), label: 'ipDTL' },
              { id: 'connection10', value: getConnection('connection10'), label: 'SquadCast' },
              { id: 'connection11', value: getConnection('connection11'), label: 'Zencastr' },
              { id: 'connection12', value: getConnection('connection12'), label: 'Other (See profile)' },
            ].filter(conn => conn.value === '1');

            const customConnections = (profile?.custom_connection_methods || []).map((method, index) => ({
              id: `custom_${index}`,
              label: method,
            }));

            const allConnections = [...standardConnections, ...customConnections];

            return allConnections.length > 0 ? (
              <div className="bg-white border-b border-gray-200 md:hidden px-4 py-4">
                <p className="text-xs text-gray-500 mb-3">Connections</p>
                <div className="flex flex-wrap gap-2">
                  {allConnections.map((connection) => (
                    <span
                      key={connection.id}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {connection.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* Social Media Links */}
          {socialLinks.length > 0 && (
            <div className="bg-white border-b border-gray-200 md:hidden px-4 py-4">
              <p className="text-xs text-gray-500 mb-3">Social Media</p>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((link, index) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={index}
                      href={link.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={clsx(
                        'flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors',
                        link.color,
                        'hover:opacity-80'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{link.platform}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Mobile Map Section */}
          {studio.latitude && studio.longitude && (
            <div className="bg-white border-b border-gray-200 md:hidden">
              <div className="px-4 py-4">
                <p className="text-xs text-gray-500 mb-3">Location</p>
                <MapFullscreen
                  latitude={studio.latitude}
                  longitude={studio.longitude}
                  address={studio.city || studio.full_address || studio.address || ''}
                  fullAddress={studio.full_address || studio.address || ''}
                  showExactLocation={studio.show_exact_location ?? true}
                />
                {/* Button - hidden when show_directions is off */}
                {profile?.show_directions !== false && (
                  <button
                    onClick={handleGetDirections}
                    disabled={!studio.latitude && !studio.longitude && !studio.full_address && !studio.address}
                    className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-3 bg-[#d42027] text-white rounded-lg hover:bg-[#a1181d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ExternalLink className="w-5 h-5" aria-hidden="true" />
                    <span className="font-medium">Get directions</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </>

      {/* Main Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 hidden md:block">
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images & Main Content */}
          <div className="lg:col-span-2 w-full">
            {/* Image Gallery - Large Featured + Thumbnails */}
            {displayImages.length > 0 && (
              <div className="mb-8 w-full">
                {/* Featured Image */}
                <div 
                  className="relative aspect-[25/12] bg-gray-200 rounded-lg overflow-hidden mb-4 cursor-pointer group"
                  onClick={() => setShowLightbox(true)}
                >
                  <Image
                    src={displayImages[0]?.image_url || ''}
                    alt={generateStudioImageAlt(
                      studio.name,
                      studio.city || studio.full_address || studio.address,
                      displayImages[0]?.alt_text
                    )}
                    fill
                    className="object-cover group-hover:opacity-95 transition-opacity"
                    priority
                  />
                  {/* Click hint overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3">
                      <svg className="w-6 h-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Thumbnail Row */}
                {displayImages.length > 1 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {displayImages.slice(1, 5).map((image, index) => (
                      <div 
                        key={image.id} 
                        className="relative aspect-[25/12] bg-gray-200 rounded-md overflow-hidden cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-[#d42027] transition-all"
                        onClick={() => handleThumbnailClick(index + 1)}
                      >
                        <Image
                          src={image.image_url}
                          alt={image.alt_text || studio.name}
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
            <div className="mb-6 w-full">
              <h1 className="text-3xl font-bold text-gray-900 mb-3 flex items-center gap-3 w-full">
                {/* Profile Avatar */}
                {studio.owner.avatar_url && (
                  <AvatarUpload
                    currentAvatar={studio.owner.avatar_url}
                    onAvatarChange={() => {}}
                    size="small"
                    editable={false}
                    userName={studio.owner.display_name || studio.owner.username}
                    variant="profile"
                  />
                )}
                <span>{studio.name}</span>
                {studio.is_verified && (
                  <span 
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 hover:bg-red-600 transition-colors cursor-help" 
                    title="Verified studio — approved by our team"
                  >
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </span>
                )}
              </h1>

              {/* Rating and Reviews */}
              {studio.reviews.length > 0 && (
                <div className="flex items-center space-x-2 mb-4 w-full">
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
            <div className="mb-6 w-full">
              <div className="bg-white rounded-lg border border-gray-200 shadow-lg px-6 py-3 w-full">
                <div className="prose prose-gray max-w-none w-full">
                  {(() => {
                    const cleanedAbout = cleanDescription(profile?.about || profile?.short_about || studio.description);
                    const cleanedEquipment = profile?.equipment_list ? cleanDescription(profile.equipment_list) : '';
                    const cleanedServices = profile?.services_offered ? cleanDescription(profile.services_offered) : '';
                    
                    return (
                      <>
                        {cleanedAbout && (
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line break-words w-full">
                            {cleanedAbout}
                          </p>
                        )}
                        {cleanedEquipment && (
                          <div className={`${cleanedAbout ? 'pt-4 border-t border-gray-200' : ''}`}>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Equipment</h3>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line break-words">
                              {cleanedEquipment}
                            </p>
                          </div>
                        )}
                        {cleanedServices && (
                          <div className={`${(cleanedAbout || cleanedEquipment) ? 'pt-4 border-t border-gray-200' : ''}`}>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Services Offered</h3>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line break-words">
                              {cleanedServices}
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            {studio.reviews.length > 0 && (
              <div className="mb-6 w-full">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 w-full">Reviews</h2>
                <div className="space-y-4 w-full">
                  {studio.reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="border border-gray-200 rounded-lg p-4 w-full">
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

            {/* Verified Studio Badge at Bottom */}
            {studio.is_verified && (
              <div className="mb-6 w-full">
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg w-full">
                  <span 
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 flex-shrink-0" 
                    title="Verified studio — approved by our team"
                  >
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </span>
                  <span className="text-sm font-medium text-green-800">Verified Studio</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Sticky on Desktop */}
          <div className="lg:col-span-1 w-full">
            <div className="sticky top-8 space-y-6">
              {/* Map Card - Adjust height based on show_directions */}
              <div 
                className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden" 
                style={{ height: profile?.show_directions !== false ? '492px' : '384px' }}
              >
                {/* Map section */}
                <div className="h-[384px]">
                  <SimpleStudioMap
                    latitude={studio.latitude}
                    longitude={studio.longitude}
                    address={studio.address || ''}
                    fullAddress={studio.full_address || ''}
                    useCoordinates={studio.owner?.profile?.use_coordinates_for_map === true}
                    showExactLocation={studio.show_exact_location ?? true}
                    height="384px"
                  />
                </div>
                {/* Directions section - hidden when show_directions is off */}
                {profile?.show_directions !== false && (
                  <>
                    {/* Gap - matches the gap between main image and thumbnails */}
                    <div className="h-4"></div>
                    {/* Directions section - fills remaining space (492 - 384 - 16 = 92px) */}
                    <div className="flex-1 flex flex-col justify-center px-6">
                      {/* Only show address if show_address is not explicitly false */}
                      {(profile?.show_address !== false) && (studio.city || studio.full_address || studio.address) && (
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <p className="text-xs text-gray-600 line-clamp-1">{studio.city || studio.full_address || studio.address}</p>
                        </div>
                      )}
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={handleGetDirections}
                        disabled={!studio.latitude && !studio.longitude && !studio.full_address && !studio.address}
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        Get directions
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Studio Details Card - Compact */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-0">Studio Details</h3>
                
                <div className="space-y-2">
                  {/* Studio Types */}
                  {studio.studio_studio_types && studio.studio_studio_types.length > 0 && (
                    <div className="pb-2 border-b border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        {studio.studio_studio_types.map((type, index) => (
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
                  {(profile?.show_phone !== false) && (profile?.phone || studio.phone) && (
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

                  {/* Website - Only show if email is available OR if button won't show Visit Website */}
                  {studio.website_url && !(studio.website_url && profile?.show_email === false) && (
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
                  ) : studio.website_url && (profile?.show_email === false) ? (
                    <a 
                      href={studio.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button
                        size="sm"
                        className="w-full"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        Visit Website
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
              {profile?.show_rates !== false && rates.length > 0 && (
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

              {/* Connections Card */}
              {(() => {
                // Type-safe access to connection fields with fallback
                const getConnection = (field: string) => {
                  return (profile as any)?.[field] || null;
                };

                const standardConnections = [
                  { id: 'connection1', label: 'Source Connect', value: profile?.connection1 },
                  { id: 'connection2', label: 'Source Connect Now', value: profile?.connection2 },
                  { id: 'connection3', label: 'Phone Patch', value: profile?.connection3 },
                  { id: 'connection4', label: 'Session Link Pro', value: profile?.connection4 },
                  { id: 'connection5', label: 'Zoom or Teams', value: profile?.connection5 },
                  { id: 'connection6', label: 'Cleanfeed', value: profile?.connection6 },
                  { id: 'connection7', label: 'Riverside', value: profile?.connection7 },
                  { id: 'connection8', label: 'Google Hangouts', value: profile?.connection8 },
                  { id: 'connection9', label: 'ipDTL', value: getConnection('connection9') },
                  { id: 'connection10', label: 'SquadCast', value: getConnection('connection10') },
                  { id: 'connection11', label: 'Zencastr', value: getConnection('connection11') },
                  { id: 'connection12', label: 'Other (See profile)', value: getConnection('connection12') },
                ].filter(conn => conn.value === '1');

                // Add custom connections
                const customMethods = ((profile as any)?.custom_connection_methods || []).filter((method: string) => method && method.trim());
                const customConnections = customMethods.map((method: string, index: number) => ({
                  id: `custom_${index}`,
                  label: method,
                }));

                const allConnections = [...standardConnections, ...customConnections];

                return allConnections.length > 0 ? (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-3">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-0">Connections</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {allConnections.map((connection) => (
                        <li key={connection.id} className="text-sm text-gray-700">
                          {connection.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null;
              })()}

              {/* Social Media Links Card */}
              {socialLinks.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-3">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-0">Social Media</h3>
                  <div className="flex flex-wrap gap-2">
                    {socialLinks.map((link, index) => {
                      const Icon = link.icon;
                      return (
                        <a
                          key={index}
                          href={link.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={clsx(
                            'flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors',
                            link.color,
                            'hover:bg-gray-50'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{link.platform}</span>
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

      {/* Image Lightbox Modal */}
      {showLightbox && displayImages.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={displayImages[0]?.image_url || ''}
              alt={displayImages[0]?.alt_text || studio.name}
              className="max-w-full max-h-full object-contain"
            />
            {/* Close hint */}
            <div className="absolute top-4 right-4 text-white text-sm bg-black/50 px-3 py-2 rounded-lg">
              Click anywhere to close
            </div>
          </div>
        </div>
      )}

        {/* Footer - Desktop only */}
        <div className="hidden md:block">
          <Footer />
        </div>
      </div>
    </div>
  );
}

