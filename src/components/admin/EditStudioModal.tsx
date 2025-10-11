'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ImageGalleryManager } from '@/components/dashboard/ImageGalleryManager';

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
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

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
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMetaChange = (key: string, value: any) => {
    setProfile((prev: any) => ({
      ...prev,
      _meta: {
        ...prev._meta,
        [key]: value
      }
    }));
  };

  const handleBasicChange = (key: string, value: any) => {
    setProfile((prev: any) => ({
      ...prev,
      [key]: value
    }));
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

      onSave();
      // Don't close the modal - just show success message
      alert('Changes saved successfully!');
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
    
    // Open the profile page in a new tab
    window.open(`/${profile.username}`, '_blank');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !studio) return null;

  const tabs = [
    { id: 'basic', name: 'Basic Info', icon: '👤' },
    { id: 'contact', name: 'Contact', icon: '📞' },
    { id: 'social', name: 'Social Media', icon: '🌐' },
    { id: 'media', name: 'Media Links', icon: '🎵' },
    { id: 'connections', name: 'Connections', icon: '🔗' },
    { id: 'location', name: 'Location', icon: '📍' },
    { id: 'rates', name: 'Rates & Display', icon: '💰' },
    { id: 'images', name: 'Images', icon: '🖼️' },
    { id: 'advanced', name: 'Advanced', icon: '⚙️' }
  ];

  const renderBasicTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username <span className="text-red-600">(users.username)</span></label>
          <input
            type="text"
            value={profile?.username || ''}
            onChange={(e) => handleBasicChange('username', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. VoiceoverGuy"
          />
          <p className="text-xs text-gray-500 mt-1">This is used in URLs and should be unique</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-600">(users.email)</span></label>
          <input
            type="email"
            value={profile?.email || ''}
            onChange={(e) => handleBasicChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Studio Name <span className="text-red-600">(studios.name)</span></label>
          <input
            type="text"
            value={profile?._meta?.studio_name || ''}
            onChange={(e) => {
              const value = e.target.value;
              const truncatedValue = value.length > 30 ? value.substring(0, 30) : value;
              handleMetaChange('studio_name', truncatedValue);
            }}
            maxLength={30}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. VoiceoverGuy - Yorkshire"
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">This is the studio display name shown in listings</p>
            <p className={`text-xs ${(profile?._meta?.studio_name || '').length > 25 ? 'text-orange-600' : 'text-gray-400'}`}>
              {(profile?._meta?.studio_name || '').length}/30
            </p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Studio Types <span className="text-red-600">(studio_studio_types.studio_type)</span></label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
            {[
              { value: 'HOME', label: 'Home' },
              { value: 'EDITING', label: 'Editing' },
              { value: 'RECORDING', label: 'Recording' },
              { value: 'VO_COACH', label: 'VO-Coach' },
              { value: 'PODCAST', label: 'Podcast' },
              { value: 'VOICEOVER', label: 'Voiceover' }
            ].map((type) => {
              const selectedTypes = profile?.studioTypes || [];
              const isChecked = selectedTypes.some((st: any) => st.studio_type === type.value);
              
              return (
                <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const currentTypes = profile?.studioTypes || [];
                      let newTypes;
                      
                      if (e.target.checked) {
                        // Add the type
                        newTypes = [...currentTypes, { studio_type: type.value }];
                      } else {
                        // Remove the type
                        newTypes = currentTypes.filter((st: any) => st.studio_type !== type.value);
                      }
                      
                      handleBasicChange('studioTypes', newTypes);
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {type.label}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-1">Select one or more studio types</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Short About <span className="text-red-600">(user_profiles.short_about)</span></label>
        <input
          type="text"
          value={profile?._meta?.short_about || ''}
          onChange={(e) => handleMetaChange('short_about', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Brief description of the studio"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full About <span className="text-red-600">(user_profiles.about)</span></label>
        <textarea
          value={decodeHtmlEntities(profile?._meta?.about) || ''}
          onChange={(e) => handleMetaChange('about', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );

  const renderContactTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-600">(user_profiles.phone)</span></label>
          <input
            type="tel"
            value={profile?._meta?.phone || ''}
            onChange={(e) => handleMetaChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website URL <span className="text-red-600">(studios.website_url)</span></label>
          <input
            type="url"
            value={profile?._meta?.url || ''}
            onChange={(e) => handleMetaChange('url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Display Settings</h4>
        <p className="text-xs text-gray-600 mb-3">
          🔒 Email addresses are protected from bots. The "Message Studio" button uses secure mailto links with anti-bot measures.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={profile?._meta?.showemail === '1'}
              onChange={(e) => handleMetaChange('showemail', e.target.checked ? '1' : '0')}
              className="mr-2"
            />
            <span className="text-sm">Show Email</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={profile?._meta?.showphone === '1'}
              onChange={(e) => handleMetaChange('showphone', e.target.checked ? '1' : '0')}
              className="mr-2"
            />
            <span className="text-sm">Show Phone</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={profile?._meta?.showmap === '1'}
              onChange={(e) => handleMetaChange('showmap', e.target.checked ? '1' : '0')}
              className="mr-2"
            />
            <span className="text-sm">Show Map</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={profile?._meta?.showdirections === '1'}
              onChange={(e) => handleMetaChange('showdirections', e.target.checked ? '1' : '0')}
              className="mr-2"
            />
            <span className="text-sm">Show Directions</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={profile?._meta?.showaddress === '1'}
              onChange={(e) => handleMetaChange('showaddress', e.target.checked ? '1' : '0')}
              className="mr-2"
            />
            <span className="text-sm">Show Address</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={profile?._meta?.showshort === '1'}
              onChange={(e) => handleMetaChange('showshort', e.target.checked ? '1' : '0')}
              className="mr-2"
            />
            <span className="text-sm">Show Short About</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderLocationTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-red-600">(user_profiles.location)</span></label>
          <input
            type="text"
            value={profile?._meta?.location || ''}
            onChange={(e) => handleMetaChange('location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Locale <span className="text-red-600">(N/A)</span></label>
          <input
            type="text"
            value={profile?._meta?.locale || ''}
            onChange={(e) => handleMetaChange('locale', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Address <span className="text-red-600">(studios.address)</span></label>
        <input
          type="text"
          value={profile?._meta?.address || ''}
          onChange={(e) => handleMetaChange('address', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Latitude <span className="text-red-600">(studios.latitude)</span></label>
          <input
            type="text"
            value={profile?._meta?.latitude || ''}
            onChange={(e) => handleMetaChange('latitude', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Longitude <span className="text-red-600">(studios.longitude)</span></label>
          <input
            type="text"
            value={profile?._meta?.longitude || ''}
            onChange={(e) => handleMetaChange('longitude', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderRatesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">15 Minutes Rate <span className="text-red-600">(user_profiles.rate_tier_1)</span></label>
          <input
            type="text"
            value={decodeHtmlEntities(profile?._meta?.rates1) || ''}
            onChange={(e) => handleMetaChange('rates1', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. £80, $80, €80"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">30 Minutes Rate <span className="text-red-600">(user_profiles.rate_tier_2)</span></label>
          <input
            type="text"
            value={decodeHtmlEntities(profile?._meta?.rates2) || ''}
            onChange={(e) => handleMetaChange('rates2', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. £100, $100, €100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">60 Minutes Rate <span className="text-red-600">(user_profiles.rate_tier_3)</span></label>
          <input
            type="text"
            value={decodeHtmlEntities(profile?._meta?.rates3) || ''}
            onChange={(e) => handleMetaChange('rates3', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. £125, $125, €125"
          />
        </div>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={profile?._meta?.showrates === '1'}
            onChange={(e) => handleMetaChange('showrates', e.target.checked ? '1' : '0')}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700">Show Rates</span>
        </label>
      </div>
    </div>
  );

  const renderSocialMediaTab = () => (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 mb-4">
        Add social media links to display on the studio profile page.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Facebook URL <span className="text-red-600">(user_profiles.facebook_url)</span>
          </label>
          <input
            type="url"
            value={profile?._meta?.facebook || ''}
            onChange={(e) => handleMetaChange('facebook', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://facebook.com/yourpage"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Twitter URL <span className="text-red-600">(user_profiles.twitter_url)</span>
          </label>
          <input
            type="url"
            value={profile?._meta?.twitter || ''}
            onChange={(e) => handleMetaChange('twitter', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://twitter.com/yourhandle"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            LinkedIn URL <span className="text-red-600">(user_profiles.linkedin_url)</span>
          </label>
          <input
            type="url"
            value={profile?._meta?.linkedin || ''}
            onChange={(e) => handleMetaChange('linkedin', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://linkedin.com/in/yourprofile"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instagram URL <span className="text-red-600">(user_profiles.instagram_url)</span>
          </label>
          <input
            type="url"
            value={profile?._meta?.instagram || ''}
            onChange={(e) => handleMetaChange('instagram', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://instagram.com/yourhandle"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            YouTube URL <span className="text-red-600">(user_profiles.youtube_url)</span>
          </label>
          <input
            type="url"
            value={profile?._meta?.youtubepage || ''}
            onChange={(e) => handleMetaChange('youtubepage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://youtube.com/@yourchannel"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vimeo URL <span className="text-red-600">(user_profiles.vimeo_url)</span>
          </label>
          <input
            type="url"
            value={profile?._meta?.vimeo || ''}
            onChange={(e) => handleMetaChange('vimeo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://vimeo.com/yourpage"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SoundCloud URL <span className="text-red-600">(user_profiles.soundcloud_url)</span>
          </label>
          <input
            type="url"
            value={profile?._meta?.soundcloud || ''}
            onChange={(e) => handleMetaChange('soundcloud', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://soundcloud.com/yourprofile"
          />
        </div>
      </div>
    </div>
  );

  const renderConnectionsTab = () => {
    const connectionTypes = [
      { id: 'connection1', label: 'Source Connect', icon: '🔗', dbField: 'user_profiles.connection1' },
      { id: 'connection2', label: 'Source Connect Now', icon: '🔗', dbField: 'user_profiles.connection2' },
      { id: 'connection3', label: 'Phone Patch', icon: '📞', dbField: 'user_profiles.connection3' },
      { id: 'connection4', label: 'Session Link Pro', icon: '🎤', dbField: 'user_profiles.connection4' },
      { id: 'connection5', label: 'Zoom or Teams', icon: '💻', dbField: 'user_profiles.connection5' },
      { id: 'connection6', label: 'Cleanfeed', icon: '🎵', dbField: 'user_profiles.connection6' },
      { id: 'connection7', label: 'Riverside', icon: '🎬', dbField: 'user_profiles.connection7' },
      { id: 'connection8', label: 'Google Hangouts', icon: '📹', dbField: 'user_profiles.connection8' },
    ];

    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-600 mb-4">
          Select which communication methods this studio supports. These will be displayed on the profile page.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connectionTypes.map((connection) => (
            <label key={connection.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={profile?._meta?.[connection.id] === '1'}
                onChange={(e) => handleMetaChange(connection.id, e.target.checked ? '1' : '0')}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-2xl mr-2">{connection.icon}</span>
              <span className="text-sm font-medium text-gray-900">
                {connection.label} <span className="text-red-600">({connection.dbField})</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const renderAdvancedTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status <span className="text-red-600">(studios.status)</span></label>
          <select
            value={profile?.status || 'active'}
            onChange={(e) => handleBasicChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={profile?._meta?.verified === '1'}
              onChange={(e) => handleMetaChange('verified', e.target.checked ? '1' : '0')}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Verified <span className="text-red-600">(studios.is_verified)</span></span>
          </label>
        </div>
        
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={profile?._meta?.featured === '1'}
              onChange={(e) => handleMetaChange('featured', e.target.checked ? '1' : '0')}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Featured <span className="text-red-600">(user_profiles.is_featured)</span></span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderImagesTab = () => {
    if (!studio) return null;
    return <ImageGalleryManager studioId={studio.id} isAdminMode={true} />;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black bg-opacity-50" />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8">
            <div className="flex items-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
        <div className="flex min-h-full items-center justify-center p-4">
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
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-7xl mx-auto">
          {/* Modal content */}
          <div className="bg-gray-50 rounded-xl shadow-2xl border-4 border-gray-400 max-h-[90vh] overflow-hidden">
            {/* Modal header with close button */}
            <div className="bg-gradient-to-r from-gray-200 to-gray-300 px-4 border-b-2 border-gray-400 flex justify-between items-center" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
              <h2 className="font-bold text-gray-800" style={{ fontSize: '14px', margin: '0' }}>
                📝 Edit Studio Profile
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full flex items-center justify-center font-bold transition-colors duration-200"
                style={{ width: '32px', height: '32px', fontSize: '24px' }}
                title="Close modal (Esc)"
              >
                ×
              </button>
            </div>
            
            {/* Modal body with scrollable content */}
            <div className="overflow-y-auto max-h-[calc(90vh-60px)] bg-white">
              {/* Studio name header */}
              <div className="bg-blue-50 px-4 border-b border-gray-200" style={{ paddingTop: '2px', paddingBottom: '2px' }}>
                <h3 className="font-medium text-gray-900" style={{ fontSize: '14px', margin: '0' }}>
                  {profile.display_name || profile.username}
                </h3>
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
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
              <div className="px-6 py-6 min-h-[600px]">
                {activeTab === 'basic' && renderBasicTab()}
                {activeTab === 'contact' && renderContactTab()}
                {activeTab === 'location' && renderLocationTab()}
                {activeTab === 'rates' && renderRatesTab()}
                {activeTab === 'social' && renderSocialMediaTab()}
                {activeTab === 'connections' && renderConnectionsTab()}
                {activeTab === 'images' && renderImagesTab()}
                {activeTab === 'advanced' && renderAdvancedTab()}
                {activeTab !== 'basic' && activeTab !== 'contact' && activeTab !== 'location' && activeTab !== 'rates' && activeTab !== 'social' && activeTab !== 'connections' && activeTab !== 'images' && activeTab !== 'advanced' && (
                  <div className="text-center py-8 text-gray-500">
                    This tab is under development
                  </div>
                )}
              </div>

              {/* Sticky Action Buttons */}
              <div className="sticky bottom-0 bg-white border-t-2 border-gray-300 px-6 py-4 flex justify-end">
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveOnly}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 shadow-md"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleViewProfile}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View
                  </button>
                  <button
                    onClick={handleSaveAndClose}
                    disabled={saving}
                    className="px-4 py-2 bg-purple-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 shadow-md"
                  >
                    {saving ? 'Saving...' : 'Save & Close'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
