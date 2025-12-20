'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { CountryAutocomplete } from '@/components/ui/CountryAutocomplete';
import { Loader2, Upload, X } from 'lucide-react';
import { extractCity } from '@/lib/utils/address';
import Image from 'next/image';

const STUDIO_TYPES = [
  { value: 'HOME', label: 'Home', description: 'Personal recording space in a home environment' },
  { value: 'RECORDING', label: 'Recording', description: 'Full, professional recording facility' },
  { value: 'PODCAST', label: 'Podcast', description: 'Studio specialised for podcast recording' },
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

interface ProfileFormData {
  // Pre-filled (locked)
  username: string;
  display_name: string;
  email: string;
  // Required fields
  studio_name: string;
  short_about: string;
  about: string;
  studio_types: string[];
  full_address: string;
  abbreviated_address: string;
  city: string;
  location: string;
  website_url: string;
  connections: Record<string, boolean>;
  images: { url: string; alt_text?: string }[];
}

export function MembershipSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<{ url: string; alt_text?: string }[]>([]);
  
  const sessionId = searchParams?.get('session_id');
  const email = searchParams?.get('email') || '';
  const name = searchParams?.get('name') || '';
  const username = searchParams?.get('username') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    defaultValues: {
      username: username,
      display_name: name,
      email: email,
      studio_name: '',
      short_about: '',
      about: '',
      studio_types: [],
      full_address: '',
      abbreviated_address: '',
      city: '',
      location: '',
      website_url: '',
      connections: {},
      images: [],
    },
  });

  const studioTypes = watch('studio_types') || [];
  const connections = watch('connections') || {};

  // Verify payment on component mount
  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError('No payment session found');
        return;
      }

      try {
        const params = new URLSearchParams();
        if (email) params.set('email', email);
        if (name) params.set('name', name);
        if (username) params.set('username', username);

        const response = await fetch(`/api/stripe/verify-membership-payment?${params.toString()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Payment verification failed');
        }

        setPaymentVerified(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Payment verification failed');
      }
    };

    verifyPayment();
  }, [sessionId, email, name, username]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length >= 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    const file = files[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (.png, .jpg, .webp)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'voiceover-studios');

      const response = await fetch('/api/upload/signup-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      const newImages = [...images, { url: result.image.url, alt_text: '' }];
      setImages(newImages);
      setValue('images', newImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    setValue('images', newImages);
  };

  const toggleStudioType = (type: string) => {
    const currentTypes = studioTypes;
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    setValue('studio_types', newTypes);
  };

  const toggleConnection = (connectionId: string) => {
    setValue(`connections.${connectionId}`, !connections[connectionId]);
  };

  const onSubmit = async (data: ProfileFormData) => {
    // Validation
    if (images.length === 0) {
      setError('Please upload at least 1 image of your studio');
      return;
    }

    if (data.studio_types.length === 0) {
      setError('Please select at least one studio type');
      return;
    }

    const hasConnection = Object.values(data.connections).some(v => v);
    if (!hasConnection) {
      setError('Please select at least one connection method');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get password from session storage (stored during signup)
      const signupDataStr = sessionStorage.getItem('signupData');
      let password = '';
      if (signupDataStr) {
        const signupData = JSON.parse(signupDataStr);
        password = signupData.password;
      }

      if (!password) {
        setError('Session expired. Please start the signup process again.');
        return;
      }

      console.log('📤 Submitting profile data:', {
        hasPassword: !!password,
        hasSessionId: !!sessionId,
        studioTypes: data.studio_types,
        imageCount: images.length,
        connections: Object.keys(data.connections).filter(k => data.connections[k])
      });

      const response = await fetch('/api/auth/create-studio-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          password, // Include password from signup
          sessionId,
          images,
        }),
      });

      const result = await response.json();
      console.log('📥 Server response:', { ok: response.ok, status: response.status, result });

      if (!response.ok) {
        throw new Error(result.error || 'Profile creation failed');
      }

      // Clear signup data from session storage
      sessionStorage.removeItem('signupData');
      sessionStorage.removeItem('selectedUsername');

      // Redirect to email verification page
      router.push('/auth/verify-email?new=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!paymentVerified && !error) {
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="absolute inset-0">
          <Image
            src="/background-images/21920-5.jpg"
            alt="Background texture"
            fill
            className="object-cover opacity-10"
            priority={false}
          />
        </div>
        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/voiceover-studio-finder-header-logo2-black.png"
              alt="VoiceoverStudioFinder"
              width={450}
              height={71}
              priority
              className="h-auto max-w-full"
            />
          </div>
          <div className="bg-white/90 backdrop-blur-sm py-8 px-6 shadow sm:rounded-lg text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/favicon_transparent/android-chrome-192x192.png"
                alt="Loading"
                width={64}
                height={64}
                className="animate-pulse"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Verifying Payment...
            </h1>
            <p className="mt-2 text-gray-600">
              Please wait while we confirm your membership payment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !paymentVerified) {
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="absolute inset-0">
          <Image
            src="/background-images/21920-5.jpg"
            alt="Background texture"
            fill
            className="object-cover opacity-10"
            priority={false}
          />
        </div>
        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/voiceover-studio-finder-header-logo2-black.png"
              alt="VoiceoverStudioFinder"
              width={450}
              height={71}
              priority
              className="h-auto max-w-full"
            />
          </div>
          <div className="bg-white/90 backdrop-blur-sm py-8 px-6 shadow sm:rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Verification Failed
              </h1>
              <p className="text-red-600 mb-6">{error}</p>
              <Button
                onClick={() => router.push('/auth/signup')}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-start py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-5.jpg"
          alt="Background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-4xl px-4">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/images/voiceover-studio-finder-header-logo2-black.png"
            alt="VoiceoverStudioFinder"
            width={450}
            height={71}
            priority
            className="h-auto max-w-full"
          />
        </div>

        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Payment Successful!
          </h1>
          <p className="mt-2 text-gray-600">
            Complete your studio profile to get your listing live
          </p>
        </div>

        {/* Profile Setup Form */}
        <div className="bg-white/90 backdrop-blur-sm py-8 px-6 shadow sm:rounded-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Account Details (locked) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Username"
                  value={username}
                  disabled
                  className="bg-gray-50"
                />
                <Input
                  label="Display Name"
                  value={name}
                  disabled
                  className="bg-gray-50"
                />
                <Input
                  label="Email"
                  value={email}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>

            {/* Studio Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Studio Information</h3>
              
              <Input
                label="Studio Name *"
                {...register('studio_name', { required: 'Studio name is required' })}
                error={errors.studio_name?.message || ''}
                maxLength={35}
                helperText="Your studio or business name"
                placeholder="e.g., Smith Studios"
              />

            <div>
              <Input
                  label="Short About *"
                  {...register('short_about', { required: 'Short description is required' })}
                  error={errors.short_about?.message || ''}
                  maxLength={150}
                  helperText="Brief description shown in listings"
                  placeholder="e.g., Professional recording studio in London"
                />
            </div>

            <div>
                <Textarea
                  label="Full About *"
                  {...register('about', { required: 'Full description is required' })}
                  error={errors.about?.message || ''}
                  rows={6}
                  maxLength={1200}
                  helperText="Detailed description for your profile page"
                  placeholder="Tell voice artists about your studio, equipment, experience..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Studio Types *
              </label>
                <div className="grid grid-cols-3 gap-3">
                  {STUDIO_TYPES.map((type) => (
                    <div key={type.value} className="relative group">
                      <Checkbox
                        label={type.label}
                        checked={studioTypes.includes(type.value)}
                        onChange={() => toggleStudioType(type.value)}
                      />
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none">
                        {type.description}
                      </div>
                    </div>
                  ))}
              </div>
                {studioTypes.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">Select at least one type</p>
              )}
            </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Location</h3>
              
              <AddressAutocomplete
                label="Full Address *"
                value={watch('full_address') || ''}
                onChange={(value) => {
                  setValue('full_address', value);
                  setValue('abbreviated_address', value);
                  setValue('city', extractCity(value));
                }}
                placeholder="Start typing your full address..."
                helperText="Complete address used for map coordinates"
              />

              <Input
                label="Abbreviated Address"
                {...register('abbreviated_address')}
                placeholder="e.g., London, UK"
                helperText="Shortened address shown publicly"
              />

              <Input
                label="City"
                {...register('city')}
                placeholder="Auto-filled from address"
                helperText="Auto-populated from full address"
              />

              <CountryAutocomplete
                label="Country *"
                value={watch('location') || ''}
                onChange={(value) => setValue('location', value)}
                placeholder="e.g., United Kingdom"
                helperText="Your primary country of operation"
              />
            </div>

            {/* Contact & Connection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Contact & Connection Methods</h3>
              
              <Input
                label="Website URL *"
                type="url"
                {...register('website_url', { required: 'Website URL is required' })}
                error={errors.website_url?.message || ''}
                placeholder="https://yourstudio.com"
              />

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Connection Methods * (Select all that apply)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CONNECTION_TYPES.map((connection) => (
                    <label
                      key={connection.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={connections[connection.id] || false}
                        onChange={() => toggleConnection(connection.id)}
                        className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {connection.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Studio Images *</h3>
              <p className="text-sm text-gray-600">Upload 1-5 images of your studio</p>
              
              {images.length < 5 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                          {uploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            'Upload Image'
                          )}
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="hidden"
                        />
              </label>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      PNG, JPG, WEBP up to 5MB
                    </p>
                  </div>
                </div>
              )}

              {images.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={image.url}
                        alt={`Studio image ${index + 1}`}
                        className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                      >
                        <X className="w-4 h-4" />
                </button>
              </div>
                  ))}
                </div>
              )}

              {images.length === 0 && (
                <p className="text-sm text-red-600">At least 1 image is required</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t">
            <Button
              type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-lg font-semibold"
              loading={isLoading}
                disabled={isLoading || uploading}
            >
                Create My Profile!
            </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
