'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, Upload, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { CountryAutocomplete } from '@/components/ui/CountryAutocomplete';
import { extractCity } from '@/lib/utils/address';

interface AddStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const STUDIO_TYPES = [
  { value: 'HOME', label: 'Home Studio', description: 'Personal recording space in a home environment' },
  { value: 'RECORDING', label: 'Recording Studio', description: 'Professional recording facility with full equipment' },
  { value: 'PODCAST', label: 'Podcast Studio', description: 'Studio specialized for podcast recording and production' },
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

interface ImageUpload {
  url: string;
  alt_text: string;
}

export default function AddStudioModal({ isOpen, onClose, onSuccess }: AddStudioModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Account fields
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  
  // Studio fields
  const [studioName, setStudioName] = useState('');
  const [shortAbout, setShortAbout] = useState('');
  const [about, setAbout] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [abbreviatedAddress, setAbbreviatedAddress] = useState('');
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [selectedStudioTypes, setSelectedStudioTypes] = useState<string[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<Record<string, boolean>>({});
  const [images, setImages] = useState<ImageUpload[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Hide navigation when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('admin-modal-open');
    } else {
      document.body.classList.remove('admin-modal-open');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('admin-modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStudioTypeToggle = (type: string) => {
    setSelectedStudioTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleConnectionToggle = (connectionId: string) => {
    setSelectedConnections(prev => ({
      ...prev,
      [connectionId]: !prev[connectionId]
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/signup-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      console.log('Image uploaded successfully:', data);
      
      // The API returns { success: true, image: { url, id, ... } }
      const imageUrl = data.image?.url || data.url;
      if (!imageUrl) {
        throw new Error('No image URL returned from upload');
      }
      
      setImages(prev => [...prev, { url: imageUrl, alt_text: '' }]);
      
      // Clear the file input
      e.target.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    // Validation
    if (!username.trim() || !displayName.trim() || !email.trim()) {
      setError('Username, Display Name, and Email are required');
      setIsLoading(false);
      return;
    }

    if (!studioName.trim() || !shortAbout.trim() || !about.trim() || !websiteUrl.trim() || !location.trim()) {
      setError('All studio fields are required');
      setIsLoading(false);
      return;
    }

    if (selectedStudioTypes.length === 0) {
      setError('Please select at least one studio type');
      setIsLoading(false);
      return;
    }

    if (images.length === 0) {
      setError('Please upload at least one image');
      setIsLoading(false);
      return;
    }

    const hasConnection = Object.values(selectedConnections).some(v => v);
    if (!hasConnection) {
      setError('Please select at least one connection method');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/create-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          display_name: displayName.trim(),
          email: email.trim(),
          studio_name: studioName.trim(),
          short_about: shortAbout.trim(),
          about: about.trim(),
          studio_types: selectedStudioTypes,
          full_address: fullAddress || null,
          abbreviated_address: abbreviatedAddress || null,
          city: city || '',
          location: location.trim(),
          website_url: websiteUrl.trim(),
          connections: selectedConnections,
          images,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create studio');
      }

      onSuccess(`Profile created! Tell user to use forgot password at ${email}`);
      onClose();
      
      // Reset form
      setUsername('');
      setDisplayName('');
      setEmail('');
      setStudioName('');
      setShortAbout('');
      setAbout('');
      setWebsiteUrl('');
      setFullAddress('');
      setAbbreviatedAddress('');
      setCity('');
      setLocation('');
      setSelectedStudioTypes([]);
      setSelectedConnections({});
      setImages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add New Studio Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Account Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-600">*</span>
                </label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., johndoe"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name <span className="text-red-600">*</span>
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., John Doe Studios"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., john@example.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> No password will be set. Tell the user to visit the site and click "Forgot Password" to set their password.
              </p>
            </div>
          </div>

          {/* Studio Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Studio Details</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Studio Name <span className="text-red-600">*</span>
              </label>
              <Input
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder="Enter studio name"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Short Description <span className="text-red-600">*</span>
              </label>
              <Textarea
                value={shortAbout}
                onChange={(e) => setShortAbout(e.target.value)}
                placeholder="Brief description (shown in search results)"
                rows={2}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Description <span className="text-red-600">*</span>
              </label>
              <Textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Detailed description of your studio"
                rows={4}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL <span className="text-red-600">*</span>
              </label>
              <Input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Studio Types */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Studio Type <span className="text-red-600">*</span>
            </label>
            <div className="space-y-3">
              {STUDIO_TYPES.map((type) => (
                <div key={type.value} className="flex items-start">
                  <Checkbox
                    checked={selectedStudioTypes.includes(type.value)}
                    onChange={() => handleStudioTypeToggle(type.value)}
                    disabled={isLoading}
                  />
                  <div className="ml-3">
                    <label className="text-sm font-medium text-gray-700">
                      {type.label}
                    </label>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <AddressAutocomplete
                label="Address"
                value={fullAddress}
                onChange={(address) => {
                  setFullAddress(address);
                  setAbbreviatedAddress(address);
                  const extractedCity = extractCity(address);
                  if (extractedCity) {
                    setCity(extractedCity);
                  }
                }}
                placeholder="Start typing address..."
              />
            </div>

            <div>
              <CountryAutocomplete
                label="Country *"
                value={location}
                onChange={setLocation}
                placeholder="Select country"
              />
            </div>
          </div>

          {/* Connection Methods */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Connection Methods <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CONNECTION_TYPES.map((conn) => (
                <div key={conn.id} className="flex items-center">
                  <Checkbox
                    checked={selectedConnections[conn.id] || false}
                    onChange={() => handleConnectionToggle(conn.id)}
                    disabled={isLoading}
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    {conn.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Studio Images <span className="text-red-600">*</span> (1-5 images)
            </label>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.url}
                    alt={`Studio image ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {images.length < 5 && (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-red-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isLoading || uploadingImage}
                  />
                  {uploadingImage ? (
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">Upload Image</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Creating...' : 'Create Studio'}
          </button>
        </div>
      </div>
    </div>
  );
}



