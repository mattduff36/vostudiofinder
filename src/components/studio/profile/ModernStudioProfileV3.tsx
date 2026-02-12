'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { cleanDescription } from '@/lib/utils/text';
import { SimpleStudioMap } from '@/components/maps/SimpleStudioMap';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { formatRateWithCurrency } from '@/lib/utils/currency';
import { Footer } from '@/components/home/Footer';
import clsx from 'clsx';
import { generateStudioImageAlt } from '@/lib/utils/image-alt';
import { ContactStudioModal } from '@/components/studio/ContactStudioModal';
import { formatStudioTypeLabel } from '@/lib/utils/studio-types';
import { ShareProfileButton } from '@/components/profile/ShareProfileButton';

// Phase 3: Mobile profile components
import { CompactHero } from './mobile/CompactHero';
import { AboutCollapsible } from './mobile/AboutCollapsible';
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
  Video,
  Eye,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { XLogo } from '@/components/icons/XLogo';
import { BlueskyLogo } from '@/components/icons/BlueskyLogo';
import { VimeoLogo } from '@/components/icons/VimeoLogo';

interface ModernStudioProfileV3Props {
  previewMode?: boolean; // If true, show preview banner for owner viewing hidden profile
  isAdminViewer?: boolean; // If true, show admin-only UI affordances
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
    admin_review?: boolean;
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
        x_url?: string | null;
        linkedin_url?: string | null;
        instagram_url?: string | null;
        youtube_url?: string | null;
        soundcloud_url?: string | null;
        tiktok_url?: string | null;
        threads_url?: string | null;
        vimeo_url?: string | null;
        bluesky_url?: string | null;
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
    updated_at: Date | string;
    last_login?: string | null;
    averageRating: number;
    _count: {
      reviews: number;
    };
  };
}

/** Format a date-like value to UK dd/mm/yyyy */
function formatDateUK(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ModernStudioProfileV3({ studio, previewMode = false, isAdminViewer = false }: ModernStudioProfileV3Props) {
  const displayImages = studio.studio_images || [];
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);

  // Keyboard navigation for lightbox
  const handleLightboxKeyDown = useCallback((e: KeyboardEvent) => {
    if (!showLightbox) return;
    if (e.key === 'Escape') setShowLightbox(false);
    if (e.key === 'ArrowLeft') setLightboxIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    if (e.key === 'ArrowRight') setLightboxIndex((prev) => (prev + 1) % displayImages.length);
  }, [showLightbox, displayImages.length]);

  useEffect(() => {
    if (!showLightbox) return undefined;
    window.addEventListener('keydown', handleLightboxKeyDown);
    return () => window.removeEventListener('keydown', handleLightboxKeyDown);
  }, [showLightbox, handleLightboxKeyDown]);

  // Refresh page when visibility is toggled from burger menu (to remove preview banner)
  useEffect(() => {
    const handleVisibilityChange = (event: CustomEvent<{ isVisible: boolean }>) => {
      // Only refresh if profile was made visible (preview mode -> live mode)
      if (previewMode && event.detail.isVisible) {
        window.location.reload();
      }
    };
    
    window.addEventListener('profile-visibility-changed', handleVisibilityChange as EventListener);
    return () => {
      window.removeEventListener('profile-visibility-changed', handleVisibilityChange as EventListener);
    };
  }, [previewMode]);

  // Calculate average rating
  const averageRating = studio.reviews.length > 0
    ? studio.reviews.reduce((sum, review) => sum + review.rating, 0) / studio.reviews.length
    : 0;

  // Studio type formatting is now handled by formatStudioTypeLabel utility

  // Social media links from owner profile
  const profile = studio.owner.profile;
  const socialLinks = [
    { 
      platform: 'LinkedIn', 
      url: profile?.linkedin_url, 
      icon: Linkedin, 
      color: 'text-blue-700 hover:text-blue-900' 
    },
    { 
      platform: 'X (formerly Twitter)', 
      url: profile?.x_url, 
      icon: XLogo, 
      color: 'text-sky-500 hover:text-sky-700' 
    },
    { 
      platform: 'Facebook', 
      url: profile?.facebook_url, 
      icon: Facebook, 
      color: 'text-blue-600 hover:text-blue-800' 
    },
    { 
      platform: 'Instagram', 
      url: profile?.instagram_url, 
      icon: Instagram, 
      color: 'text-pink-600 hover:text-pink-800' 
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
    },
    { 
      platform: 'Vimeo', 
      url: profile?.vimeo_url, 
      icon: VimeoLogo, 
      color: 'text-cyan-600 hover:text-cyan-800' 
    },
    { 
      platform: 'Bluesky', 
      url: profile?.bluesky_url, 
      icon: BlueskyLogo, 
      color: 'text-blue-500 hover:text-blue-700' 
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

  const handleContactClick = () => {
    if (!canContactViaEmail) {
      setShowUnavailableModal(true);
    } else {
      setShowContactModal(true);
    }
  };

  // Directions handling with platform detection
  // Pre-opens the tab synchronously (preserving user gesture for Safari/macOS)
  // then fetches optional geolocation and updates the tab URL.
  const handleGetDirections = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Build a base destination URL synchronously so we can open the tab immediately
    const buildBaseUrl = () => {
      if (studio.latitude && studio.longitude) {
        return `https://www.google.com/maps/dir/?api=1&destination=${studio.latitude},${studio.longitude}`;
      }
      if (studio.full_address || studio.address) {
        const addressToUse = studio.full_address || studio.address || '';
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressToUse)}`;
      }
      return null;
    };

    const baseUrl = buildBaseUrl();
    if (!baseUrl) return;

    if (isMobile) {
      // Mobile: try native app deep-link first, fall back to web
      if (studio.latitude && studio.longitude) {
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isAndroid = /Android/i.test(navigator.userAgent);

        let appUrl = '';
        if (isIOS) {
          appUrl = `comgooglemaps://?daddr=${studio.latitude},${studio.longitude}&directionsmode=driving`;
        } else if (isAndroid) {
          appUrl = `google.navigation:q=${studio.latitude},${studio.longitude}`;
        }

        if (appUrl) {
          window.location.href = appUrl;
          setTimeout(() => { window.location.href = baseUrl; }, 1000);
        } else {
          window.location.href = baseUrl;
        }
      } else {
        window.location.href = baseUrl;
      }
      return;
    }

    // Desktop: open tab synchronously (within user gesture) to avoid Safari popup blocker
    const newTab = window.open(baseUrl, '_blank');

    // Try to upgrade the URL with the user's origin location (optional, async)
    if (newTab && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const origin = `&origin=${position.coords.latitude},${position.coords.longitude}`;
          try {
            newTab.location.href = baseUrl + origin;
          } catch {
            // Cross-origin security may prevent updating; the base URL is already loaded
          }
        },
        () => { /* location denied/unavailable – base URL already loaded */ },
        { timeout: 3000, maximumAge: 300000 }
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Admin-only badge: profile flagged for review */}
      {isAdminViewer && studio.admin_review && (
        <div className="fixed top-20 left-4 md:left-6 z-50">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-800 shadow-sm">
            Admin Review
          </span>
        </div>
      )}
      {/* Preview Mode Banner (owner viewing hidden profile) */}
      {previewMode && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm text-yellow-800">
            <Eye className="w-4 h-4" />
            <span className="font-medium">Preview Mode:</span>
            <span>Only you can see this profile. It's hidden from the public until you make it visible.</span>
          </div>
        </div>
      )}
      
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
          {/* Top Action Buttons - Mobile */}
          <div className="bg-white border-b border-gray-200 md:hidden px-4 py-3 space-y-2">
            {canContactViaEmail ? (
              <button 
                onClick={() => setShowContactModal(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-[#d42027] text-white rounded-lg hover:bg-[#a1181d] transition-colors font-medium"
              >
                <Mail className="w-5 h-5" aria-hidden="true" />
                <span>Message Studio</span>
              </button>
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
          {(profile?.show_phone !== false && (profile?.phone || studio.phone)) && (
            <div className="bg-white border-b border-gray-200 md:hidden px-4 py-4">
              <h3 className="text-sm !text-black !font-bold mb-3">Contact</h3>
              <div className="space-y-2">
                {(profile?.phone || studio.phone) && (
                  <a
                    href={`tel:${profile?.phone || studio.phone}`}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Phone className="w-5 h-5 !text-[#d42027]" aria-hidden="true" />
                    <span className="text-sm text-gray-700">{profile?.phone || studio.phone}</span>
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
              <p className="text-xs !text-black !font-bold mb-3">Rates</p>
              <div className="space-y-2">
                {rates.map((rate, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{rate.duration}</span>
                    <span className="text-sm font-semibold !text-[#d42027]">{rate.price}</span>
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
              { id: 'connection6', value: profile?.connection6, label: 'Cleanfeed' },
              { id: 'connection1', value: profile?.connection1, label: 'Source Connect' },
              { id: 'connection2', value: profile?.connection2, label: 'Source Connect Nexus' },
              { id: 'connection3', value: profile?.connection3, label: 'Phone Patch' },
              { id: 'connection4', value: profile?.connection4, label: 'Session Link Pro' },
              { id: 'connection5', value: profile?.connection5, label: 'Zoom or Teams' },
              { id: 'connection7', value: profile?.connection7, label: 'Riverside' },
              { id: 'connection8', value: profile?.connection8, label: 'Google Hangouts' },
              { id: 'connection9', value: getConnection('connection9'), label: 'ipDTL' },
              { id: 'connection10', value: getConnection('connection10'), label: 'SquadCast' },
              { id: 'connection11', value: getConnection('connection11'), label: 'Zencastr' },
              { id: 'connection12', value: getConnection('connection12'), label: 'DIVA' },
            ].filter(conn => conn.value === '1');

            const customConnections = (profile?.custom_connection_methods || []).map((method, index) => ({
              id: `custom_${index}`,
              label: method,
            }));

            const allConnections = [...standardConnections, ...customConnections];

            return allConnections.length > 0 ? (
              <div className="bg-white border-b border-gray-200 md:hidden px-4 py-4">
                <p className="text-xs !text-black !font-bold mb-3">Connections</p>
                <div className="flex flex-wrap gap-2">
                  {allConnections.map((connection) => (
                    <span
                      key={connection.id}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {connection.label === 'Cleanfeed' ? (
                        <a href="https://cleanfeed.net/" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                          {connection.label}
                        </a>
                      ) : (
                        connection.label
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* Social Media Links */}
          {socialLinks.length > 0 && (
            <div className="bg-white border-b border-gray-200 md:hidden px-4 py-4">
              <p className="text-xs !text-black !font-bold mb-3">Social Media</p>
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

          {/* Last Updated - mobile */}
          {formatDateUK(studio.updated_at) && (
            <div className="bg-white border-b border-gray-200 md:hidden px-4 py-3">
              <div className="text-xs text-gray-400 space-y-0.5">
                <p>Last Updated {formatDateUK(studio.updated_at)}</p>
              </div>
            </div>
          )}
          
          {/* Mobile Map Section */}
          {studio.latitude && studio.longitude && (
            <div className="bg-white border-b border-gray-200 md:hidden">
              <div className="px-4 py-4">
                <p className="text-xs !text-black !font-bold mb-3">Location</p>
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
                    <span className="font-medium">Get Directions</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Share Profile Section - Mobile Bottom */}
          <div className="bg-white border-b border-gray-200 md:hidden px-4 py-4">
            <ShareProfileButton
              profileUrl={typeof window !== 'undefined' ? window.location.href : ''}
              profileName={studio.name}
              {...(studio.city && { region: studio.city })}
              variant="outline"
              size="md"
              className="w-full"
            />
          </div>
        </>

      {/* Main Content - top padding matches sidebar gap (space-y-6) */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 hidden md:block">
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images & Main Content */}
          <div className="lg:col-span-2 w-full">
            {/* Image Gallery - Large Featured + Thumbnails */}
            {displayImages.length > 0 && (
              <div className="mb-2.5 w-full">
                {/* Featured Image */}
                <div 
                  className="relative aspect-[25/12] bg-gray-200 rounded-lg overflow-hidden mb-4 cursor-pointer group"
                  onClick={() => { setLightboxIndex(0); setShowLightbox(true); }}
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
                        onClick={() => { setLightboxIndex(index + 1); setShowLightbox(true); }}
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

            {/* Studio Header - 2-col (avatar | name + region) when avatar exists */}
            <div className="mb-2 w-full">
              <div className={studio.owner.avatar_url ? "grid grid-cols-[auto,1fr] items-start gap-3 min-w-0" : "min-w-0"}>
                {/* Avatar column (slightly lowered for visual alignment) */}
                {studio.owner.avatar_url && (
                  <div className="mt-2">
                    <AvatarUpload
                      currentAvatar={studio.owner.avatar_url}
                      onAvatarChange={() => {}}
                      size="small"
                      editable={false}
                      userName={studio.owner.display_name || studio.owner.username}
                      variant="profile"
                    />
                  </div>
                )}

                {/* Content column (name + region + share aligned to name row) */}
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <h1
                      className="text-3xl !font-bold text-gray-900 flex items-center gap-3 min-w-0"
                      style={{ fontWeight: 700 }}
                    >
                      <span className="min-w-0 truncate">{studio.name}</span>
                      {studio.is_verified && (
                        <span className="group relative inline-flex items-center cursor-default flex-shrink-0">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 transition-all duration-200 group-hover:scale-110">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </span>
                          {/* Hover expand text - desktop only */}
                          <span className="hidden md:inline-flex absolute left-full ml-1 items-center px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none">
                            Verified
                          </span>
                        </span>
                      )}
                    </h1>

                    <ShareProfileButton
                      profileUrl={typeof window !== 'undefined' ? window.location.href : ''}
                      profileName={studio.name}
                      {...(studio.city && { region: studio.city })}
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-900 flex-shrink-0 mt-1"
                    />
                  </div>

                  {/* Region / City - desktop only (mobile shows via CompactHero) */}
                  {studio.city && (
                    <div className="hidden md:flex items-center gap-1.5 mt-1 min-w-0">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-500 truncate">{studio.city}</span>
                    </div>
                  )}

                  {/* Rating and Reviews */}
                  {studio.reviews.length > 0 && (
                    <div className="flex items-center space-x-2 mb-1.5 w-full mt-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={clsx(
                              'w-5 h-5',
                              i < Math.floor(averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300',
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
              </div>
            </div>

            {/* Description and Info Cards - Desktop: separate boxes like right column */}
            {(() => {
              const cleanedAbout = cleanDescription(profile?.about || profile?.short_about || studio.description);
              const cleanedEquipment = profile?.equipment_list ? cleanDescription(profile.equipment_list) : '';
              const cleanedServices = profile?.services_offered ? cleanDescription(profile.services_offered) : '';
              const hasContent = cleanedAbout || cleanedEquipment || cleanedServices;
              
              if (!hasContent) return null;

              return (
                <div className="mb-6 w-full space-y-6">
                  {/* Description Card */}
                  {cleanedAbout && (
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-3 w-full">
                      <h3 className="text-base !text-black !font-bold mb-2 mt-0">Description</h3>
                      <div className="prose prose-gray max-w-none w-full">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line break-words w-full">
                          {cleanedAbout}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Equipment Card - separate box matching right column style */}
                  {cleanedEquipment && (
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-3 w-full">
                      <h3 className="text-base !text-black !font-bold mb-2 mt-0">Equipment</h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line break-words text-sm">
                        {cleanedEquipment}
                      </p>
                    </div>
                  )}

                  {/* Services Offered Card - separate box matching right column style */}
                  {cleanedServices && (
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-3 w-full">
                      <h3 className="text-base !text-black !font-bold mb-2 mt-0">Services Offered</h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line break-words text-sm">
                        {cleanedServices}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Reviews Section */}
            {studio.reviews.length > 0 && (
              <div className="mb-6 w-full">
                <h2 className="text-lg !text-black !font-bold mb-3 w-full">Reviews</h2>
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

            {/* Verified Studio Badge removed - now shown next to name at top */}
          </div>

          {/* Right Sidebar - Sticky on Desktop */}
          <div className="lg:col-span-1 w-full">
            <div className="sticky top-8 space-y-6">
              {/* Map Card - Height adjusts automatically based on content */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
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
                {/* Info section - shown when either address or directions is enabled */}
                {((profile?.show_address !== false && (studio.full_address || studio.address || studio.city)) || profile?.show_directions !== false) && (
                  <div className="flex-1 flex flex-col px-6 py-3">
                    {/* Only show address if show_address is not explicitly false */}
                    {(profile?.show_address !== false) && (studio.full_address || studio.address || studio.city) && (
                      <div className="flex items-start space-x-2 mb-3 flex-1">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-600 leading-relaxed">{studio.full_address || studio.address || studio.city}</p>
                      </div>
                    )}
                    {/* Only show button if show_directions is not explicitly false */}
                    {profile?.show_directions !== false && (
                      <Button
                        size="sm"
                        className="w-full mt-auto"
                        onClick={handleGetDirections}
                        disabled={!studio.latitude && !studio.longitude && !studio.full_address && !studio.address}
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        Get Directions
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Studio Details Card - Compact */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-3">
                <h3 className="text-base !text-black !font-bold mb-2 mt-0">Studio Details</h3>
                
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
                            {formatStudioTypeLabel(type)}
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
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  {canContactViaEmail ? (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setShowContactModal(true)}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Message Studio
                    </Button>
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
                  <h3 className="text-base !text-black !font-bold mb-2 mt-0">Rates</h3>
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
                  { id: 'connection6', label: 'Cleanfeed', value: profile?.connection6 },
                  { id: 'connection1', label: 'Source Connect', value: profile?.connection1 },
                  { id: 'connection2', label: 'Source Connect Nexus', value: profile?.connection2 },
                  { id: 'connection3', label: 'Phone Patch', value: profile?.connection3 },
                  { id: 'connection4', label: 'Session Link Pro', value: profile?.connection4 },
                  { id: 'connection5', label: 'Zoom or Teams', value: profile?.connection5 },
                  { id: 'connection7', label: 'Riverside', value: profile?.connection7 },
                  { id: 'connection8', label: 'Google Hangouts', value: profile?.connection8 },
                  { id: 'connection9', label: 'ipDTL', value: getConnection('connection9') },
                  { id: 'connection10', label: 'SquadCast', value: getConnection('connection10') },
                  { id: 'connection11', label: 'Zencastr', value: getConnection('connection11') },
                  { id: 'connection12', label: 'DIVA', value: getConnection('connection12') },
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
                    <h3 className="text-base !text-black !font-bold mb-2 mt-0">Connections</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {allConnections.map((connection) => (
                        <li key={connection.id} className="text-sm text-gray-700">
                          {connection.label === 'Cleanfeed' ? (
                            <a href="https://cleanfeed.net/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {connection.label}
                            </a>
                          ) : (
                            connection.label
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null;
              })()}

              {/* Social Media Links */}
              {socialLinks.length > 0 && (
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
              )}

              {/* Last Updated */}
              {formatDateUK(studio.updated_at) && (
                <div className="text-xs text-gray-400 space-y-0.5 pt-2">
                  <p>Last Updated {formatDateUK(studio.updated_at)}</p>
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
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
            onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Left arrow */}
          {displayImages.length > 1 && (
            <button
              className="absolute left-4 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length); }}
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={displayImages[lightboxIndex]?.image_url || ''}
              alt={displayImages[lightboxIndex]?.alt_text || studio.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Right arrow */}
          {displayImages.length > 1 && (
            <button
              className="absolute right-4 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev + 1) % displayImages.length); }}
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image counter */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-3 py-1.5 rounded-full">
              {lightboxIndex + 1} / {displayImages.length}
            </div>
          )}
        </div>
      )}

      {/* Contact Studio Modal */}
      <ContactStudioModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        studioName={studio.name}
        studioId={studio.id}
        ownerEmail={studio.owner.email}
      />

        {/* Footer - Desktop only */}
        <div className="hidden md:block">
          <Footer />
        </div>
      </div>
    </div>
  );
}

