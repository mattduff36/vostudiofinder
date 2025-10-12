'use client';

import { useState, useEffect } from 'react';
import { Save, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Toggle } from '@/components/ui/Toggle';
import { Checkbox } from '@/components/ui/Checkbox';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { ProfileCompletionProgress } from '@/components/profile/ProfileCompletionProgress';

interface ProfileEditFormProps {
  userId: string;
}

interface ProfileData {
  user: {
    display_name: string;
    username: string;
    email: string;
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
    twitter_url?: string;
    linkedin_url?: string;
    instagram_url?: string;
    youtube_url?: string;
    vimeo_url?: string;
    soundcloud_url?: string;
    connection1?: string;
    connection2?: string;
    connection3?: string;
    connection4?: string;
    connection5?: string;
    connection6?: string;
    connection7?: string;
    connection8?: string;
    custom_connection_1_name?: string;
    custom_connection_1_value?: string;
    custom_connection_2_name?: string;
    custom_connection_2_value?: string;
    show_email: boolean;
    show_phone: boolean;
    show_address: boolean;
    studio_name?: string;
    equipment_list?: string;
    services_offered?: string;
  };
  studio?: {
    name: string;
    description?: string;
    address?: string;
    website_url?: string;
    phone?: string;
  };
  studio_types: string[];
}

const STUDIO_TYPES = [
  { value: 'HOME', label: 'Home' },
  { value: 'EDITING', label: 'Editing' },
  { value: 'RECORDING', label: 'Recording' },
  { value: 'VO_COACH', label: 'VO-Coach' },
  { value: 'PODCAST', label: 'Podcast' },
  { value: 'VOICEOVER', label: 'Voiceover' },
];

const CONNECTION_TYPES = [
  { id: 'connection1', label: 'Source Connect', icon: '🔗' },
  { id: 'connection2', label: 'Source Connect Now', icon: '🔗' },
  { id: 'connection3', label: 'ipDTL', icon: '🎙️' },
  { id: 'connection4', label: 'Session Link Pro', icon: '🎛️' },
  { id: 'connection5', label: 'Clean Feed', icon: '📡' },
  { id: 'connection6', label: 'Zoom', icon: '💻' },
  { id: 'connection7', label: 'Teams', icon: '👥' },
  { id: 'connection8', label: 'Skype', icon: '📞' },
];

export function ProfileEditForm({ userId }: ProfileEditFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch profile data
  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const data = await response.json();
      setProfile({
        user: data.data.user,
        profile: data.data.profile || {},
        studio: data.data.studio,
        studio_types: data.data.studio?.studio_types || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }

      setSuccess('Profile updated successfully!');
      
      // Refresh profile data
      await fetchProfile();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    if (profile?.user.username) {
      window.open(`/${profile.user.username}`, '_blank');
    }
  };

  const updateUser = (field: string, value: any) => {
    setProfile(prev => prev ? {
      ...prev,
      user: { ...prev.user, [field]: value },
    } : null);
  };

  const updateProfile = (field: string, value: any) => {
    setProfile(prev => prev ? {
      ...prev,
      profile: { ...prev.profile, [field]: value },
    } : null);
  };

  const updateStudio = (field: string, value: any) => {
    setProfile(prev => prev ? {
      ...prev,
      studio: { ...prev.studio, [field]: value } as any,
    } : null);
  };

  const toggleStudioType = (type: string) => {
    setProfile(prev => {
      if (!prev) return null;
      const types = prev.studio_types || [];
      const newTypes = types.includes(type)
        ? types.filter(t => t !== type)
        : [...types, type];
      return { ...prev, studio_types: newTypes };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
    { id: 'overview', label: 'Overview' },
    { id: 'basic', label: 'Basic Info' },
    { id: 'contact', label: 'Contact & Location' },
    { id: 'rates', label: 'Rates & Pricing' },
    { id: 'social', label: 'Social Media' },
    { id: 'connections', label: 'Communication Methods' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
        <p className="text-sm text-gray-600 mt-1">
          Update your studio information and settings
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          {success}
        </div>
      )}

      {/* Section Navigation */}
      <div className="border-b border-gray-200 px-6">
        <nav className="flex space-x-4 overflow-x-auto" aria-label="Profile sections">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="px-6 py-6 min-h-[400px] flex justify-center">
        <div className="w-full max-w-5xl">
        {activeSection === 'overview' && (
          <div className="space-y-6">
            <ProfileCompletionProgress 
              profileData={{
                display_name: profile.user.display_name,
                username: profile.user.username,
                avatar_url: profile.user.avatar_url,
                about: profile.profile.about,
                short_about: profile.profile.short_about,
                phone: profile.profile.phone,
                location: profile.profile.location,
                studio_name: profile.profile.studio_name,
                facebook_url: profile.profile.facebook_url,
                twitter_url: profile.profile.twitter_url,
                linkedin_url: profile.profile.linkedin_url,
                instagram_url: profile.profile.instagram_url,
                youtube_url: profile.profile.youtube_url,
                connection1: profile.profile.connection1,
                connection2: profile.profile.connection2,
                connection3: profile.profile.connection3,
                connection4: profile.profile.connection4,
                connection5: profile.profile.connection5,
                connection6: profile.profile.connection6,
                connection7: profile.profile.connection7,
                connection8: profile.profile.connection8,
              }}
            />
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Profile Tips</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Complete profiles get 3x more views</li>
                <li>• Add a professional photo to build trust</li>
                <li>• Fill in your about sections to stand out</li>
                <li>• Add connection methods so clients can reach you easily</li>
                <li>• Link your social media to showcase your work</li>
              </ul>
            </div>
          </div>
        )}
        
        {activeSection === 'basic' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Display Name"
                value={profile.user.display_name || ''}
                onChange={(e) => updateUser('display_name', e.target.value)}
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

            <Input
              label="Studio Name"
              value={profile.profile.studio_name || ''}
              onChange={(e) => updateProfile('studio_name', e.target.value)}
              helperText={`${(profile.profile.studio_name || '').length}/30 characters`}
              maxLength={30}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Studio Types
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {STUDIO_TYPES.map((type) => (
                  <Checkbox
                    key={type.value}
                    label={type.label}
                    checked={profile.studio_types.includes(type.value)}
                    onChange={() => toggleStudioType(type.value)}
                  />
                ))}
              </div>
            </div>

            <Input
              label="Short About"
              value={profile.profile.short_about || ''}
              onChange={(e) => updateProfile('short_about', e.target.value)}
              helperText={`Brief description shown in listings (${(profile.profile.short_about || '').length}/140 characters)`}
              maxLength={140}
            />

            <Textarea
              label="Full About"
              value={profile.profile.about || ''}
              onChange={(e) => updateProfile('about', e.target.value)}
              rows={6}
              helperText={`Detailed description for your profile page (${(profile.profile.about || '').length}/500 characters)`}
              maxLength={500}
            />
          </div>
        )}

        {activeSection === 'contact' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone"
                type="tel"
                value={profile.profile.phone || ''}
                onChange={(e) => updateProfile('phone', e.target.value)}
              />
              <Input
                label="Website URL"
                type="url"
                value={profile.studio?.website_url || ''}
                onChange={(e) => updateStudio('website_url', e.target.value)}
              />
            </div>

            <AddressAutocomplete
              label="Address"
              value={profile.studio?.address || ''}
              onChange={(value) => updateStudio('address', value)}
              placeholder="Start typing your address..."
              helperText="Google autocomplete will suggest addresses, but you can type manually too"
            />

            <Input
              label="Location / Region"
              value={profile.profile.location || ''}
              onChange={(e) => updateProfile('location', e.target.value)}
              helperText="General area (e.g., 'Yorkshire, UK')"
            />

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Visibility Settings</h3>
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
              </div>
            </div>
          </div>
        )}

        {activeSection === 'rates' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Rate Tier 1 (£/hour)"
                type="number"
                step="0.01"
                value={profile.profile.rate_tier_1 || ''}
                onChange={(e) => updateProfile('rate_tier_1', parseFloat(e.target.value) || null)}
              />
              <Input
                label="Rate Tier 2 (£/hour)"
                type="number"
                step="0.01"
                value={profile.profile.rate_tier_2 || ''}
                onChange={(e) => updateProfile('rate_tier_2', parseFloat(e.target.value) || null)}
              />
              <Input
                label="Rate Tier 3 (£/hour)"
                type="number"
                step="0.01"
                value={profile.profile.rate_tier_3 || ''}
                onChange={(e) => updateProfile('rate_tier_3', parseFloat(e.target.value) || null)}
              />
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
            />

            <Textarea
              label="Services Offered"
              value={profile.profile.services_offered || ''}
              onChange={(e) => updateProfile('services_offered', e.target.value)}
              rows={4}
              helperText="Describe the services you provide"
            />
          </div>
        )}

        {activeSection === 'social' && (
          <div className="space-y-4">
            <Input
              label="Facebook"
              type="url"
              value={profile.profile.facebook_url || ''}
              onChange={(e) => updateProfile('facebook_url', e.target.value)}
              placeholder="https://facebook.com/your-page"
            />
            <Input
              label="Twitter"
              type="url"
              value={profile.profile.twitter_url || ''}
              onChange={(e) => updateProfile('twitter_url', e.target.value)}
              placeholder="https://twitter.com/yourhandle"
            />
            <Input
              label="LinkedIn"
              type="url"
              value={profile.profile.linkedin_url || ''}
              onChange={(e) => updateProfile('linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
            />
            <Input
              label="Instagram"
              type="url"
              value={profile.profile.instagram_url || ''}
              onChange={(e) => updateProfile('instagram_url', e.target.value)}
              placeholder="https://instagram.com/yourhandle"
            />
            <Input
              label="YouTube"
              type="url"
              value={profile.profile.youtube_url || ''}
              onChange={(e) => updateProfile('youtube_url', e.target.value)}
              placeholder="https://youtube.com/@yourchannel"
            />
            <Input
              label="Vimeo"
              type="url"
              value={profile.profile.vimeo_url || ''}
              onChange={(e) => updateProfile('vimeo_url', e.target.value)}
              placeholder="https://vimeo.com/yourprofile"
            />
            <Input
              label="SoundCloud"
              type="url"
              value={profile.profile.soundcloud_url || ''}
              onChange={(e) => updateProfile('soundcloud_url', e.target.value)}
              placeholder="https://soundcloud.com/yourprofile"
            />
          </div>
        )}

        {activeSection === 'connections' && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Select the communication methods you support for remote sessions.
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
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-2xl mr-2">{connection.icon}</span>
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
                Add your own custom connection methods (max 2)
              </p>
              
              <div className="space-y-4">
                {/* Custom Connection 1 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Custom Method 1</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Method Name"
                      value={profile.profile.custom_connection_1_name || ''}
                      onChange={(e) => updateProfile('custom_connection_1_name', e.target.value)}
                      placeholder="e.g., Discord, WhatsApp"
                      maxLength={50}
                    />
                    <Input
                      label="Connection Details"
                      value={profile.profile.custom_connection_1_value || ''}
                      onChange={(e) => updateProfile('custom_connection_1_value', e.target.value)}
                      placeholder="e.g., Username, ID, or details"
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* Custom Connection 2 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Custom Method 2</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Method Name"
                      value={profile.profile.custom_connection_2_name || ''}
                      onChange={(e) => updateProfile('custom_connection_2_name', e.target.value)}
                      placeholder="e.g., Discord, WhatsApp"
                      maxLength={50}
                    />
                    <Input
                      label="Connection Details"
                      value={profile.profile.custom_connection_2_value || ''}
                      onChange={(e) => updateProfile('custom_connection_2_value', e.target.value)}
                      placeholder="e.g., Username, ID, or details"
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
        <Button
          onClick={handlePreview}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Preview Profile
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
      </div>
    </div>
  );
}

