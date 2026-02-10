'use client';

import { useState, useEffect, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Save, Eye, EyeOff, Loader2, User, MapPin, DollarSign, Share2, Wifi, ChevronDown, ChevronUp, Image as ImageIcon, Settings, Copy, Sparkles, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Toggle } from '@/components/ui/Toggle';
import { Checkbox } from '@/components/ui/Checkbox';
import { PrivacySettingsToggles } from '@/components/dashboard/PrivacySettingsToggles';
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
import { showSuccess, showError, showInfo, showWarning } from '@/lib/toast';
import { getBaseUrl } from '@/lib/seo/site';
import { buildProfileMetaTitle } from '@/lib/seo/profile-title';

import { adminProfileToProfileData, profileDataToAdminPayload } from '@/lib/profile/adminProfileAdapter';

export interface ProfileEditFormHandle {
  saveIfDirty: () => Promise<boolean>;
  hasUnsavedChanges: () => boolean;
}

interface ProfileEditFormProps {
  userId: string;
  mode?: 'page' | 'modal';
  autoSaveOnSectionChange?: boolean;
  onSaveSuccess?: () => void;
  dataSource?: 'user' | 'admin';
  adminStudioId?: string | undefined;
  isAdminUI?: boolean;
  /** When true, admin sandbox overrides (e.g. legacy profile simulation) are ignored.
   *  Set this when the form is editing another user's profile via the admin panel. */
  disableSandboxOverrides?: boolean;
}

interface ProfileData {
  user: {
    display_name: string;
    username: string;
    email: string;
    avatar_url?: string | null;
    email_verified?: boolean;
    status?: string;
    role?: string;
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
    x_url?: string;
    linkedin_url?: string;
    instagram_url?: string;
    youtube_url?: string;
    tiktok_url?: string;
    threads_url?: string;
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
    use_coordinates_for_map?: boolean;
    is_verified?: boolean;
    is_featured?: boolean;
    featured_until?: string | null;
    created_at?: string | Date;
  };
  studio_types: string[];
  metadata?: {
    custom_meta_title?: string;
  };
  tierLimits?: {
    aboutMaxChars: number;
    imagesMax: number;
    studioTypesMax: number | null;
    studioTypesExcluded: string[];
    connectionsMax: number;
    customConnectionsMax: number;
    socialLinksMax: number | null;
    phoneVisibility: boolean;
    directionsVisibility: boolean;
    advancedSettings: boolean;
    aiAutoGenerate: boolean;
    verificationEligible: boolean;
    featuredEligible: boolean;
    avatarAllowed: boolean;
  } | null;
  _adminOnly?: {
    studioId: string;
    status: string;
    email_verified: boolean;
    membership_expires_at?: string | null;
    membership_tier?: string;
  };
}

const STUDIO_TYPES = [
  // Top row
  { value: 'HOME', label: 'Home', description: 'Personal recording space in a home environment', disabled: false, exclusive: false },
  { value: 'RECORDING', label: 'Recording', description: 'Full, professional recording facility', disabled: false, exclusive: false },
  { value: 'PODCAST', label: 'Podcast', description: 'Studio specialised for podcast recording', disabled: false, exclusive: false },
  // Bottom row - VOICEOVER is mutually exclusive with all other types (Premium only)
  { value: 'VOICEOVER', label: 'Voiceover', description: 'Voiceover talent/artist services. This type cannot be combined with other studio types.', disabled: false, exclusive: true },
  { value: 'VO_COACH', label: 'VO Coach', description: 'Professional voiceover coaching and training', disabled: false, exclusive: false },
  { value: 'AUDIO_PRODUCER', label: 'Audio Producer', description: 'Audio production and post-production services', disabled: false, exclusive: false },
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

export const ProfileEditForm = forwardRef<ProfileEditFormHandle, ProfileEditFormProps>(
  function ProfileEditForm({ userId, mode = 'page', onSaveSuccess, dataSource = 'user', adminStudioId, isAdminUI = false, disableSandboxOverrides = false }, ref) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [activeSection, setActiveSection] = useState('basic');
  const [expandedMobileSection, setExpandedMobileSection] = useState<string | null>(null);
  const [socialMediaErrors, setSocialMediaErrors] = useState<{ [key: string]: string }>({});
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [adminNeverExpires, setAdminNeverExpires] = useState(true);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
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

  // Check for sessionStorage to open specific section (e.g., from ProfileCompletionProgress)
  // Run this whenever the modal opens (isOpen state would be ideal, but we use loading as proxy)
  useEffect(() => {
    // Only check when profile has loaded (not on initial mount while loading)
    if (loading) return;
    
    const targetSection = sessionStorage.getItem('openProfileSection');
    if (targetSection) {
      setActiveSection(targetSection);
      sessionStorage.removeItem('openProfileSection'); // Clean up after use
    }
  }, [loading]); // Re-run when loading completes (modal opened and data loaded)

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

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      
      if (dataSource === 'admin' && adminStudioId) {
        // Admin mode: fetch from admin endpoint
        const response = await fetch(`/api/admin/studios/${adminStudioId}`);
        if (!response.ok) throw new Error('Failed to fetch admin profile');
        
        const adminData = await response.json();
        const profileData = adminProfileToProfileData(adminData);
        
        setProfile(profileData);
        setOriginalProfile(JSON.parse(JSON.stringify(profileData))); // Deep clone
        
        // Set initial visibility state
        if (profileData.studio) {
          setIsProfileVisible(profileData.studio.is_profile_visible !== false);
        }
        
        // Initialize admin never expires toggle based on membership expiry
        const isAdminAccount = profileData.user.email === 'admin@mpdee.co.uk' || profileData.user.email === 'guy@voiceoverguy.co.uk';
        if (isAdminAccount) {
          setAdminNeverExpires(!profileData._adminOnly?.membership_expires_at);
        }
      } else {
        // User mode: fetch from user endpoint
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
          tierLimits: data.data.tierLimits || null,
        };
        setProfile(profileData);
        setOriginalProfile(JSON.parse(JSON.stringify(profileData))); // Deep clone
        
        // Set initial visibility state
        if (profileData.studio) {
          setIsProfileVisible(profileData.studio.is_profile_visible !== false);
        }
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load profile', true);
    } finally {
      setLoading(false);
    }
  }, [dataSource, adminStudioId]);

  // Fetch profile data - refetch when userId, dataSource, or adminStudioId changes
  useEffect(() => {
    fetchProfile();
  }, [userId, fetchProfile]);

  // Handle image changes from ImageGalleryManager without discarding unsaved form edits.
  // Only updates the images array in both profile and originalProfile state,
  // so that image operations (upload, reorder, delete) don't reset other form fields.
  const handleImagesChanged = useCallback((updatedImages: any[]) => {
    setProfile(prev => {
      if (!prev || !prev.studio) return prev;
      return { ...prev, studio: { ...prev.studio, images: updatedImages } };
    });
    setOriginalProfile(prev => {
      if (!prev || !prev.studio) return prev;
      return { ...prev, studio: { ...prev.studio, images: updatedImages } };
    });
  }, []);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (!profile || !originalProfile) return false;
    return JSON.stringify(profile) !== JSON.stringify(originalProfile);
  }, [profile, originalProfile]);

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

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

  // Admin sandbox: read legacy profile override from sessionStorage on mount
  // (sessionStorage is only ever written by the ADMIN TEST tab in Settings.tsx)
  // Sandbox overrides are DISABLED when editing another user's profile via the admin panel,
  // because the sandbox is only for testing the admin's own profile behaviour.
  const [sandboxLegacyOverride, setSandboxLegacyOverride] = useState(false);
  useEffect(() => {
    if (disableSandboxOverrides) {
      setSandboxLegacyOverride(false);
      return;
    }
    try {
      const stored = sessionStorage.getItem('adminSandbox');
      if (stored) {
        const sandbox = JSON.parse(stored);
        if (sandbox.enabled && sandbox.legacyProfile) {
          setSandboxLegacyOverride(true);
        }
      }
    } catch { /* ignore */ }
  }, [disableSandboxOverrides]);

  // Legacy profiles (created before 2026-01-01) can enable visibility without completing all required fields.
  // Admin sandbox override: if the admin sandbox has "legacyProfile" enabled, treat any profile as legacy.
  const isLegacyProfile = useMemo(() => {
    if (sandboxLegacyOverride) return true;

    if (!profile?.studio?.created_at) return false;
    const createdAt = new Date(profile.studio.created_at);
    return createdAt < new Date('2026-01-01T00:00:00.000Z');
  }, [profile?.studio?.created_at, sandboxLegacyOverride]);

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
        return false;
      }

      setSaving(true);

      // Normalize social URLs for storage (standardize to https://...).
      const normalizedProfile = {
        ...profile!,
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
      };

      let response;
      
      if (dataSource === 'admin' && adminStudioId) {
        // Admin mode: use admin endpoint
        // Handle admin never expires logic for admin accounts
        const isAdminAccount = normalizedProfile.user.email === 'admin@mpdee.co.uk' || normalizedProfile.user.email === 'guy@voiceoverguy.co.uk';
        if (isAdminAccount && adminNeverExpires && normalizedProfile._adminOnly) {
          normalizedProfile._adminOnly.membership_expires_at = null;
        }
        
        const adminPayload = profileDataToAdminPayload(normalizedProfile);
        response = await fetch(`/api/admin/studios/${adminStudioId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adminPayload),
        });
      } else {
        // User mode: use user endpoint
        // Only include metadata if user has Premium (advanced settings) to avoid
        // sending auto-generated meta title data that triggers a 403 for Basic users.
        const isAdvancedAllowedForSave = normalizedProfile.tierLimits?.advancedSettings ?? false;
        const profileToSave = {
          user: normalizedProfile.user,
          profile: normalizedProfile.profile,
          studio: normalizedProfile.studio,
          studio_types: normalizedProfile.studio_types,
          ...(isAdvancedAllowedForSave ? { metadata: normalizedProfile.metadata } : {}),
        };
        
        response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileToSave),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }

      const result = await response.json().catch(() => ({} as any));
      showSuccess('Profile updated successfully!');
      
      if (dataSource !== 'admin') {
        sessionStorage.setItem('invalidateProfileCache', '1');
        // Notify dashboard to refresh profile data immediately
        window.dispatchEvent(new CustomEvent('profileDataUpdated'));
      }

      if ((result as any)?.visibilityAutoDisabled) {
        showInfo('Profile visibility was turned off because required fields are incomplete.');
      }

      // Show voiceover artist warning if detected (non-blocking)
      if ((result as any)?.warnings && Array.isArray((result as any).warnings) && (result as any).warnings.length > 0) {
        const warningMessage = (result as any).warnings[0];
        showWarning(warningMessage, 6000); // Show warning for 6 seconds
      }
      
      // Refresh profile data
      await fetchProfile();
      
      // Notify parent (modal) of successful save
      if (onSaveSuccess) {
        onSaveSuccess();
      }
      
      return true;
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save profile');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Expose saveIfDirty and hasUnsavedChanges methods via ref for modal to call on close
  useImperativeHandle(ref, () => ({
    saveIfDirty: async () => {
      if (hasChanges) {
        return await handleSave();
      }
      return true; // No changes, nothing to save
    },
    hasUnsavedChanges: () => hasChanges,
  }));

  const handleVisibilityToggle = async (visible: boolean) => {
    setVisibilitySaving(true);
    try {
      let response;
      
      if (dataSource === 'admin' && adminStudioId) {
        // Admin mode: use admin visibility endpoint
        response = await fetch(`/api/admin/studios/${adminStudioId}/visibility`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isVisible: visible }),
        });
      } else {
        // User mode: use user endpoint
        response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studio: {
              is_profile_visible: visible
            }
          }),
        });
      }

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
        if (dataSource !== 'admin') {
          window.dispatchEvent(new CustomEvent('profile-visibility-changed', { 
            detail: { isVisible: visible } 
          }));
        }
      } else {
        showError(result.error || 'Failed to update profile visibility');
        // Revert on error
        setIsProfileVisible(!visible);
      }
    } catch (_err) {
      showError('Error updating profile visibility');
      // Revert on error
      setIsProfileVisible(!visible);
    } finally {
      setVisibilitySaving(false);
    }
  };

  // Admin-only function to verify email
  const handleVerifyEmailNow = async () => {
    if (!adminStudioId) return;
    setVerifyingEmail(true);
    try {
      const response = await fetch(`/api/admin/studios/${adminStudioId}/verify-email`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to verify email');
      }

      showSuccess(result?.alreadyVerified ? 'Email is already verified.' : 'Email marked as verified.');
      await fetchProfile();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify email.';
      showError(errorMessage);
    } finally {
      setVerifyingEmail(false);
    }
  };

  // Helper to update admin-only fields
  const updateAdminField = useCallback((field: string, value: any) => {
    setProfile(prev => prev ? {
      ...prev,
      _adminOnly: { ...prev._adminOnly!, [field]: value },
    } : null);
  }, []);

  // Helper to update user fields (including admin-editable ones)
  const updateUserField = useCallback((field: string, value: any) => {
    setProfile(prev => prev ? {
      ...prev,
      user: { ...prev.user, [field]: value },
    } : null);
  }, []);

  // Helper to update studio fields (including admin-editable ones)
  const updateStudioField = useCallback((field: string, value: any) => {
    setProfile(prev => prev ? {
      ...prev,
      studio: { ...prev.studio, [field]: value } as any,
    } : null);
  }, []);

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
      const isAdmin = prev.user?.role === 'ADMIN';

      // If unchecking, always allow
      if (types.includes(type)) {
        return { ...prev, studio_types: types.filter(t => t !== type) };
      }

      // Admin bypass: ADMIN users can combine VOICEOVER with any other types
      if (isAdmin) {
        return { ...prev, studio_types: [...types, type] };
      }

      // Check if the type being added is exclusive (VOICEOVER)
      const typeConfig = STUDIO_TYPES.find(t => t.value === type);
      const isAddingExclusive = typeConfig?.exclusive === true;

      // Check if any currently selected type is exclusive
      const hasExclusiveSelected = types.some(t => {
        const config = STUDIO_TYPES.find(st => st.value === t);
        return config?.exclusive === true;
      });

      // Adding VOICEOVER when other types are already selected
      if (isAddingExclusive && types.length > 0) {
        const confirmed = window.confirm(
          'Selecting Voiceover will remove your other studio types. The Voiceover type cannot be combined with other categories.\n\nDo you want to continue?'
        );
        if (!confirmed) return prev;
        return { ...prev, studio_types: [type] };
      }

      // Adding a non-exclusive type when VOICEOVER is already selected
      if (!isAddingExclusive && hasExclusiveSelected) {
        const confirmed = window.confirm(
          'Adding another studio type will remove Voiceover. The Voiceover type cannot be combined with other categories.\n\nDo you want to continue?'
        );
        if (!confirmed) return prev;
        return { ...prev, studio_types: [type] };
      }

      // Normal case: add the type
      return { ...prev, studio_types: [...types, type] };
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
    ...(isAdminUI ? [{ id: 'admin', label: 'Admin Settings', icon: Settings, description: 'Admin-only settings' }] : []),
  ];

  const handleMobileSectionClick = (sectionId: string) => {
    // In page mode, warn about unsaved changes before navigation
    if (mode === 'page' && hasChanges && expandedMobileSection !== sectionId) {
      const confirmNavigation = window.confirm(
        'You have unsaved changes. Are you sure you want to leave this section? Your changes will be lost.'
      );
      if (!confirmNavigation) {
        return;
      }
    }
    // In modal mode, allow free tab switching (unsaved changes dialog shown on modal close)

    if (expandedMobileSection === sectionId) {
      setExpandedMobileSection(null);
    } else {
      setExpandedMobileSection(sectionId);
      setActiveSection(sectionId);
    }
  };

  // Handle desktop tab navigation with unsaved changes check
  const handleTabNavigation = async (sectionId: string) => {
    if (activeSection === sectionId) return;
    
    // Concurrency guard: prevent multiple simultaneous tab changes/saves
    if (saving) {
      showWarning('Please wait for the current save operation to complete.');
      return;
    }
    
    // Modal mode: allow free tab switching without warning or autosave.
    // Unsaved changes will be handled when the user closes the modal.
    if (mode === 'modal') {
      setActiveSection(sectionId);
      return;
    }
    
    // Page mode: check for unsaved changes before navigation (existing behavior)
    if (hasChanges) {
      showWarning('You have unsaved changes. Please save or discard them before switching tabs.');
      return;
    }
    
    setActiveSection(sectionId);
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
                  {STUDIO_TYPES.map((type) => {
                    const tierExcluded = profile?.tierLimits?.studioTypesExcluded?.includes(type.value);
                    const maxReached = profile?.tierLimits?.studioTypesMax !== null
                      && profile?.tierLimits?.studioTypesMax !== undefined
                      && profile.studio_types.length >= profile.tierLimits.studioTypesMax
                      && !profile.studio_types.includes(type.value);

                    // Check exclusivity: if VOICEOVER is selected, disable all non-exclusive types (and vice versa)
                    // Exception: ADMIN users can combine VOICEOVER with other types
                    const isAdmin = profile?.user?.role === 'ADMIN';
                    const hasExclusiveSelected = profile.studio_types.some(t => {
                      const cfg = STUDIO_TYPES.find(st => st.value === t);
                      return cfg?.exclusive === true;
                    });
                    const exclusivityBlocked = !isAdmin && !type.exclusive && hasExclusiveSelected && !profile.studio_types.includes(type.value);

                    const isDisabled = type.disabled || tierExcluded || maxReached || exclusivityBlocked;
                    
                    let tooltipText = type.description;
                    if (type.disabled) tooltipText = 'Coming soon!';
                    else if (tierExcluded) tooltipText = 'Upgrade to Premium to unlock this studio type.';
                    else if (exclusivityBlocked) tooltipText = 'Voiceover cannot be combined with other studio types. Deselect Voiceover first to choose this type.';
                    else if (maxReached) tooltipText = `Basic members can select up to ${profile.tierLimits?.studioTypesMax ?? 1} studio type. Upgrade to Premium for all studio types.`;
                    
                    return (
                      <div key={type.value} className="relative group">
                        <Checkbox
                          label={type.label}
                          checked={profile.studio_types.includes(type.value)}
                          onChange={() => toggleStudioType(type.value)}
                          disabled={isDisabled}
                        />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none">
                          {tooltipText}
                          <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    );
                  })}
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

            {/* Row 3: Full Description (textarea, full width) - SWAPPED ORDER */}
            <div>
              <Textarea
                ref={fullAboutRef}
                label="Full Description"
                value={profile.profile.about || ''}
                onChange={(e) => updateProfile('about', e.target.value)}
                maxLength={profile?.tierLimits?.aboutMaxChars ?? 1500}
                className="min-h-[150px] resize-none overflow-hidden"
              />
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="text-gray-500">Detailed description for your profile page</span>
                <span 
                  className={`${
                    (profile.profile.about || '').length >= (profile?.tierLimits?.aboutMaxChars ?? 1500) - 100
                      ? 'text-red-600 font-semibold' 
                      : (profile.profile.about || '').length >= (profile?.tierLimits?.aboutMaxChars ?? 1500) - 200
                      ? 'text-orange-600 font-medium' 
                      : 'text-gray-500'
                  }`}
                >
                  {(profile.profile.about || '').length}/{profile?.tierLimits?.aboutMaxChars ?? 1500} characters
                </span>
              </div>
            </div>

            {/* Row 4: Short Description (single line input, full width) - SWAPPED ORDER */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Short Description
                </label>
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded-md cursor-not-allowed"
                  title="Coming soon!"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto Generate</span>
                </button>
              </div>
              <Input
                value={profile.profile.short_about || ''}
                onChange={(e) => updateProfile('short_about', e.target.value)}
                maxLength={150}
              />
              <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                <span>Shown on studio cards and used by search engines. Make the most of the 150 characters</span>
                <span>{(profile.profile.short_about || '').length}/150 characters</span>
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
              helperText="List your microphones, interfaces, and other equipment"
              placeholder="e.g., Neumann U87, Universal Audio Apollo, etc."
              className="min-h-[120px] resize-none overflow-hidden"
            />

            <Textarea
              ref={servicesOfferedRef}
              label="Services Offered"
              value={profile.profile.services_offered || ''}
              onChange={(e) => updateProfile('services_offered', e.target.value)}
              helperText="Describe the services you provide"
              placeholder="e.g., Voice recording, audio editing, mixing, mastering..."
              className="min-h-[120px] resize-none overflow-hidden"
            />
          </div>
        );

      case 'social':
        const socialMediaFields = [
          { field: 'facebook_url', label: 'Facebook', placeholder: 'facebook.com/your-page', helperText: 'Your Facebook page or profile' },
          { field: 'x_url', label: 'X (formerly Twitter)', placeholder: 'x.com/yourhandle', helperText: 'Your X (Twitter) profile' },
          { field: 'youtube_url', label: 'YouTube', placeholder: 'youtube.com/@yourchannel', helperText: 'Your YouTube channel' },
          { field: 'instagram_url', label: 'Instagram', placeholder: 'instagram.com/yourhandle', helperText: 'Your Instagram profile' },
          { field: 'soundcloud_url', label: 'SoundCloud', placeholder: 'soundcloud.com/yourprofile', helperText: 'Your SoundCloud profile' },
          { field: 'tiktok_url', label: 'TikTok', placeholder: 'tiktok.com/@yourhandle', helperText: 'Your TikTok profile' },
          { field: 'linkedin_url', label: 'LinkedIn', placeholder: 'linkedin.com/in/yourprofile', helperText: 'Your LinkedIn profile' },
          { field: 'threads_url', label: 'Threads', placeholder: 'threads.net/@yourhandle', helperText: 'Your Threads profile' },
        ];

        // Count filled social media fields for tier limit enforcement
        const filledSocialCount = socialMediaFields.filter(
          ({ field }) => (profile.profile[field as keyof typeof profile.profile] as string || '').trim() !== ''
        ).length;
        const socialLimitReached = profile.tierLimits?.socialLinksMax !== null
          && profile.tierLimits?.socialLinksMax !== undefined
          && filledSocialCount >= profile.tierLimits.socialLinksMax;

        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Add links to your social media profiles
              {profile.tierLimits?.socialLinksMax !== null && profile.tierLimits?.socialLinksMax !== undefined && (
                <span className="ml-1">({filledSocialCount}/{profile.tierLimits.socialLinksMax} used)</span>
              )}
            </p>
            {socialLimitReached && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  Basic members can add up to {profile.tierLimits?.socialLinksMax} social links.{' '}
                  <a href="/auth/membership" className="underline font-medium hover:text-amber-900">Upgrade to Premium</a> to enable them all.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {socialMediaFields.map(({ field, label, placeholder, helperText }) => {
                const value = (profile.profile[field as keyof typeof profile.profile] as string) || '';
                const isEmpty = value.trim() === '';
                const isDisabledByLimit = socialLimitReached && isEmpty;

                return (
                  <div key={field} className="relative group">
                    <Input
                      label={label}
                      type="url"
                      value={value}
                      onChange={(e) => handleSocialMediaChange(field, e.target.value)}
                      onBlur={(e) => {
                        const normalized = normalizeSocialMediaUrl(e.target.value);
                        if (normalized && normalized !== e.target.value) {
                          updateProfile(field, normalized);
                        }
                        const error = validateSocialMediaUrl(normalized || e.target.value, field);
                        setSocialMediaErrors(prev => ({ ...prev, [field]: error }));
                      }}
                      placeholder={placeholder}
                      helperText={isDisabledByLimit ? `Upgrade to Premium to add more social links` : helperText}
                      disabled={isDisabledByLimit}
                      {...(socialMediaErrors[field] && { error: socialMediaErrors[field] })}
                    />
                    {isDisabledByLimit && (
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none">
                        Basic members can add up to {profile.tierLimits?.socialLinksMax} social links. Upgrade to Premium to enable them all.
                        <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'connections':
        // Count currently enabled connections for tier limit enforcement
        const enabledConnectionCount = CONNECTION_TYPES.filter(
          (c) => profile.profile[c.id as keyof typeof profile.profile] === '1'
        ).length;
        const connectionLimitReached = profile.tierLimits?.connectionsMax !== undefined
          && enabledConnectionCount >= profile.tierLimits.connectionsMax;
        const customConnectionsAllowed = (profile.tierLimits?.customConnectionsMax ?? 0) > 0;

        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Select the connections you support for remote sessions.
                {profile.tierLimits?.connectionsMax !== undefined && profile.tierLimits.connectionsMax < 12 && (
                  <span className="ml-1">({enabledConnectionCount}/{profile.tierLimits.connectionsMax} used)</span>
                )}
              </p>
              {connectionLimitReached && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <p className="text-sm text-amber-800">
                    Basic members can select up to {profile.tierLimits?.connectionsMax} connections.{' '}
                    <a href="/auth/membership" className="underline font-medium hover:text-amber-900">Upgrade to Premium</a> for all connection types.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CONNECTION_TYPES.map((connection) => {
                  const isChecked = profile.profile[connection.id as keyof typeof profile.profile] === '1';
                  const isDisabledByLimit = connectionLimitReached && !isChecked;

                  return (
                    <div key={connection.id} className="relative group">
                      <label
                        className={`flex items-center p-4 border border-gray-200 rounded-lg ${isDisabledByLimit ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50 cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => updateProfile(connection.id, e.target.checked ? '1' : '0')}
                          disabled={isDisabledByLimit}
                          className="mr-3 h-4 w-4 text-red-600 accent-red-600 focus:ring-red-500 border-gray-300 rounded disabled:cursor-not-allowed"
                        />
                        <span className={`text-sm font-medium ${isDisabledByLimit ? 'text-gray-400' : 'text-gray-900'}`}>
                          {connection.label}
                        </span>
                      </label>
                      {isDisabledByLimit && (
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none">
                          Basic members can select up to {profile.tierLimits?.connectionsMax} connections. Upgrade to Premium for all connection types.
                          <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Connections */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Connection Methods</h3>
              {!customConnectionsAllowed ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    Custom connection methods require a Premium membership.{' '}
                    <a href="/auth/membership" className="underline font-medium hover:text-amber-900">Upgrade now</a> for £25/year to add custom connections.
                  </p>
                </div>
              ) : (
                <>
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
                          updateProfile('custom_connection_methods', filtered.some(m => m) ? filtered : []);
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
                          updateProfile('custom_connection_methods', filtered.some(m => m) ? filtered : []);
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
                </>
              )}
            </div>
          </div>
        );

      case 'images':
        return (
          <div>
            <ImageGalleryManager 
              studioId={dataSource === 'admin' && adminStudioId ? adminStudioId : undefined}
              isAdminMode={dataSource === 'admin'}
              embedded={true}
              onImagesChanged={handleImagesChanged}
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

            <PrivacySettingsToggles
              initialSettings={{
                show_email: profile.profile.show_email || false,
                show_phone: profile.profile.show_phone || false,
                show_address: profile.profile.show_address || false,
                show_directions: profile.profile.show_directions !== false,
              }}
              tierLimits={profile?.tierLimits as import('@/lib/membership-tiers').TierLimits | undefined}
              onUpdate={(updatedSettings) => {
                // Update local profile state
                setProfile(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    profile: {
                      ...prev.profile,
                      ...updatedSettings,
                    },
                  };
                });
              }}
            />
          </div>
        );

      case 'advanced':
        const studioName = profile.studio?.name || 'Your Studio';
        const city = profile.studio?.city || null;
        const studioTypes = profile.studio_types || [];
        
        const primaryTypePriority = ['RECORDING', 'HOME', 'PODCAST', 'VO_COACH', 'AUDIO_PRODUCER', 'VOICEOVER'];
        const primaryStudioType =
          primaryTypePriority.find((p) => studioTypes.includes(p)) ||
          studioTypes[0] ||
          null;

        // Compute current meta title (custom if exists, else auto-generated)
        const autoGeneratedTitle = buildProfileMetaTitle({
          studioName,
          primaryStudioType,
          city,
        });
        const currentMetaTitle = profile.metadata?.custom_meta_title?.trim() 
          ? profile.metadata.custom_meta_title.trim() 
          : autoGeneratedTitle;

        const handleCopyMetaTitle = async () => {
          try {
            await navigator.clipboard.writeText(currentMetaTitle);
            showSuccess('Meta title copied to clipboard!');
          } catch (_err) {
            showError('Failed to copy to clipboard');
          }
        };

        // Default to restrictive (false) when tier data hasn't loaded yet.
        // This prevents Basic users from interacting with Premium-only controls
        // during the brief window before tier data arrives from the API.
        const isAdvancedAllowed = profile?.tierLimits?.advancedSettings ?? false;

        return (
          <div className="space-y-6">
            {/* Section Description */}
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Customize how your studio appears in search engine results and social media shares.
              </p>
            </div>

            {!isAdvancedAllowed && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <p className="text-sm text-amber-800 font-medium">
                  Advanced settings require a Premium membership.{' '}
                  <a href="/auth/membership" className="underline hover:text-amber-900">Upgrade now</a> for £25/year to customise your SEO meta title.
                </p>
              </div>
            )}

            {/* Meta Title Input with Copy Icon Inside */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta Title
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={currentMetaTitle}
                  onChange={(e) => {
                    if (!isAdvancedAllowed) return;
                    const value = e.target.value;
                    setProfile(prev => prev ? {
                      ...prev,
                      metadata: { ...prev.metadata, custom_meta_title: value },
                    } : null);
                  }}
                  maxLength={60}
                  disabled={!isAdvancedAllowed}
                  placeholder="Auto-generated from your studio name, type, and location"
                  className={`w-full px-3 py-2 pr-10 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${!isAdvancedAllowed ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                />
                <button
                  type="button"
                  onClick={handleCopyMetaTitle}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#d42027] transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                <span>
                  {profile.metadata?.custom_meta_title?.trim() 
                    ? 'Using custom title - clear field to use auto-generated' 
                    : 'Auto-generated from your studio name, type, and location'}
                </span>
                <span className={
                  currentMetaTitle.length > 60 
                    ? 'text-red-600 font-semibold' 
                    : currentMetaTitle.length >= 50 
                    ? 'text-amber-600 font-semibold'
                    : ''
                }>
                  {currentMetaTitle.length}/60 characters
                </span>
              </div>
            </div>

            {/* Best Practices */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Best Practices</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Keep it between 50-60 characters for best display</li>
                <li>Include your studio name and primary service</li>
                <li>Add your location if space permits</li>
                <li>Make it natural and readable for humans</li>
              </ul>
            </div>
          </div>
        );

      case 'admin':
        if (!isAdminUI || !profile._adminOnly) return null;
        
        return (
          <div className="space-y-6">
            {/* Warning Banner - Compact 2-column layout */}
            <div className="bg-red-50 border border-red-200 rounded-lg pt-2 pb-2.5 px-2.5 flex gap-3 items-center">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 leading-tight">Admin Only Section</h3>
                <p className="text-xs text-red-700 leading-tight mt-0.5">
                  These settings are only visible and editable by administrators.
                </p>
              </div>
            </div>

            {/* Username and Email (Admin-editable) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Username"
                value={profile.user.username || ''}
                onChange={(e) => updateUserField('username', e.target.value)}
                helperText="User's unique username"
                required
              />
              <Input
                label="Email"
                type="email"
                value={profile.user.email || ''}
                onChange={(e) => updateUserField('email', e.target.value)}
                helperText="User's email address (changing will require re-verification)"
                required
              />
            </div>

            {/* Status & Verification Section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status & Verification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Status
                  </label>
                  <select
                    value={profile._adminOnly.status || 'ACTIVE'}
                    onChange={(e) => updateAdminField('status', e.target.value)}
                    className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="PENDING">Pending</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Account status (controls login access). This is separate from Profile Visibility (toggle at bottom).</p>

                  {/* Email verification */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email verification</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Current: <span className={profile._adminOnly.email_verified ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                            {profile._adminOnly.email_verified ? 'Verified' : 'Not verified'}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyEmailNow}
                        disabled={verifyingEmail || !!profile._adminOnly.email_verified}
                        className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={profile._adminOnly.email_verified ? 'Already verified' : 'Force-verify this user email'}
                      >
                        {verifyingEmail ? 'Verifying...' : 'Verify email now'}
                      </button>
                    </div>
                    {!profile._adminOnly.email_verified && (
                      <p className="text-[11px] text-gray-500 mt-2">
                        This marks the account's email as verified immediately (no email is sent).
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Toggle
                    label="Verified"
                    description="Show verified badge on profile"
                    checked={profile.studio?.is_verified === true}
                    onChange={(checked) => updateStudioField('is_verified', checked)}
                  />
                  <Toggle
                    label="Featured"
                    description="Show in featured listings"
                    checked={profile.studio?.is_featured === true}
                    onChange={(checked) => updateStudioField('is_featured', checked)}
                  />
                  
                  {/* Featured Expiry Date - only show when Featured is enabled */}
                  {profile.studio?.is_featured && (
                    <div className="pl-6 pt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Featured Expiry Date
                      </label>
                      <input
                        type="date"
                        value={profile.studio.featured_until ? new Date(profile.studio.featured_until).toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const dateValue = e.target.value ? new Date(e.target.value).toISOString() : '';
                          updateStudioField('featured_until', dateValue);
                        }}
                        className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        When should this studio stop being featured? Leave empty for no expiry.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Membership & Coordinates Section - Side by Side */}
            <div className="border-t border-gray-200 pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Membership Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Membership</h3>
                  <div className="space-y-4">
                    {/* Membership Tier */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Membership Tier
                      </label>
                      <select
                        value={profile._adminOnly.membership_tier || 'BASIC'}
                        onChange={(e) => updateAdminField('membership_tier', e.target.value)}
                        className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="BASIC">Basic (Free)</option>
                        <option value="PREMIUM">Premium</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Change the user&apos;s membership tier. This does not create or cancel a Stripe subscription.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Membership Expiry Date
                      </label>
                      {(profile.user.email === 'admin@mpdee.co.uk' || profile.user.email === 'guy@voiceoverguy.co.uk') ? (
                        <>
                          {/* Admin Account Toggle */}
                          <div className="flex items-center space-x-3 mb-3 p-1.5 bg-blue-50 rounded-md border border-blue-200">
                            <span className="text-lg ml-2">👑</span>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-blue-900">Admin Account</p>
                              <p className="text-xs text-blue-700">Toggle to set expiry for testing renewal features</p>
                            </div>
                            <Toggle
                              checked={adminNeverExpires}
                              onChange={(checked) => setAdminNeverExpires(checked)}
                              label="Never Expires"
                            />
                          </div>
                          
                          {/* Date input (shown when "Never Expires" is OFF) */}
                          {!adminNeverExpires && (
                            <>
                              <input
                                type="date"
                                value={profile._adminOnly.membership_expires_at ? new Date(profile._adminOnly.membership_expires_at).toISOString().split('T')[0] : ''}
                                onChange={(e) => {
                                  if (!e.target.value) {
                                    updateAdminField('membership_expires_at', null);
                                    return;
                                  }
                                  const parts = e.target.value.split('-').map(Number);
                                  if (parts.length === 3 && parts.every(n => !isNaN(n))) {
                                    const [year, month, day] = parts as [number, number, number];
                                    const dateValue = new Date(Date.UTC(year, month - 1, day)).toISOString();
                                    updateAdminField('membership_expires_at', dateValue);
                                  }
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-blue-600 mt-1">
                                ⚠️ Testing mode: Set expiry date to test renewal features. Toggle back to "Never Expires" when done.
                              </p>
                            </>
                          )}
                          
                          {adminNeverExpires && (
                            <div className="p-2 bg-gray-50 rounded border border-gray-200 text-center">
                              <p className="text-sm text-gray-600">No expiry date - unlimited access</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <input
                            type="date"
                            value={profile._adminOnly.membership_expires_at ? new Date(profile._adminOnly.membership_expires_at).toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              if (!e.target.value) {
                                updateAdminField('membership_expires_at', null);
                                return;
                              }
                              const parts = e.target.value.split('-').map(Number);
                              if (parts.length === 3 && parts.every(n => !isNaN(n))) {
                                const [year, month, day] = parts as [number, number, number];
                                const dateValue = new Date(Date.UTC(year, month - 1, day)).toISOString();
                                updateAdminField('membership_expires_at', dateValue);
                              }
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Set when the user's membership expires. Studio will become INACTIVE after this date. Leave empty to clear.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Coordinates Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Coordinates</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Set precise coordinates for map display.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <Input
                      label="Latitude"
                      type="text"
                      value={profile.studio?.latitude?.toString() || ''}
                      onChange={(e) => updateStudioField('latitude', parseFloat(e.target.value) || null)}
                      placeholder="e.g., 51.5074"
                      helperText="Decimal degrees"
                    />
                    <Input
                      label="Longitude"
                      type="text"
                      value={profile.studio?.longitude?.toString() || ''}
                      onChange={(e) => updateStudioField('longitude', parseFloat(e.target.value) || null)}
                      placeholder="e.g., -0.1278"
                      helperText="Decimal degrees"
                    />
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Checkbox
                      id="use_coordinates_for_map"
                      checked={profile.studio?.use_coordinates_for_map === true}
                      onChange={(e) => updateStudioField('use_coordinates_for_map', e.target.checked)}
                    />
                    <div className="flex-1">
                      <label htmlFor="use_coordinates_for_map" className="text-sm font-medium text-gray-900 cursor-pointer">
                        Use Coordinates for map
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        {profile.studio?.use_coordinates_for_map 
                          ? 'Map will use coordinates above instead of address'
                          : 'Map will use full address, falling back to coordinates'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
          maxHeight: 'calc(100dvh - 8rem)' // Leave space for padding
        }}
      >
        {/* Sticky Header + Tabs Container */}
        <div className="flex-shrink-0 bg-white/95 backdrop-blur-md rounded-t-2xl">
          {/* Desktop Header with Progress Indicators */}
          <div className="flex border-b border-gray-100 px-6 py-5 items-end justify-between gap-6">
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

            {/* Right Side - Profile Visibility and Required Progress (aligned to bottom) */}
            <div className="flex items-center gap-6 pb-1">
              {/* Profile Visibility Toggle */}
              <div 
                className="flex items-center gap-3 pl-6 border-l border-gray-100"
                title={(!isLegacyProfile && completionStats.required.completed !== completionStats.required.total) ? 'Complete all required profile fields before making your profile visible' : ''}
              >
                <div className="flex items-center space-x-3">
                  {(!isLegacyProfile && completionStats.required.completed !== completionStats.required.total) ? (
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
                    {isLegacyProfile && completionStats.required.completed !== completionStats.required.total && (
                      <p className="text-xs text-amber-600 mt-0.5 max-w-[220px] leading-tight">
                        Legacy profiles can enable visibility without completing all required fields, but doing so is strongly recommended for better discoverability.
                      </p>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <Toggle
                    checked={isProfileVisible}
                    onChange={handleVisibilityToggle}
                    disabled={visibilitySaving || (!isLegacyProfile && completionStats.required.completed !== completionStats.required.total)}
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
          <div className="bg-white px-6 py-1 overflow-hidden">
            <nav className="flex space-x-4" aria-label="Profile sections">
              {sections.map((section) => (
                <motion.button
                  key={section.id}
                  onClick={async () => await handleTabNavigation(section.id)}
                  data-section={section.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeSection === section.id
                      ? section.id === 'admin' 
                        ? 'border-red-500 text-red-600' 
                        : 'border-red-500 text-red-600'
                      : section.id === 'admin'
                        ? 'border-transparent text-red-500 hover:text-red-600 hover:border-red-300'
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
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0 bg-white">
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
});

