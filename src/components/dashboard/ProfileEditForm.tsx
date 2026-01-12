'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Save, Eye, Loader2, User, MapPin, DollarSign, Share2, Wifi, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Toggle } from '@/components/ui/Toggle';
import { Checkbox } from '@/components/ui/Checkbox';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { CountryAutocomplete } from '@/components/ui/CountryAutocomplete';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { ProgressIndicators } from '@/components/dashboard/ProgressIndicators';
import { ImageGalleryManager } from '@/components/dashboard/ImageGalleryManager';
import { calculateCompletionStats, type CompletionStats } from '@/lib/utils/profile-completion';
import { getCurrencySymbol } from '@/lib/utils/currency';
import { extractCity } from '@/lib/utils/address';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { showSuccess, showError } from '@/lib/toast';

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
    abbreviated_address?: string;
    city?: string;
    website_url?: string;
    phone?: string;
    images?: any[];
  };
  studio_types: string[];
}

const STUDIO_TYPES = [
  // Top row - Active types
  { value: 'HOME', label: 'Home', description: 'Personal recording space in a home environment', disabled: false },
  { value: 'RECORDING', label: 'Recording', description: 'Full, professional recording facility', disabled: false },
  { value: 'PODCAST', label: 'Podcast', description: 'Studio specialised for podcast recording', disabled: false },
  // Bottom row - Future additions (disabled)
  { value: 'VOICEOVER', label: 'Voiceover', description: 'Voiceover talent/artist services', disabled: true },
  { value: 'VO_COACH', label: 'VO-Coach', description: 'Voiceover coaching and training services', disabled: true },
  { value: 'EDITING', label: 'Editing', description: 'Post-production and editing services', disabled: true },
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
  const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 5 });
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Fetch profile data
  useEffect(() => {
    fetchProfile();
  }, [userId]);

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
      };
      setProfile(profileData);
      setOriginalProfile(JSON.parse(JSON.stringify(profileData))); // Deep clone
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
    };
  }, [profile]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }

      showSuccess('Profile updated successfully!');
      
      // Refresh profile data
      await fetchProfile();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    if (profile?.user.username) {
      window.open(`/${profile.user.username}`, '_blank');
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Display Name"
                value={profile.user.display_name || ''}
                onChange={(e) => updateUser('display_name', e.target.value)}
                helperText="Your public display name"
                required
              />
              <Input
                label="Username"
                value={profile.user.username || ''}
                onChange={(e) => updateUser('username', e.target.value)}
                helperText="Used in your profile URL"
                required
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={profile.user.email || ''}
              disabled
              helperText="Contact admin to change email address"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Studio Types
              </label>
              <p className="text-xs text-gray-500 mb-3">Select all that apply to your studio</p>
              <div className="space-y-3">
                {/* Top row - Active types */}
                <div className="grid grid-cols-3 gap-3">
                  {STUDIO_TYPES.slice(0, 3).map((type) => (
                    <div key={type.value} className="relative group">
                      <Checkbox
                        label={type.label}
                        checked={profile.studio_types.includes(type.value)}
                        onChange={() => toggleStudioType(type.value)}
                        disabled={type.disabled}
                      />
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none">
                        {type.description}
                        <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Bottom row - Future additions (disabled) */}
                <div className="grid grid-cols-3 gap-3">
                  {STUDIO_TYPES.slice(3).map((type) => (
                    <div key={type.value} className="relative group">
                      <Checkbox
                        label={type.label}
                        checked={profile.studio_types.includes(type.value)}
                        onChange={() => toggleStudioType(type.value)}
                        disabled={type.disabled}
                      />
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none">
                        {type.description}
                        <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Input
                label="Short About"
                value={profile.profile.short_about || ''}
                onChange={(e) => updateProfile('short_about', e.target.value)}
                maxLength={150}
              />
              <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                <span>Add a brief description to shown on the Studios page</span>
                <span>{(profile.profile.short_about || '').length}/150 characters</span>
              </div>
            </div>

            <div>
              <Textarea
                label="Full About"
                value={profile.profile.about || ''}
                onChange={(e) => updateProfile('about', e.target.value)}
                rows={6}
                maxLength={1500}
              />
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="text-gray-500">Add a detailed description for your profile page</span>
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
                label="Phone"
                type="tel"
                value={profile.profile.phone || ''}
                onChange={(e) => updateProfile('phone', e.target.value)}
                helperText="Your contact phone number"
                placeholder="+44 20 1234 5678"
              />
              <Input
                label="Website URL"
                type="url"
                value={profile.studio?.website_url || ''}
                onChange={(e) => updateStudio('website_url', e.target.value)}
                helperText="Your studio or personal website"
                placeholder="https://yourstudio.com"
              />
            </div>

            <AddressAutocomplete
              label="Full Address"
              value={profile.studio?.full_address || ''}
              onChange={(value) => {
                updateStudio('full_address', value);
                updateStudio('abbreviated_address', value);
                updateStudio('city', extractCity(value));
              }}
              placeholder="Start typing your full address..."
              helperText="Address used for geocoding and map coordinates. Home studio privacy? Choose a nearby location or landmark"
            />

            <Input
              label="Abbreviated Address"
              type="text"
              value={profile.studio?.abbreviated_address || ''}
              onChange={(e) => updateStudio('abbreviated_address', e.target.value)}
              placeholder="Enter abbreviated address for display..."
              helperText="Address shown on public profile (if visibility is enabled). Don't want to show a full address on your public profile? Abbreviate or customise it here."
            />

            <Input
              label="Region (Town / City)"
              type="text"
              value={profile.studio?.city || ''}
              onChange={(e) => updateStudio('city', e.target.value)}
              placeholder="Enter town or city name..."
              helperText="Region will be auto-populated from the Full Address above and shown on the Studios page. You can edit it if needed."
            />

            <CountryAutocomplete
              label="Country"
              value={profile.profile.location || ''}
              onChange={(value) => updateProfile('location', value)}
              placeholder="e.g. United Kingdom"
              helperText="Your primary country of operation"
            />
          </div>
        );

      case 'rates':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Set up to three rate tiers for your services
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>
            </div>

            <Toggle
              label="Show Rates on Profile"
              description="Display your pricing information publicly"
              checked={profile.profile.show_rates || false}
              onChange={(checked) => updateProfile('show_rates', checked)}
            />

            <Textarea
              label="Equipment List"
              value={profile.profile.equipment_list || ''}
              onChange={(e) => updateProfile('equipment_list', e.target.value)}
              rows={4}
              helperText="List your microphones, interfaces, and other equipment"
              placeholder="e.g., Neumann U87, Universal Audio Apollo, etc."
            />

            <Textarea
              label="Services Offered"
              value={profile.profile.services_offered || ''}
              onChange={(e) => updateProfile('services_offered', e.target.value)}
              rows={4}
              helperText="Describe the services you provide"
              placeholder="e.g., Voice recording, audio editing, mixing, mastering..."
            />
          </div>
        );

      case 'social':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Add links to your social media profiles
            </p>
            <Input
              label="Facebook"
              type="url"
              value={profile.profile.facebook_url || ''}
              onChange={(e) => updateProfile('facebook_url', e.target.value)}
              placeholder="https://facebook.com/your-page"
              helperText="Your Facebook page or profile"
            />
            <Input
              label="X (formerly Twitter)"
              type="url"
              value={profile.profile.x_url || ''}
              onChange={(e) => updateProfile('x_url', e.target.value)}
              placeholder="https://x.com/yourhandle"
              helperText="Your X (Twitter) profile"
            />
            <Input
              label="YouTube"
              type="url"
              value={profile.profile.youtube_url || ''}
              onChange={(e) => updateProfile('youtube_url', e.target.value)}
              placeholder="https://youtube.com/@yourchannel"
              helperText="Your YouTube channel"
            />
            <Input
              label="Instagram"
              type="url"
              value={profile.profile.instagram_url || ''}
              onChange={(e) => updateProfile('instagram_url', e.target.value)}
              placeholder="https://instagram.com/yourhandle"
              helperText="Your Instagram profile"
            />
            <Input
              label="SoundCloud"
              type="url"
              value={profile.profile.soundcloud_url || ''}
              onChange={(e) => updateProfile('soundcloud_url', e.target.value)}
              placeholder="https://soundcloud.com/yourprofile"
              helperText="Your SoundCloud profile"
            />
            <Input
              label="TikTok"
              type="url"
              value={profile.profile.tiktok_url || ''}
              onChange={(e) => updateProfile('tiktok_url', e.target.value)}
              placeholder="https://www.tiktok.com/@yourhandle"
              helperText="Your TikTok profile"
            />
            <Input
              label="LinkedIn"
              type="url"
              value={profile.profile.linkedin_url || ''}
              onChange={(e) => updateProfile('linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
              helperText="Your LinkedIn profile"
            />
            <Input
              label="Threads"
              type="url"
              value={profile.profile.threads_url || ''}
              onChange={(e) => updateProfile('threads_url', e.target.value)}
              placeholder="https://www.threads.net/@yourhandle"
              helperText="Your Threads profile"
            />
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
                  description="Display email on public profile"
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
                  description="Display full address on public profile"
                  checked={profile.profile.show_address || false}
                  onChange={(checked) => updateProfile('show_address', checked)}
                />
                <Toggle
                  label="Show Directions"
                  description="Display directions link on public profile"
                  checked={profile.profile.show_directions !== false}
                  onChange={(checked) => updateProfile('show_directions', checked)}
                />
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
              
              {/* Title and description */}
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Edit Profile</h2>
                <p className="text-sm md:text-base text-gray-600 mt-1">
                  Update your studio information and settings
                </p>
              </div>
            </div>

            {/* Progress Indicators */}
            <div className="flex-shrink-0">
              <ProgressIndicators
                requiredFieldsCompleted={completionStats.required.completed}
                totalRequiredFields={completionStats.required.total}
                overallCompletionPercentage={completionStats.overall.percentage}
                variant="compact"
              />
            </div>
          </div>

          {/* Desktop Section Navigation with hover animations */}
          <div className="border-b border-gray-100 px-6 py-1">
            <nav className="flex space-x-4 overflow-x-auto" aria-label="Profile sections">
              {sections.map((section) => (
                <motion.button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  data-section={section.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
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
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-shrink-0 flex border-t border-gray-100 px-6 py-4 bg-gradient-to-r from-gray-50 to-white items-center justify-between"
          >
            <Button
              onClick={handlePreview}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Profile
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </motion.div>
        )}
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

