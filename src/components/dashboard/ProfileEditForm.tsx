'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Save, Eye, EyeOff, Loader2, User, MapPin, DollarSign, Share2, Wifi, ChevronDown, ChevronUp, Image as ImageIcon, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Toggle } from '@/components/ui/Toggle';
import { Checkbox } from '@/components/ui/Checkbox';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { CountryAutocomplete } from '@/components/ui/CountryAutocomplete';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { AddressPreviewMap } from '@/components/maps/AddressPreviewMap';
import { ProgressIndicators } from '@/components/dashboard/ProgressIndicators';
import { ImageGalleryManager } from '@/components/dashboard/ImageGalleryManager';
import { calculateCompletionStats, type CompletionStats } from '@/lib/utils/profile-completion';
import { getCurrencySymbol } from '@/lib/utils/currency';
import { extractCity } from '@/lib/utils/address';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useAutosizeTextarea } from '@/hooks/useAutosizeTextarea';
import { showSuccess, showError, showInfo } from '@/lib/toast';
import { getBaseUrl } from '@/lib/seo/site';
import { buildProfileMetaTitle } from '@/lib/seo/profile-title';

interface ProfileEditFormProps {
  userId: string;
}

interface ProfileData {
  user: {
    display_name: string;
    username: string;
    email: string;
    avatar_url?: string | null;
  };
  profile: {
    phone?: string;
    about?: string;
    short_about?: string;
    location?: string;
    rate_tier_1?: number;
    rate_tier_2?: number;
    rate_tier_3?: number;
    show_rates: boolean;
    facebook_url?: string;
    x_url?: string; // Renamed from twitter_url
    linkedin_url?: string;
    instagram_url?: string;
    youtube_url?: string;
    tiktok_url?: string; // New field
    threads_url?: string; // New field
    soundcloud_url?: string;
    connection1?: string;
    connection2?: string;
    connection3?: string;
    connection4?: string;
    connection5?: string;
    connection6?: string;
    connection7?: string;
    connection8?: string;
    connection9?: string;
    connection10?: string;
    connection11?: string;
    connection12?: string;
    custom_connection_methods?: string[];
    show_email: boolean;
    show_phone: boolean;
    show_address: boolean;
    show_directions?: boolean;
    studio_name?: string;
    equipment_list?: string;
    services_offered?: string;
  };
  studio?: {
    name: string;
    description?: string;
    address?: string;
    full_address?: string;
    city?: string;
    latitude?: number | null;
    longitude?: number | null;
    show_exact_location?: boolean;
    website_url?: string;
    phone?: string;
    images?: any[];
    is_profile_visible?: boolean;
  };
  studio_types: string[];
  metadata?: {
    custom_meta_title?: string;
  };
}

const STUDIO_TYPES = [
  // Top row - Active types
  { value: 'HOME', label: 'Home', description: 'Personal recording space in a home environment', disabled: false },
  { value: 'RECORDING', label: 'Recording', description: 'Full, professional recording facility', disabled: false },
  { value: 'PODCAST', label: 'Podcast', description: 'Studio specialised for podcast recording', disabled: false },
  // Bottom row - Future types
  { value: 'VOICEOVER', label: 'Voiceover', description: 'Voiceover talent/artist services', disabled: true },
  { value: 'VO_COACH', label: 'VO Coach', description: 'Professional voiceover coaching and training', disabled: false },
  { value: 'AUDIO_PRODUCER', label: 'Audio Producer', description: 'Audio production and post-production services', disabled: false },
];

const CONNECTION_TYPES = [
  { id: 'connection1', label: 'Source Connect' },
  { id: 'connection2', label: 'Source Connect Now' },
  { id: 'connection3', label: 'Phone Patch' },
  { id: 'connection4', label: 'Session Link Pro' },
  { id: 'connection5', label: 'Zoom or Teams' },
  { id: 'connection6', label: 'Cleanfeed' },
  { id: 'connection7', label: 'Riverside' },
  { id: 'connection8', label: 'Google Hangouts' },
  { id: 'connection9', label: 'ipDTL' },
  { id: 'connection10', label: 'SquadCast' },
  { id: 'connection11', label: 'Zencastr' },
  { id: 'connection12', label: 'Other (See profile)' },
];

export function ProfileEditForm({ userId }: ProfileEditFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [activeSection, setActiveSection] = useState('basic');
  const [expandedMobileSection, setExpandedMobileSection] = useState<string | null>(null);
  const [socialMediaErrors, setSocialMediaErrors] = useState<{ [key: string]: string }>({});
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 5 });
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const isBasicTabActive = activeSection === 'basic' || expandedMobileSection === 'basic';
  const isRatesTabActive = activeSection === 'rates' || expandedMobileSection === 'rates';

  const fullAboutRef = useAutosizeTextarea({
    value: profile?.profile?.about || '',
    isEnabled: isBasicTabActive,
  });

  const equipmentListRef = useAutosizeTextarea({
    value: profile?.profile?.equipment_list || '',
    isEnabled: isRatesTabActive,
  });

  const servicesOfferedRef = useAutosizeTextarea({
    value: profile?.profile?.services_offered || '',
    isEnabled: isRatesTabActive,
  });

  // Social media URL validation functions
  const normalizeSocialMediaUrl = (rawUrl: string): string => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';

    // Check if URL has ANY scheme (protocol): word characters followed by ://
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(trimmed);
    
    if (hasScheme) {
      // If it has a scheme, only accept http:// or https://
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }
      // Reject URLs with unsupported schemes (ftp://, file://, mailto:, etc.)
      return '';
    }

    // No scheme detected, prepend https://
    return `https://${trimmed}`;
  };

  const validateSocialMediaUrl = (url: string, platform: string): string => {
    if (!url || url.trim() === '') return '';
    
    try {
      const normalizedUrl = normalizeSocialMediaUrl(url);
      const urlObj = new URL(normalizedUrl);
      const hostname = urlObj.hostname.toLowerCase().replace('www.', '');
      
      const platformPatterns: { [key: string]: string[] } = {
        facebook_url: ['facebook.com', 'm.facebook.com', 'fb.com'],
        x_url: ['x.com', 'twitter.com'],
        youtube_url: ['youtube.com', 'youtu.be', 'm.youtube.com'],
        instagram_url: ['instagram.com'],
        soundcloud_url: ['soundcloud.com'],
        tiktok_url: ['tiktok.com', 'vm.tiktok.com'],
        linkedin_url: ['linkedin.com'],
        threads_url: ['threads.net'],
      };

      const validDomains = platformPatterns[platform];
      if (!validDomains) return '';

      const isValid = validDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
      
      if (!isValid) {
        // Special case for x_url which becomes just 'x' after stripping '_url'
        let platformName = platform.replace('_url', '');
        if (platformName === 'x') {
          platformName = 'X';
        } else {
          platformName = platformName.replace(/_/g, ' ');
        }
        return `Please enter a valid ${platformName} URL`;
      }
      
      return '';
    } catch {
      return 'Please enter a valid URL';
    }
  };

  const handleSocialMediaChange = (field: string, value: string) => {
    updateProfile(field, value);
    const error = validateSocialMediaUrl(value, field);
    setSocialMediaErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  // Fetch profile data
  useEffect(() => {
    fetchProfile();
  }, [userId]);

  // Listen for visibility changes from other components (e.g., Overview page, burger menu)
  useEffect(() => {
    const handleVisibilityChange = (event: CustomEvent<{ isVisible: boolean }>) => {
      setIsProfileVisible(event.detail.isVisible);
    };
    
    window.addEventListener('profile-visibility-changed', handleVisibilityChange as EventListener);
    return () => {
      window.removeEventListener('profile-visibility-changed', handleVisibilityChange as EventListener);
    };
  }, []);

  // Check for sessionStorage to open specific section (e.g., from Settings page)
  useEffect(() => {
    const targetSection = sessionStorage.getItem('openProfileSection');
    if (targetSection) {
      setActiveSection(targetSection);
      sessionStorage.removeItem('openProfileSection'); // Clean up after use
    }
  }, []);

  // Scroll to expanded card on mobile
  useEffect(() => {
    if (expandedMobileSection && sectionRefs.current[expandedMobileSection]) {
      // Wait for DOM to update (card expansion animation)
      setTimeout(() => {
        const card = sectionRefs.current[expandedMobileSection];
        if (card) {
          const navbarHeight = 64; // pt-16 = 64px
          const extraSpacing = 16; // Additional spacing below navbar
          const cardTop = card.getBoundingClientRect().top + window.scrollY;
          const scrollTo = cardTop - navbarHeight - extraSpacing;
          
          window.scrollTo({
            top: scrollTo,
            behavior: 'smooth'
          });
        }
      }, 100); // Small delay to ensure expansion has started
    }
  }, [expandedMobileSection]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const data = await response.json();
      const profileData = {
        user: data.data.user,
        profile: data.data.profile || {},
        studio: data.data.studio,
        studio_types: data.data.studio?.studio_types || [],
        metadata: {
          custom_meta_title: data.data.metadata?.custom_meta_title || '',
        },
      };
      setProfile(profileData);
      setOriginalProfile(JSON.parse(JSON.stringify(profileData))); // Deep clone
      
      // Set initial visibility state
      if (profileData.studio) {
        setIsProfileVisible(profileData.studio.is_profile_visible !== false);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load profile', true);
    } finally {
      setLoading(false);
    }
  };

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (!profile || !originalProfile) return false;
    return JSON.stringify(profile) !== JSON.stringify(originalProfile);
  }, [profile, originalProfile]);

  // Calculate completion stats for progress indicators
  const completionStats: CompletionStats = useMemo(() => {
    if (!profile) {
      return {
        required: { completed: 0, total: 11 },
        overall: { percentage: 0 },
      };
    }

    return calculateCompletionStats({
      user: {
        username: profile.user.username,
        display_name: profile.user.display_name,
        avatar_url: profile.user.avatar_url || null,
        email: profile.user.email,
      },
      profile: profile.profile,
      studio: {
        name: profile.studio?.name || null,
        studio_types: profile.studio_types,
        images: profile.studio?.images || [], // Get actual images from studio
        website_url: profile.studio?.website_url || null, // FIX: Add website_url
      },
    });
  }, [profile]);

  // Calculate per-section completion status for mobile accordion icons
  const sectionStatusById = useMemo(() => {
    if (!profile) {
      return {
        basic: 'incomplete',
        contact: 'incomplete',
        connections: 'incomplete',
        rates: 'incomplete',
        social: 'incomplete',
        images: 'incomplete',
        privacy: 'neutral',
        advanced: 'neutral',
      };
    }

    // Basic section: username, display_name, email, studio.name, studio_types>=1, short_about, about
    const isBasicComplete = !!(
      profile.user.username &&
      !profile.user.username.startsWith('temp_') &&
      profile.user.display_name?.trim() &&
      profile.user.email?.trim() &&
      profile.studio?.name?.trim() &&
      (profile.studio_types?.length || 0) >= 1 &&
      profile.profile.short_about?.trim() &&
      profile.profile.about?.trim()
    );

    // Contact section: location, website_url
    const isContactComplete = !!(
      profile.profile.location?.trim() &&
      profile.studio?.website_url?.trim()
    );

    // Connections section: at least one connection1-12 === '1'
    const isConnectionsComplete = !!(
      profile.profile.connection1 === '1' ||
      profile.profile.connection2 === '1' ||
      profile.profile.connection3 === '1' ||
      profile.profile.connection4 === '1' ||
      profile.profile.connection5 === '1' ||
      profile.profile.connection6 === '1' ||
      profile.profile.connection7 === '1' ||
      profile.profile.connection8 === '1' ||
      profile.profile.connection9 === '1' ||
      profile.profile.connection10 === '1' ||
      profile.profile.connection11 === '1' ||
      profile.profile.connection12 === '1'
    );

    // Rates section: rate_tier_1 > 0
    const isRatesComplete = !!(
      profile.profile.rate_tier_1 &&
      (typeof profile.profile.rate_tier_1 === 'number'
        ? profile.profile.rate_tier_1 > 0
        : parseFloat(profile.profile.rate_tier_1 as any) > 0)
    );

    // Social section: at least 2 social links
    const socialLinks = [
      profile.profile.facebook_url,
      profile.profile.x_url,
      profile.profile.youtube_url,
      profile.profile.instagram_url,
      profile.profile.soundcloud_url,
      profile.profile.tiktok_url,
      profile.profile.linkedin_url,
      profile.profile.threads_url,
    ].filter((url) => url && url.trim() !== '');
    const isSocialComplete = socialLinks.length >= 2;

    // Images section: at least 1 image
    const isImagesComplete = !!(
      profile.studio?.images && profile.studio.images.length >= 1
    );

    return {
      basic: isBasicComplete ? 'complete' : 'incomplete',
      contact: isContactComplete ? 'complete' : 'incomplete',
      connections: isConnectionsComplete ? 'complete' : 'incomplete',
      rates: isRatesComplete ? 'complete' : 'incomplete',
      social: isSocialComplete ? 'complete' : 'incomplete',
      images: isImagesComplete ? 'complete' : 'incomplete',
      privacy: 'neutral',
      advanced: 'neutral',
    };
  }, [profile]);

  const handleSave = async () => {
    try {
      // Validate all social media URLs before saving
      const socialMediaFields = [
        'facebook_url', 'x_url', 'youtube_url', 'instagram_url',
        'soundcloud_url', 'tiktok_url', 'linkedin_url', 'threads_url'
      ];
      
      const errors: { [key: string]: string } = {};
      socialMediaFields.forEach(field => {
        const url = profile?.profile[field as keyof typeof profile.profile] as string;
        if (url) {
          const error = validateSocialMediaUrl(url, field);
          if (error) {
            errors[field] = error;
          }
        }
      });

      if (Object.keys(errors).length > 0) {
        setSocialMediaErrors(errors);
        showError('Please fix the invalid social media URLs before saving');
        return;
      }

      setSaving(true);

      // Normalize social URLs for storage (standardize to https://...).
      const profileToSave = {
        user: profile!.user,
        profile: {
          ...profile!.profile!,
          facebook_url: normalizeSocialMediaUrl(profile!.profile!.facebook_url || ''),
          x_url: normalizeSocialMediaUrl(profile!.profile!.x_url || ''),
          youtube_url: normalizeSocialMediaUrl(profile!.profile!.youtube_url || ''),
          instagram_url: normalizeSocialMediaUrl(profile!.profile!.instagram_url || ''),
          soundcloud_url: normalizeSocialMediaUrl(profile!.profile!.soundcloud_url || ''),
          tiktok_url: normalizeSocialMediaUrl(profile!.profile!.tiktok_url || ''),
          linkedin_url: normalizeSocialMediaUrl(profile!.profile!.linkedin_url || ''),
          threads_url: normalizeSocialMediaUrl(profile!.profile!.threads_url || ''),
        },
        studio: profile!.studio,
        studio_types: profile!.studio_types,
        metadata: profile!.metadata,
      };

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileToSave),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }

      const result = await response.json().catch(() => ({} as any));
      showSuccess('Profile updated successfully!');
      sessionStorage.setItem('invalidateProfileCache', '1');

      if ((result as any)?.visibilityAutoDisabled) {
        showInfo('Profile visibility was turned off because required fields are incomplete.');
      }
      
      // Refresh profile data
      await fetchProfile();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleVisibilityToggle = async (visible: boolean) => {
    setVisibilitySaving(true);
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

      const result = await response.json();

      if (response.ok) {
        setIsProfileVisible(visible);
        // Update the profile state to reflect the change
        setProfile(prev => prev ? {
          ...prev,
          studio: { ...prev.studio, is_profile_visible: visible } as any,
        } : null);
        // Also update originalProfile to prevent false "unsaved changes" detection
        setOriginalProfile(prev => prev ? {
          ...prev,
          studio: { ...prev.studio, is_profile_visible: visible } as any,
        } : null);
        // Broadcast visibility change to other components
        window.dispatchEvent(new CustomEvent('profile-visibility-changed', { 
          detail: { isVisible: visible } 
        }));
      } else {
        showError(result.error || 'Failed to update profile visibility');
        // Revert on error
        setIsProfileVisible(!visible);
      }
    } catch (err) {
      showError('Error updating profile visibility');
      // Revert on error
      setIsProfileVisible(!visible);
    } finally {
      setVisibilitySaving(false);
    }
  };

  const updateUser = useCallback((field: string, value: any) => {
    setProfile(prev => prev ? {
      ...prev,
      user: { ...prev.user, [field]: value },
    } : null);
  }, []);

  const updateProfile = useCallback((field: string, value: any) => {
    setProfile(prev => prev ? {
      ...prev,
      profile: { ...prev.profile, [field]: value },
    } : null);
  }, []);

  const updateStudio = useCallback((field: string, value: any) => {
    setProfile(prev => prev ? {
      ...prev,
      studio: { ...prev.studio, [field]: value } as any,
    } : null);
  }, []);

  const handleCoordinatesChange = useCallback((lat: number, lng: number) => {
    updateStudio('latitude', lat);
    updateStudio('longitude', lng);
  }, [updateStudio]);

  const toggleStudioType = useCallback((type: string) => {
    setProfile(prev => {
      if (!prev) return null;
      const types = prev.studio_types || [];
      const newTypes = types.includes(type)
        ? types.filter(t => t !== type)
        : [...types, type];
      return { ...prev, studio_types: newTypes };
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load profile. Please try refreshing the page.
      </div>
    );
  }

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: User, description: 'Display name, username, studio info' },
    { id: 'contact', label: 'Contact & Location', icon: MapPin, description: 'Phone, email, address details' },
    { id: 'rates', label: 'Rates & Pricing', icon: DollarSign, description: 'Pricing and rate tiers' },
    { id: 'social', label: 'Social Media', icon: Share2, description: 'Social media profiles' },
    { id: 'connections', label: 'Connections', icon: Wifi, description: 'Remote session connections' },
    { id: 'images', label: 'Images', icon: ImageIcon, description: 'Studio photos and gallery' },
    { id: 'privacy', label: 'Privacy Settings', icon: Eye, description: 'Display preferences' },
    { id: 'advanced', label: 'Advanced Settings', icon: Settings, description: 'SEO and advanced options' },
  ];

  const handleMobileSectionClick = (sectionId: string) => {
    if (expandedMobileSection === sectionId) {
      setExpandedMobileSection(null);
    } else {
      setExpandedMobileSection(sectionId);
      setActiveSection(sectionId);
    }
  };

  // Render content for a specific section
  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'basic':
        return (
          <div className="space-y-6">
            {/* Username field - Hidden from view but retained in data */}
            <input 
              type="hidden" 
              value={profile.user.username || ''} 
            />
            
            {/* Row 1: Display Name + Studio Name (1:1 ratio) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Display Name"
                value={profile.user.display_name || ''}
                onChange={(e) => updateUser('display_name', e.target.value)}
                helperText="Your dashboard display name"
                required
              />
              <div>
                <Input
                  label="Studio Name"
                  value={profile.studio?.name || ''}
                  onChange={(e) => updateStudio('name', e.target.value)}
                  maxLength={35}
                />
                <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                  <span>Your studio or business name</span>
                  <span>{(profile.studio?.name || '').length}/35 characters</span>
                </div>
              </div>
            </div>
            
            {/* Row 2: Studio Type + Website URL (1:1 ratio) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Studio Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Studio Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {STUDIO_TYPES.map((type) => (
                    <div key={type.value} className="relative group">
                      <Checkbox
                        label={type.label}
                        checked={profile.studio_types.includes(type.value)}
                        onChange={() => toggleStudioType(type.value)}
                        disabled={type.disabled}
                      />
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none">
                        {type.disabled ? 'Coming soon!' : type.description}
                        <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Website URL */}
              <div>
                <Input
                  label="Website URL"
                  type="url"
                  value={profile.studio?.website_url || ''}
                  onChange={(e) => updateStudio('website_url', e.target.value)}
                  helperText="Your studio or personal website"
                  placeholder="https://yourstudio.com"
                />
              </div>
            </div>

            {/* Row 3: Short About (single line input, full width) */}
            <div>
              <Input
                label="Short About"
                value={profile.profile.short_about || ''}
                onChange={(e) => updateProfile('short_about', e.target.value)}
                maxLength={150}
              />
              <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                <span>Shown on studio cards and used by search engines. Make the most of the 150 characters</span>
                <span>{(profile.profile.short_about || '').length}/150 characters</span>
              </div>
            </div>

            {/* Row 4: Full About (textarea, full width) */}
            <div>
              <Textarea
                ref={fullAboutRef}
                label="Full About"
                value={profile.profile.about || ''}
                onChange={(e) => updateProfile('about', e.target.value)}
                maxLength={1500}
                rows={6}
                className="min-h-[150px] resize-none overflow-hidden"
              />
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="text-gray-500">Detailed description for your profile page</span>
                <span 
                  className={`${
                    (profile.profile.about || '').length >= 1400 
                      ? 'text-red-600 font-semibold' 
                      : (profile.profile.about || '').length >= 1300 
                      ? 'text-orange-600 font-medium' 
                      : 'text-gray-500'
                  }`}
                >
                  {(profile.profile.about || '').length}/1500 characters
                </span>
              </div>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={profile.user.email || ''}
                disabled
                helperText="Contact admin to change email address"
              />
              <Input
                label="Phone"
                type="tel"
                value={profile.profile.phone || ''}
                onChange={(e) => updateProfile('phone', e.target.value)}
                helperText="Your contact phone number"
                placeholder="+44 20 1234 5678"
              />
            </div>

            {/* Two-column layout for desktop, stacked for mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:items-stretch">
              {/* Left column: Address fields */}
              <div className="space-y-4">
                <div>
                  <AddressAutocomplete
                    label="Address"
                    value={profile.studio?.full_address || ''}
                    onChange={(value) => {
                      updateStudio('full_address', value);
                      updateStudio('city', extractCity(value));
                    }}
                    onPlaceSelected={(place) => {
                      // Extract country from address components
                      if (place.address_components) {
                        const countryComponent = place.address_components.find(
                          (component: any) => component.types.includes('country')
                        );
                        if (countryComponent) {
                          updateProfile('location', countryComponent.long_name);
                        }
                      }
                    }}
                    placeholder="Start typing your address..."
                  />
                  
                  {/* Location privacy toggle */}
                  <div className="flex items-center justify-between pt-3 pb-2">
                    <div className="flex-1 mr-4">
                      <label className="text-sm font-medium text-gray-700 cursor-pointer flex items-center" htmlFor="show-exact-location">
                        Show exact location
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        {profile.studio?.show_exact_location ?? true 
                          ? 'Public visitors will see a precise pin on your map. Turn off to show an approximate 150m area instead (ideal for home studios).'
                          : 'Public visitors will see an approximate 150m area instead of a precise pin. This helps protect your privacy while still showing your general location.'
                        }
                      </p>
                    </div>
                    <Toggle
                      checked={profile.studio?.show_exact_location ?? true}
                      onChange={(checked) => updateStudio('show_exact_location', checked)}
                    />
                  </div>
                </div>

                <Input
                  label="Region (Town / City)"
                  type="text"
                  value={profile.studio?.city || ''}
                  onChange={(e) => updateStudio('city', e.target.value)}
                  placeholder="Enter town or city name..."
                  helperText="Your region is shown on the studios cards."
                />

                <CountryAutocomplete
                  label="Country"
                  value={profile.profile.location || ''}
                  onChange={(value) => updateProfile('location', value)}
                  placeholder="e.g. United Kingdom"
                  helperText="Your primary country of operation"
                />
              </div>

              {/* Right column: Map preview (desktop), below fields (mobile) */}
              <div className="flex flex-col h-full">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex-shrink-0">
                  Map Preview
                </label>
                <AddressPreviewMap
                  address={profile.studio?.full_address || ''}
                  initialLat={profile.studio?.latitude ?? null}
                  initialLng={profile.studio?.longitude ?? null}
                  showExactLocation={profile.studio?.show_exact_location ?? true}
                  onCoordinatesChange={handleCoordinatesChange}
                  className="flex-1 min-h-0 max-h-full"
                />
              </div>
            </div>
          </div>
        );

      case 'rates':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Set up to three rate tiers for your services
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  label={`15 minutes (${getCurrencySymbol(profile.profile.location)})`}
                  type="number"
                  step="0.01"
                  value={profile.profile.rate_tier_1 || ''}
                  onChange={(e) => updateProfile('rate_tier_1', parseFloat(e.target.value) || null)}
                  helperText="15 minute session rate"
                  placeholder="0.00"
                />
                <Input
                  label={`30 minutes (${getCurrencySymbol(profile.profile.location)})`}
                  type="number"
                  step="0.01"
                  value={profile.profile.rate_tier_2 || ''}
                  onChange={(e) => updateProfile('rate_tier_2', parseFloat(e.target.value) || null)}
                  helperText="30 minute session rate"
                  placeholder="0.00"
                />
                <Input
                  label={`60 minutes (${getCurrencySymbol(profile.profile.location)})`}
                  type="number"
                  step="0.01"
                  value={profile.profile.rate_tier_3 || ''}
                  onChange={(e) => updateProfile('rate_tier_3', parseFloat(e.target.value) || null)}
                  helperText="60 minute session rate"
                  placeholder="0.00"
                />
                <div className="flex items-start pt-6">
                  <Toggle
                    label="Show Rates on Profile"
                    description="Display your pricing information publicly"
                    checked={profile.profile.show_rates || false}
                    onChange={(checked) => updateProfile('show_rates', checked)}
                  />
                </div>
              </div>
            </div>

            <Textarea
              ref={equipmentListRef}
              label="Equipment List"
              value={profile.profile.equipment_list || ''}
              onChange={(e) => updateProfile('equipment_list', e.target.value)}
              rows={4}
              helperText="List your microphones, interfaces, and other equipment"
              placeholder="e.g., Neumann U87, Universal Audio Apollo, etc."
              className="min-h-[120px] resize-none overflow-hidden"
            />

            <Textarea
              ref={servicesOfferedRef}
              label="Services Offered"
              value={profile.profile.services_offered || ''}
              onChange={(e) => updateProfile('services_offered', e.target.value)}
              rows={4}
              helperText="Describe the services you provide"
              placeholder="e.g., Voice recording, audio editing, mixing, mastering..."
              className="min-h-[120px] resize-none overflow-hidden"
            />
          </div>
        );

      case 'social':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Add links to your social media profiles
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Facebook"
                type="url"
                value={profile.profile.facebook_url || ''}
                onChange={(e) => handleSocialMediaChange('facebook_url', e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeSocialMediaUrl(e.target.value);
                  if (normalized && normalized !== e.target.value) {
                    updateProfile('facebook_url', normalized);
                  }
                  const error = validateSocialMediaUrl(normalized || e.target.value, 'facebook_url');
                  setSocialMediaErrors(prev => ({ ...prev, facebook_url: error }));
                }}
                placeholder="facebook.com/your-page"
                helperText="Your Facebook page or profile"
                {...(socialMediaErrors.facebook_url && { error: socialMediaErrors.facebook_url })}
              />
              <Input
                label="X (formerly Twitter)"
                type="url"
                value={profile.profile.x_url || ''}
                onChange={(e) => handleSocialMediaChange('x_url', e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeSocialMediaUrl(e.target.value);
                  if (normalized && normalized !== e.target.value) {
                    updateProfile('x_url', normalized);
                  }
                  const error = validateSocialMediaUrl(normalized || e.target.value, 'x_url');
                  setSocialMediaErrors(prev => ({ ...prev, x_url: error }));
                }}
                placeholder="x.com/yourhandle"
                helperText="Your X (Twitter) profile"
                {...(socialMediaErrors.x_url && { error: socialMediaErrors.x_url })}
              />
              <Input
                label="YouTube"
                type="url"
                value={profile.profile.youtube_url || ''}
                onChange={(e) => handleSocialMediaChange('youtube_url', e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeSocialMediaUrl(e.target.value);
                  if (normalized && normalized !== e.target.value) {
                    updateProfile('youtube_url', normalized);
                  }
                  const error = validateSocialMediaUrl(normalized || e.target.value, 'youtube_url');
                  setSocialMediaErrors(prev => ({ ...prev, youtube_url: error }));
                }}
                placeholder="youtube.com/@yourchannel"
                helperText="Your YouTube channel"
                {...(socialMediaErrors.youtube_url && { error: socialMediaErrors.youtube_url })}
              />
              <Input
                label="Instagram"
                type="url"
                value={profile.profile.instagram_url || ''}
                onChange={(e) => handleSocialMediaChange('instagram_url', e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeSocialMediaUrl(e.target.value);
                  if (normalized && normalized !== e.target.value) {
                    updateProfile('instagram_url', normalized);
                  }
                  const error = validateSocialMediaUrl(normalized || e.target.value, 'instagram_url');
                  setSocialMediaErrors(prev => ({ ...prev, instagram_url: error }));
                }}
                placeholder="instagram.com/yourhandle"
                helperText="Your Instagram profile"
                {...(socialMediaErrors.instagram_url && { error: socialMediaErrors.instagram_url })}
              />
              <Input
                label="SoundCloud"
                type="url"
                value={profile.profile.soundcloud_url || ''}
                onChange={(e) => handleSocialMediaChange('soundcloud_url', e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeSocialMediaUrl(e.target.value);
                  if (normalized && normalized !== e.target.value) {
                    updateProfile('soundcloud_url', normalized);
                  }
                  const error = validateSocialMediaUrl(normalized || e.target.value, 'soundcloud_url');
                  setSocialMediaErrors(prev => ({ ...prev, soundcloud_url: error }));
                }}
                placeholder="soundcloud.com/yourprofile"
                helperText="Your SoundCloud profile"
                {...(socialMediaErrors.soundcloud_url && { error: socialMediaErrors.soundcloud_url })}
              />
              <Input
                label="TikTok"
                type="url"
                value={profile.profile.tiktok_url || ''}
                onChange={(e) => handleSocialMediaChange('tiktok_url', e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeSocialMediaUrl(e.target.value);
                  if (normalized && normalized !== e.target.value) {
                    updateProfile('tiktok_url', normalized);
                  }
                  const error = validateSocialMediaUrl(normalized || e.target.value, 'tiktok_url');
                  setSocialMediaErrors(prev => ({ ...prev, tiktok_url: error }));
                }}
                placeholder="tiktok.com/@yourhandle"
                helperText="Your TikTok profile"
                {...(socialMediaErrors.tiktok_url && { error: socialMediaErrors.tiktok_url })}
              />
              <Input
                label="LinkedIn"
                type="url"
                value={profile.profile.linkedin_url || ''}
                onChange={(e) => handleSocialMediaChange('linkedin_url', e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeSocialMediaUrl(e.target.value);
                  if (normalized && normalized !== e.target.value) {
                    updateProfile('linkedin_url', normalized);
                  }
                  const error = validateSocialMediaUrl(normalized || e.target.value, 'linkedin_url');
                  setSocialMediaErrors(prev => ({ ...prev, linkedin_url: error }));
                }}
                placeholder="linkedin.com/in/yourprofile"
                helperText="Your LinkedIn profile"
                {...(socialMediaErrors.linkedin_url && { error: socialMediaErrors.linkedin_url })}
              />
              <Input
                label="Threads"
                type="url"
                value={profile.profile.threads_url || ''}
                onChange={(e) => handleSocialMediaChange('threads_url', e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeSocialMediaUrl(e.target.value);
                  if (normalized && normalized !== e.target.value) {
                    updateProfile('threads_url', normalized);
                  }
                  const error = validateSocialMediaUrl(normalized || e.target.value, 'threads_url');
                  setSocialMediaErrors(prev => ({ ...prev, threads_url: error }));
                }}
                placeholder="threads.net/@yourhandle"
                helperText="Your Threads profile"
                {...(socialMediaErrors.threads_url && { error: socialMediaErrors.threads_url })}
              />
            </div>
          </div>
        );

      case 'connections':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Select the connections you support for remote sessions.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CONNECTION_TYPES.map((connection) => (
                  <label
                    key={connection.id}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={profile.profile[connection.id as keyof typeof profile.profile] === '1'}
                      onChange={(e) => updateProfile(connection.id, e.target.checked ? '1' : '0')}
                      className="mr-3 h-4 w-4 text-red-600 accent-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {connection.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Connections */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Connection Methods</h3>
              <p className="text-sm text-gray-600 mb-4">
                Add your own custom connection methods (max 2). These will appear in your profile alongside the standard connections.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Custom Method 1"
                    value={(profile.profile.custom_connection_methods || [])[0] || ''}
                    onChange={(e) => {
                      const methods = Array.isArray(profile.profile.custom_connection_methods) 
                        ? [...profile.profile.custom_connection_methods] 
                        : [];
                      methods[0] = e.target.value;
                      const filtered = methods.filter((m, i) => m || i === 0 || i === 1).slice(0, 2);
                      updateProfile('custom_connection_methods', filtered.length > 0 && filtered.some(m => m) ? filtered : []);
                    }}
                    placeholder="e.g., Discord, WhatsApp, Slack"
                    maxLength={50}
                  />
                  <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                    <span>Connection method name</span>
                    <span>{((profile.profile.custom_connection_methods || [])[0] || '').length}/50</span>
                  </div>
                </div>

                <div>
                  <Input
                    label="Custom Method 2"
                    value={(profile.profile.custom_connection_methods || [])[1] || ''}
                    onChange={(e) => {
                      const methods = Array.isArray(profile.profile.custom_connection_methods) 
                        ? [...profile.profile.custom_connection_methods] 
                        : [];
                      methods[1] = e.target.value;
                      const filtered = methods.filter((m, i) => m || i === 0 || i === 1).slice(0, 2);
                      updateProfile('custom_connection_methods', filtered.length > 0 && filtered.some(m => m) ? filtered : []);
                    }}
                    placeholder="e.g., Discord, WhatsApp, Slack"
                    maxLength={50}
                  />
                  <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                    <span>Connection method name</span>
                    <span>{((profile.profile.custom_connection_methods || [])[1] || '').length}/50</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'images':
        return (
          <div>
            <ImageGalleryManager 
              embedded={true}
              onImagesChanged={fetchProfile}
            />
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Control what information is shown on your public profile
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="space-y-3">
                <Toggle
                  label="Show Email"
                  description="Display 'Message Studio' button on public profile"
                  checked={profile.profile.show_email || false}
                  onChange={(checked) => updateProfile('show_email', checked)}
                />
                <Toggle
                  label="Show Phone"
                  description="Display phone number on public profile"
                  checked={profile.profile.show_phone || false}
                  onChange={(checked) => updateProfile('show_phone', checked)}
                />
                <Toggle
                  label="Show Address"
                  description="Display address on public profile page"
                  checked={profile.profile.show_address || false}
                  onChange={(checked) => updateProfile('show_address', checked)}
                />
                <Toggle
                  label="Show Directions"
                  description="Display 'Get Directions' button on public profile"
                  checked={profile.profile.show_directions !== false}
                  onChange={(checked) => updateProfile('show_directions', checked)}
                />
              </div>
            </div>
          </div>
        );

      case 'advanced':
        return (
          <div className="space-y-6">
            {/* Under Construction Notice - Subtle */}
            <p className="text-xs text-gray-400 italic">
              This section is under development. Some features may not work as expected.
            </p>

            <div>
              <p className="text-sm text-gray-600 mb-4">
                Customize how your studio appears in search engine results and social media shares.
              </p>
            </div>

            {/* Recommended Title Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Recommended Title</h4>
              <p className="text-sm text-gray-900 mb-1">
                {(() => {
                  const studioName = profile.studio?.name || 'Your Studio';
                  const city = profile.studio?.city || null;
                  const studioTypes = profile.studio_types || [];
                  
                  const primaryTypePriority = ['RECORDING', 'HOME', 'PODCAST', 'VO_COACH', 'AUDIO_PRODUCER', 'VOICEOVER'];
                  const primaryStudioType =
                    primaryTypePriority.find((p) => studioTypes.includes(p)) ||
                    studioTypes[0] ||
                    null;

                  return buildProfileMetaTitle({
                    studioName,
                    primaryStudioType,
                    city,
                  });
                })()}
              </p>
              <p className="text-xs text-gray-500">
                Auto-generated from your studio name, type, and location.
              </p>
            </div>

            {/* Custom Title Input */}
            <div>
              <Input
                label="Custom Meta Title (Optional)"
                value={profile.metadata?.custom_meta_title || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setProfile(prev => prev ? {
                    ...prev,
                    metadata: { ...prev.metadata, custom_meta_title: value },
                  } : null);
                }}
                maxLength={60}
                placeholder="Leave empty to use the recommended title"
                helperText="Override the automatic title with your own (max 60 characters)"
              />
              <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                <span>
                  {profile.metadata?.custom_meta_title && profile.metadata.custom_meta_title.trim() 
                    ? 'Custom title will be used' 
                    : 'Using recommended title'}
                </span>
                <span className={
                  (profile.metadata?.custom_meta_title?.length || 0) > 60 
                    ? 'text-red-600 font-semibold' 
                    : (profile.metadata?.custom_meta_title?.length || 0) >= 50 
                    ? 'text-amber-600 font-semibold'
                    : ''
                }>
                  {profile.metadata?.custom_meta_title?.length || 0}/60 characters
                </span>
              </div>
              
              {/* Preview of what will be used */}
              {profile.metadata?.custom_meta_title && profile.metadata.custom_meta_title.trim() && (
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Preview:</p>
                  <p className="text-sm text-gray-900">{profile.metadata.custom_meta_title}</p>
                </div>
              )}
            </div>

            {/* Best Practices */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Best Practices</h4>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>Keep it between 50-60 characters for best display</li>
                <li>Include your studio name and primary service</li>
                <li>Add your location if space permits</li>
                <li>Make it natural and readable for humans</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Desktop Container - Enhanced with animations and backdrop blur - Fixed height with internal scroll */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="bg-white/95 backdrop-blur-md rounded-2xl border border-gray-100 hidden md:flex flex-col overflow-hidden"
        style={{
          boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 25px 50px -12px rgb(0 0 0 / 0.25)',
          maxHeight: 'calc(100vh - 8rem)' // Leave space for padding
        }}
      >
        {/* Sticky Header + Tabs Container */}
        <div className="flex-shrink-0 bg-white/95 backdrop-blur-md rounded-t-2xl">
          {/* Desktop Header with Progress Indicators */}
          <div className="flex border-b border-gray-100 px-6 py-5 items-center justify-between gap-6">
            <div className="flex items-center gap-4 flex-1">
              {/* Avatar */}
              <AvatarUpload
                currentAvatar={profile.user.avatar_url}
                onAvatarChange={(url) => updateUser('avatar_url', url)}
                size="medium"
                editable={true}
                userName={profile.user.display_name || profile.user.username}
                variant="user"
              />
              
              {/* Title and profile URL */}
              <div className="flex-1 flex flex-col">
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Edit Profile</h2>
                
                {/* Profile URL - Clickable link */}
                <div className="flex items-center mt-1">
                  <a
                    href={`${getBaseUrl()}/${profile.user.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {getBaseUrl()}/<span className="text-[#d42027] font-medium">{profile.user.username}</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Right Side - Profile Visibility and Required Progress */}
            <div className="flex items-center gap-6">
              {/* Profile Visibility Toggle */}
              <div 
                className="flex items-center gap-3 pl-6 border-l border-gray-100"
                title={completionStats.required.completed !== completionStats.required.total ? 'Complete all required profile fields before making your profile visible' : ''}
              >
                <div className="flex items-center space-x-3">
                  {completionStats.required.completed !== completionStats.required.total ? (
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <EyeOff className="w-5 h-5 text-gray-600" />
                    </div>
                  ) : isProfileVisible ? (
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Eye className="w-5 h-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <EyeOff className="w-5 h-5 text-red-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Profile Visibility</h3>
                  </div>
                </div>
                <div className="relative">
                  <Toggle
                    checked={isProfileVisible}
                    onChange={handleVisibilityToggle}
                    disabled={visibilitySaving || completionStats.required.completed !== completionStats.required.total}
                  />
                </div>
              </div>

              {/* Required Fields Progress */}
              <div className="pl-6 border-l border-gray-100">
                <ProgressIndicators
                  requiredFieldsCompleted={completionStats.required.completed}
                  totalRequiredFields={completionStats.required.total}
                  overallCompletionPercentage={completionStats.overall.percentage}
                  variant="requiredOnly"
                />
              </div>
            </div>
          </div>

          {/* Desktop Section Navigation with hover animations */}
          <div className="border-b border-gray-100 px-6 py-1 overflow-hidden">
            <nav className="flex space-x-4" aria-label="Profile sections">
              {sections.map((section) => (
                <motion.button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  data-section={section.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeSection === section.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {section.label}
                </motion.button>
              ))}
            </nav>
          </div>
        </div>

        {/* Desktop Content - Scrollable area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
          <div className="w-full max-w-5xl mx-auto">
            {renderSectionContent(activeSection)}
          </div>
        </div>

        {/* Desktop Footer Actions - Fixed at bottom */}
        <div className="flex-shrink-0 flex border-t border-gray-100 px-6 py-4 bg-gradient-to-r from-gray-50 to-white items-center justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </motion.div>

      {/* Mobile Accordion Sections */}
      <div className="md:hidden space-y-3">
        {/* Progress Indicators - Mobile */}
        <div className="mb-2 pb-2">
          <div className="flex justify-center">
            <ProgressIndicators
              requiredFieldsCompleted={completionStats.required.completed}
              totalRequiredFields={completionStats.required.total}
              overallCompletionPercentage={completionStats.overall.percentage}
              variant="minimal"
            />
          </div>
        </div>

        {sections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedMobileSection === section.id;
            const status = sectionStatusById[section.id as keyof typeof sectionStatusById];

            // Determine icon colors based on completion status
            const iconBgClass = 
              status === 'complete' ? 'bg-green-50' :
              status === 'neutral' ? 'bg-gray-50' :
              'bg-red-50';
            
            const iconColorClass = 
              status === 'complete' ? 'text-green-600' :
              status === 'neutral' ? 'text-gray-500' :
              'text-[#d42027]';

            return (
              <div
                key={section.id}
                ref={(el) => { sectionRefs.current[section.id] = el; }}
                className="!bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
              >
                {/* Section Header */}
                <button
                  onClick={() => handleMobileSectionClick(section.id)}
                  data-section={section.id}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors active:bg-gray-100"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`flex-shrink-0 w-10 h-10 ${iconBgClass} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${iconColorClass}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-base">
                        {section.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                  )}
                </button>

                {/* Section Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-white">
                    <div className="space-y-4">{renderSectionContent(section.id)}</div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Mobile Save Button - Sticky at bottom above nav */}
      {hasChanges && (
        <div className={`md:hidden fixed left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-40 transition-all duration-300 ${
          scrollDirection === 'down' && !isAtTop ? 'bottom-0' : 'bottom-16'
        }`}>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
        </div>
      )}
    </>
  );
}

