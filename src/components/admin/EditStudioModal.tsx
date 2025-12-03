'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Toggle } from '@/components/ui/Toggle';
import { Checkbox } from '@/components/ui/Checkbox';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { CountryAutocomplete } from '@/components/ui/CountryAutocomplete';
import { ImageGalleryManager } from '@/components/dashboard/ImageGalleryManager';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { getCurrencySymbol } from '@/lib/utils/currency';
import { extractCity } from '@/lib/utils/address';

interface Studio {
  id: string;
  name: string;
  description?: string;
  studio_type: string;
  studioTypes?: Array<{ studio_type: string }>;
  status: string;
  is_verified: boolean;
  is_premium: boolean;
  address?: string;
  website_url?: string;
  phone?: string;
  users: {
    display_name: string;
    email: string;
    username?: string;
  };
  created_at: string;
  updated_at: string;
}

interface EditStudioModalProps {
  studio: Studio | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
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

// Helper function to decode HTML entities
function decodeHtmlEntities(str: string) {
  if (!str) return str;
  
  const htmlEntities: { [key: string]: string } = {
    '&pound;': '£',
    '&euro;': '€',
    '&dollar;': '$',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  };
  
  return str.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return htmlEntities[entity] || entity;
  });
}

export default function EditStudioModal({ studio, isOpen, onClose, onSave }: EditStudioModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (studio && isOpen) {
      fetchProfile();
    }
  }, [studio, isOpen]);

  const fetchProfile = async () => {
    if (!studio) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/studios/${studio.id}`);
      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const data = await response.json();
      setProfile(data.profile);
      console.log('[Admin Modal] Profile visibility:', data.profile._meta?.is_profile_visible);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMetaChange = (key: string, value: any) => {
    setProfile((prev: any) => ({
      ...prev,
      _meta: {
        ...prev._meta,
        [key]: value
      }
    }));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBasicChange = (key: string, value: any) => {
    setProfile((prev: any) => {
      if (!prev) return null;
      // Create a new object to ensure React detects the change
      const updated = { ...prev };
      updated[key] = value;
      return updated;
    });
  };

  const toggleStudioType = (type: string) => {
    const currentTypes = profile?.studioTypes || [];
    let newTypes;
    
    const isChecked = currentTypes.some((st: any) => st.studio_type === type);
    
    if (isChecked) {
      newTypes = currentTypes.filter((st: any) => st.studio_type !== type);
    } else {
      newTypes = [...currentTypes, { studio_type: type }];
    }
    
    handleBasicChange('studioTypes', newTypes);
  };

  const handleSaveAndClose = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/studios/${studio?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profile,
          meta: profile._meta
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      await response.json();
      
      // Always refetch to get latest data (including avatar_url)
      await fetchProfile();

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOnly = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/studios/${studio?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profile,
          meta: profile._meta
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      await response.json();
      
      // Always refetch to get latest data (including avatar_url)
      await fetchProfile();

      onSave();
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewProfile = () => {
    if (!profile?.username) {
      alert('No username available for this studio');
      return;
    }
    
    window.open(`/${profile.username}`, '_blank');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !studio) return null;

  const tabs = [
    { id: 'basic', name: 'Basic Info', icon: '📝' },
    { id: 'contact', name: 'Contact & Location', icon: '📍' },
    { id: 'rates', name: 'Rates & Pricing', icon: '💰' },
    { id: 'social', name: 'Social Media', icon: '🌐' },
    { id: 'connections', name: 'Connections', icon: '🔗' },
    { id: 'images', name: 'Images', icon: '🖼️' },
    { id: 'admin', name: 'Admin Settings', icon: '⚙️' }
  ];

  const renderBasicTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Display Name"
          value={profile?.display_name || ''}
          onChange={(e) => handleBasicChange('display_name', e.target.value)}
          helperText="Public display name"
          required
        />
        <Input
          label="Username"
          value={profile?.username || ''}
          onChange={(e) => handleBasicChange('username', e.target.value)}
          helperText="Used in profile URL"
          required
        />
      </div>
      
      <div>
        <Input
          label="Email"
          type="email"
          value={profile?.email || ''}
          disabled
          helperText="Edit in Admin Settings tab"
        />
      </div>

      <div>
        <Input
          label="Studio Name"
          value={profile?._meta?.studio_name || ''}
          onChange={(e) => {
            const value = e.target.value;
            const truncatedValue = value.length > 30 ? value.substring(0, 30) : value;
          handleMetaChange('studio_name', truncatedValue);
        }}
        maxLength={35}
        placeholder="e.g. VoiceoverGuy - Yorkshire"
      />
        <div className="flex justify-between items-center text-xs mt-1">
          <span className="text-gray-500">Studio display name shown in listings</span>
          <span 
            className={`${
              (profile?._meta?.studio_name || '').length > 25 
                ? 'text-orange-600 font-medium' 
                : 'text-gray-400'
          }`}
        >
          {(profile?._meta?.studio_name || '').length}/35 characters
        </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Studio Types
        </label>
        <p className="text-xs text-gray-500 mb-3">Select all that apply to your studio (Admin: all types enabled)</p>
        <div className="space-y-3">
          {/* Top row - Active types */}
          <div className="grid grid-cols-3 gap-3">
            {STUDIO_TYPES.slice(0, 3).map((type) => {
              const selectedTypes = profile?.studioTypes || [];
              const isChecked = selectedTypes.some((st: any) => st.studio_type === type.value);
              
              return (
                <div key={type.value} className="relative group">
                  <Checkbox
                    label={type.label}
                    checked={isChecked}
                    onChange={() => toggleStudioType(type.value)}
                    disabled={false}
                  />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none">
                    {type.description}
                    <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Bottom row - Additional types (enabled for admins) */}
          <div className="grid grid-cols-3 gap-3">
            {STUDIO_TYPES.slice(3).map((type) => {
              const selectedTypes = profile?.studioTypes || [];
              const isChecked = selectedTypes.some((st: any) => st.studio_type === type.value);
              
              return (
                <div key={type.value} className="relative group">
                  <Checkbox
                    label={type.label}
                    checked={isChecked}
                    onChange={() => toggleStudioType(type.value)}
                    disabled={false}
                  />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none">
                    {type.description}
                    <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <Input
          label="Short About"
          value={profile?._meta?.short_about || ''}
          onChange={(e) => handleMetaChange('short_about', e.target.value)}
          maxLength={150}
        />
        <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
          <span>Brief description shown in listings</span>
          <span>{(profile?._meta?.short_about || '').length}/150 characters</span>
        </div>
      </div>

      <div>
        <Textarea
          label="Full About"
          value={decodeHtmlEntities(profile?._meta?.about) || ''}
          onChange={(e) => handleMetaChange('about', e.target.value)}
          rows={6}
          maxLength={1200}
        />
        <div className="flex justify-between items-center text-xs mt-1">
          <span className="text-gray-500">Detailed description for profile page</span>
          <span 
            className={`${
              (decodeHtmlEntities(profile?._meta?.about) || '').length >= 1100 
                ? 'text-red-600 font-semibold' 
                : (decodeHtmlEntities(profile?._meta?.about) || '').length >= 1000 
                ? 'text-orange-600 font-medium' 
                : 'text-gray-500'
            }`}
          >
            {(decodeHtmlEntities(profile?._meta?.about) || '').length}/1200 characters
          </span>
        </div>
      </div>
    </div>
  );

  const renderContactTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Phone"
          type="tel"
          value={profile?._meta?.phone || ''}
          onChange={(e) => handleMetaChange('phone', e.target.value)}
          helperText="Contact phone number"
          placeholder="+44 20 1234 5678"
        />
        <Input
          label="Website URL"
          type="url"
          value={profile?._meta?.url || ''}
          onChange={(e) => handleMetaChange('url', e.target.value)}
          helperText="Studio or personal website"
          placeholder="https://yourstudio.com"
        />
      </div>

      <AddressAutocomplete
        label="Full Address"
        value={profile?._meta?.full_address || ''}
        onChange={(value) => {
          handleMetaChange('full_address', value);
          // Always auto-populate abbreviated address when full address changes
          handleMetaChange('abbreviated_address', value);
          // Auto-populate city from full address
          handleMetaChange('city', extractCity(value));
        }}
        placeholder="Start typing your full address..."
        helperText="Complete address used for geocoding and map coordinates"
      />

      <Input
        label="Abbreviated Address"
        type="text"
        value={profile?._meta?.abbreviated_address || ''}
        onChange={(e) => handleMetaChange('abbreviated_address', e.target.value)}
        placeholder="Enter abbreviated address for display..."
        helperText="This address will be shown on your public profile (if visibility is enabled). You can abbreviate or customize it."
      />

      <Input
        label="Region (Town / City)"
        type="text"
        value={profile?._meta?.city || ''}
        onChange={(e) => handleMetaChange('city', e.target.value)}
        placeholder="Enter town or city name..."
        helperText="Region will be auto-populated from the full address above. You can edit it if needed."
      />

      <CountryAutocomplete
        label="Country"
        value={profile?._meta?.location || ''}
        onChange={(value) => handleMetaChange('location', value)}
        placeholder="e.g. United Kingdom"
      />

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Visibility Settings</h3>
        <div className="space-y-3">
          <Toggle
            label="Show Email"
            description="Display email on public profile"
            checked={profile?._meta?.showemail === '1'}
            onChange={(checked) => handleMetaChange('showemail', checked ? '1' : '0')}
          />
          <Toggle
            label="Show Phone"
            description="Display phone number on public profile"
            checked={profile?._meta?.showphone === '1'}
            onChange={(checked) => handleMetaChange('showphone', checked ? '1' : '0')}
          />
          <Toggle
            label="Show Address"
            description="Display full address on public profile"
            checked={profile?._meta?.showaddress === '1'}
            onChange={(checked) => handleMetaChange('showaddress', checked ? '1' : '0')}
          />
          <Toggle
            label="Show Directions"
            description="Display directions link on public profile"
            checked={profile?._meta?.showdirections === '1'}
            onChange={(checked) => handleMetaChange('showdirections', checked ? '1' : '0')}
          />
        </div>
      </div>
    </div>
  );

  const renderRatesTab = () => (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-600 mb-4">
          Set up to three rate tiers for services
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="15 minutes"
            type="text"
            value={decodeHtmlEntities(profile?._meta?.rates1) || ''}
            onChange={(e) => handleMetaChange('rates1', e.target.value)}
            helperText="15 minute session rate"
            placeholder={`e.g. ${getCurrencySymbol(profile?._meta?.location)}80`}
          />
          <Input
            label="30 minutes"
            type="text"
            value={decodeHtmlEntities(profile?._meta?.rates2) || ''}
            onChange={(e) => handleMetaChange('rates2', e.target.value)}
            helperText="30 minute session rate"
            placeholder={`e.g. ${getCurrencySymbol(profile?._meta?.location)}100`}
          />
          <Input
            label="60 minutes"
            type="text"
            value={decodeHtmlEntities(profile?._meta?.rates3) || ''}
            onChange={(e) => handleMetaChange('rates3', e.target.value)}
            helperText="60 minute session rate"
            placeholder={`e.g. ${getCurrencySymbol(profile?._meta?.location)}125`}
          />
        </div>
      </div>

      <Toggle
        label="Show Rates on Profile"
        description="Display pricing information publicly"
        checked={profile?._meta?.showrates === '1'}
        onChange={(checked) => handleMetaChange('showrates', checked ? '1' : '0')}
      />

      <Textarea
        label="Equipment List"
        value={profile?._meta?.equipment_list || ''}
        onChange={(e) => handleMetaChange('equipment_list', e.target.value)}
        rows={4}
        helperText="List microphones, interfaces, and other equipment"
        placeholder="e.g., Neumann U87, Universal Audio Apollo, etc."
      />

      <Textarea
        label="Services Offered"
        value={profile?._meta?.services_offered || ''}
        onChange={(e) => handleMetaChange('services_offered', e.target.value)}
        rows={4}
        helperText="Describe the services provided"
        placeholder="e.g., Voice recording, audio editing, mixing, mastering..."
      />
    </div>
  );

  const renderSocialMediaTab = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        Add links to social media profiles
      </p>
      <Input
        label="Facebook"
        type="url"
        value={profile?._meta?.facebook || ''}
        onChange={(e) => handleMetaChange('facebook', e.target.value)}
        placeholder="https://facebook.com/your-page"
        helperText="Facebook page or profile"
      />
      <Input
        label="X (formerly Twitter)"
        type="url"
        value={profile?._meta?.twitter || ''}
        onChange={(e) => handleMetaChange('twitter', e.target.value)}
        placeholder="https://x.com/yourhandle"
        helperText="X (Twitter) profile"
      />
      <Input
        label="LinkedIn"
        type="url"
        value={profile?._meta?.linkedin || ''}
        onChange={(e) => handleMetaChange('linkedin', e.target.value)}
        placeholder="https://linkedin.com/in/yourprofile"
        helperText="LinkedIn profile"
      />
      <Input
        label="Instagram"
        type="url"
        value={profile?._meta?.instagram || ''}
        onChange={(e) => handleMetaChange('instagram', e.target.value)}
        placeholder="https://instagram.com/yourhandle"
        helperText="Instagram profile"
      />
      <Input
        label="TikTok"
        type="url"
        value={profile?._meta?.tiktok || ''}
        onChange={(e) => handleMetaChange('tiktok', e.target.value)}
        placeholder="https://www.tiktok.com/@yourhandle"
        helperText="TikTok profile"
      />
      <Input
        label="Threads"
        type="url"
        value={profile?._meta?.threads || ''}
        onChange={(e) => handleMetaChange('threads', e.target.value)}
        placeholder="https://www.threads.net/@yourhandle"
        helperText="Threads profile"
      />
      <Input
        label="YouTube"
        type="url"
        value={profile?._meta?.youtubepage || ''}
        onChange={(e) => handleMetaChange('youtubepage', e.target.value)}
        placeholder="https://youtube.com/@yourchannel"
        helperText="YouTube channel"
      />
      <Input
        label="SoundCloud"
        type="url"
        value={profile?._meta?.soundcloud || ''}
        onChange={(e) => handleMetaChange('soundcloud', e.target.value)}
        placeholder="https://soundcloud.com/yourprofile"
        helperText="SoundCloud profile"
      />
    </div>
  );

  const renderConnectionsTab = () => (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-600 mb-4">
          Select connections supported for remote sessions
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONNECTION_TYPES.map((connection) => (
            <label
              key={connection.id}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={profile?._meta?.[connection.id] === '1'}
                onChange={(e) => handleMetaChange(connection.id, e.target.checked ? '1' : '0')}
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
          Add custom connection methods (max 2). These will appear in the profile alongside standard connections.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Custom Connection 1 */}
          <div>
            <Input
              label="Custom Method 1"
              value={((profile?._meta?.custom_connection_methods as string[]) || [])[0] || ''}
              onChange={(e) => {
                const methods = Array.isArray(profile?._meta?.custom_connection_methods) 
                  ? [...(profile._meta.custom_connection_methods as string[])] 
                  : [];
                methods[0] = e.target.value;
                const filtered = methods.filter((m, i) => m || i === 0 || i === 1).slice(0, 2);
                handleMetaChange('custom_connection_methods', filtered.length > 0 && filtered.some((m: string) => m) ? filtered : []);
              }}
              placeholder="e.g., Discord, WhatsApp, Slack"
              maxLength={50}
            />
            <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
              <span>Connection method name</span>
              <span>{(((profile?._meta?.custom_connection_methods as string[]) || [])[0] || '').length}/50</span>
            </div>
          </div>

          {/* Custom Connection 2 */}
          <div>
            <Input
              label="Custom Method 2"
              value={((profile?._meta?.custom_connection_methods as string[]) || [])[1] || ''}
              onChange={(e) => {
                const methods = Array.isArray(profile?._meta?.custom_connection_methods) 
                  ? [...(profile._meta.custom_connection_methods as string[])] 
                  : [];
                methods[1] = e.target.value;
                const filtered = methods.filter((m, i) => m || i === 0 || i === 1).slice(0, 2);
                handleMetaChange('custom_connection_methods', filtered.length > 0 && filtered.some((m: string) => m) ? filtered : []);
              }}
              placeholder="e.g., Discord, WhatsApp, Slack"
              maxLength={50}
            />
            <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
              <span>Connection method name</span>
              <span>{(((profile?._meta?.custom_connection_methods as string[]) || [])[1] || '').length}/50</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderImagesTab = () => {
    if (!studio) return null;
    return <ImageGalleryManager studioId={studio.id} isAdminMode={true} />;
  };

  const renderAdminTab = () => (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-red-900 mb-1">⚠️ Admin Only Section</h3>
        <p className="text-sm text-red-700">
          These settings are only visible and editable by administrators. Changes here affect system-level configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Username"
          value={profile?.username || ''}
          onChange={(e) => handleBasicChange('username', e.target.value)}
          helperText="Used in profile URLs (be careful when changing)"
          required
        />
        <Input
          label="Email"
          type="email"
          value={profile?.email || ''}
          onChange={(e) => handleBasicChange('email', e.target.value)}
          helperText="User's primary email address"
          required
        />
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Location Coordinates</h3>
        <p className="text-sm text-gray-600 mb-4">
          Set precise coordinates for map display. You can enter them manually or use the map (if available).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input
            label="Latitude"
            type="text"
            value={profile?._meta?.latitude || ''}
            onChange={(e) => handleMetaChange('latitude', e.target.value)}
            placeholder="e.g., 51.5074"
            helperText="Decimal degrees (e.g., 51.5074)"
          />
          <Input
            label="Longitude"
            type="text"
            value={profile?._meta?.longitude || ''}
            onChange={(e) => handleMetaChange('longitude', e.target.value)}
            placeholder="e.g., -0.1278"
            helperText="Decimal degrees (e.g., -0.1278)"
          />
        </div>
        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <Checkbox
            id="use_coordinates_for_map"
            checked={profile?._meta?.use_coordinates_for_map === true}
            onChange={(e) => handleMetaChange('use_coordinates_for_map', e.target.checked)}
          />
          <div className="flex-1">
            <label htmlFor="use_coordinates_for_map" className="text-sm font-medium text-gray-900 cursor-pointer">
              Use Coordinates for studio profile location
            </label>
            <p className="text-xs text-gray-500 mt-1">
              {profile?._meta?.use_coordinates_for_map 
                ? 'Map will use the coordinates above instead of the full address'
                : 'Map will automatically use the full address if it looks complete, otherwise falls back to coordinates'}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Status & Verification</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Status
            </label>
            <select
              value={profile?.status || 'active'}
              onChange={(e) => handleBasicChange('status', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Current account status</p>
          </div>
          
          <div className="space-y-3">
            <Toggle
              label="Verified"
              description="Show verified badge on profile"
              checked={profile?._meta?.verified === '1'}
              onChange={(checked) => handleMetaChange('verified', checked ? '1' : '0')}
            />
            <Toggle
              label="Featured"
              description="Show in featured listings"
              checked={profile?._meta?.featured === '1'}
              onChange={(checked) => handleMetaChange('featured', checked ? '1' : '0')}
            />
            
            {/* Featured Expiry Date - only show when Featured is enabled */}
            {profile?._meta?.featured === '1' && (
              <div className="pl-6 pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Featured Expiry Date
                </label>
                <input
                  type="date"
                  value={profile?._meta?.featured_expires_at ? new Date(profile._meta.featured_expires_at).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const dateValue = e.target.value ? new Date(e.target.value).toISOString() : '';
                    handleMetaChange('featured_expires_at', dateValue);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  When should this studio stop being featured? Leave empty for no expiry.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black bg-opacity-50" />
        <div className="flex min-h-full items-start justify-center p-4 pt-20">
          <div className="bg-white rounded-lg p-8">
            <div className="flex items-center">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              <span className="ml-2">Loading profile...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black bg-opacity-50" />
        <div className="flex min-h-full items-start justify-center p-4 pt-20">
          <div className="bg-white rounded-lg p-8">
            <p className="text-red-600">Profile not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      {/* Modal backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-60 transition-opacity" />
      
      {/* Modal container */}
      <div className="flex min-h-full items-start justify-center p-4 pt-20">
        <div className="relative w-full max-w-7xl mx-auto">
          {/* Modal content */}
          <div className="bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-hidden">
            {/* Modal header with close button */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 border-b border-red-800 flex justify-between items-center">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <AvatarUpload
                  currentAvatar={profile?.avatar_image}
                  onAvatarChange={(url) => handleBasicChange('avatar_image', url)}
                  size="medium"
                  editable={true}
                  userName={profile?.display_name || profile?.username || 'User'}
                  variant="admin"
                />
                
                {/* Title */}
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-white">
                    Edit Studio Profile
                  </h2>
                  {(profile?.username || studio?.users?.username) && (
                    <p className="text-lg font-semibold text-white mt-0.5">
                      {profile?.username || studio?.users?.username}
                    </p>
                  )}
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="text-white hover:text-red-100 hover:bg-red-800 rounded-full flex items-center justify-center font-bold transition-colors duration-200"
                style={{ width: '32px', height: '32px', fontSize: '24px' }}
                title="Close modal (Esc)"
              >
                ×
              </button>
            </div>
            
            {/* Modal body with scrollable content */}
            <div className="overflow-y-auto max-h-[calc(90vh-220px)]">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
                <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === tab.id
                          ? 'border-red-500 text-red-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.name}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="px-6 py-6 min-h-[400px] flex justify-center">
                <div className="w-full max-w-5xl">
                  {activeTab === 'basic' && renderBasicTab()}
                  {activeTab === 'contact' && renderContactTab()}
                  {activeTab === 'rates' && renderRatesTab()}
                  {activeTab === 'social' && renderSocialMediaTab()}
                  {activeTab === 'connections' && renderConnectionsTab()}
                  {activeTab === 'images' && renderImagesTab()}
                  {activeTab === 'admin' && renderAdminTab()}
                </div>
              </div>
            </div>

            {/* Sticky Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <button
                  onClick={handleViewProfile}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  👁️ View Profile
                </button>
                <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white">
                  <span className="text-sm font-medium text-gray-700">Profile Visibility:</span>
                  <Toggle
                    checked={profile?._meta?.is_profile_visible !== false}
                    onChange={(checked) => handleMetaChange('is_profile_visible', checked)}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveOnly}
                  disabled={saving}
                  className="px-6 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleSaveAndClose}
                  disabled={saving}
                  className="px-6 py-2 bg-purple-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save & Close'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Success Modal */}
        {showSuccessModal && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center cursor-pointer"
            onClick={() => setShowSuccessModal(false)}
          >
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Success!</h3>
              </div>
              <p className="text-gray-600 mb-4">Changes saved successfully!</p>
              <p className="text-xs text-gray-500">Click anywhere to close</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
