'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

interface Studio {
  id: string;
  name: string;
  description?: string;
  studioType: string;
  status: string;
  isVerified: boolean;
  isPremium: boolean;
  address?: string;
  websiteUrl?: string;
  phone?: string;
  owner: {
    displayName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
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

  const handleSave = async () => {
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Studio Name</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={profile?.email || ''}
            onChange={(e) => handleBasicChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Short About</label>
        <textarea
          value={profile?._meta?.shortabout || ''}
          onChange={(e) => handleMetaChange('shortabout', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full About</label>
        <textarea
          value={decodeHtmlEntities(profile?._meta?.about) || ''}
          onChange={(e) => handleMetaChange('about', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
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
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={profile?._meta?.verified === '1'}
              onChange={(e) => handleMetaChange('verified', e.target.checked ? '1' : '0')}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Verified</span>
          </label>
        </div>
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={profile?._meta?.featured === '1'}
              onChange={(e) => handleMetaChange('featured', e.target.checked ? '1' : '0')}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Featured</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderContactTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input
            type="text"
            value={profile?._meta?.last_name || ''}
            onChange={(e) => handleMetaChange('last_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Smith"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={profile?._meta?.phone || ''}
            onChange={(e) => handleMetaChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
          <input
            type="url"
            value={profile?._meta?.url || ''}
            onChange={(e) => handleMetaChange('url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Display Settings</h4>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            value={profile?._meta?.location || ''}
            onChange={(e) => handleMetaChange('location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
          <input
            type="text"
            value={profile?._meta?.locale || ''}
            onChange={(e) => handleMetaChange('locale', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
        <input
          type="text"
          value={profile?._meta?.address || ''}
          onChange={(e) => handleMetaChange('address', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
          <input
            type="text"
            value={profile?._meta?.latitude || ''}
            onChange={(e) => handleMetaChange('latitude', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">15 Minutes Rate</label>
          <input
            type="text"
            value={decodeHtmlEntities(profile?._meta?.rates1) || ''}
            onChange={(e) => handleMetaChange('rates1', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. £80, $80, €80"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">30 Minutes Rate</label>
          <input
            type="text"
            value={decodeHtmlEntities(profile?._meta?.rates2) || ''}
            onChange={(e) => handleMetaChange('rates2', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. £100, $100, €100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">60 Minutes Rate</label>
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
              <div className="px-6 py-6">
                {activeTab === 'basic' && renderBasicTab()}
                {activeTab === 'contact' && renderContactTab()}
                {activeTab === 'location' && renderLocationTab()}
                {activeTab === 'rates' && renderRatesTab()}
                {activeTab !== 'basic' && activeTab !== 'contact' && activeTab !== 'location' && activeTab !== 'rates' && (
                  <div className="text-center py-8 text-gray-500">
                    This tab is under development
                  </div>
                )}
              </div>

              {/* Sticky Save Button */}
              <div className="sticky bottom-0 bg-white border-t-2 border-gray-300 px-6 py-4 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 shadow-lg"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
