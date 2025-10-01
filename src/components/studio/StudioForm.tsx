'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createStudioSchema, type CreateStudioInput } from '@/lib/validations/studio';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FileUpload } from '@/components/ui/FileUpload';
import { StudioType, ServiceType } from '@prisma/client';
import { MapPin, Globe, Phone, Trash2, Upload } from 'lucide-react';

interface StudioFormProps {
  initialData?: Partial<CreateStudioInput> & {
    owner?: {
      username: string;
    };
  };
  isEditing?: boolean;
}

export function StudioForm({ initialData, isEditing = false }: StudioFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateStudioInput>({
    resolver: zodResolver(createStudioSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      studioTypes: initialData?.studioTypes || [StudioType.RECORDING],
      address: initialData?.address || '',
      websiteUrl: initialData?.websiteUrl || '',
      phone: initialData?.phone || '',
      services: initialData?.services || [],
      images: initialData?.images || [],
    },
  });

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
    control,
    name: 'images',
  });

  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'voiceover-studios');

    const response = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();
    
    // Add the uploaded image to the form
    appendImage({ 
      url: result.image.url, 
      altText: `Studio image ${imageFields.length + 1}` 
    });

    return { url: result.image.url, id: result.image.id };
  };

  const onSubmit = async (data: CreateStudioInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = isEditing ? '/api/studio/update' : '/api/studio/create';
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save studio');
      }

      // Redirect to studio profile or management page
      if (isEditing) {
        // For editing, redirect back to the profile page
        router.push(`/${initialData?.owner?.username || result.studio.owner?.username}`);
      } else {
        // For creation, redirect to the new studio profile
        router.push(`/${result.studio.owner?.username}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const studioTypeOptions = [
    { value: StudioType.VOICEOVER, label: 'Voiceover Studio' },
    { value: StudioType.RECORDING, label: 'Recording Studio' },
    { value: StudioType.PODCAST, label: 'Podcast Studio' },
  ];

  const serviceOptions = [
    { value: ServiceType.ISDN, label: 'ISDN' },
    { value: ServiceType.SOURCE_CONNECT, label: 'Source Connect' },
    { value: ServiceType.SOURCE_CONNECT_NOW, label: 'Source Connect Now' },
    { value: ServiceType.CLEANFEED, label: 'Cleanfeed' },
    { value: ServiceType.SESSION_LINK_PRO, label: 'Session Link Pro' },
    { value: ServiceType.ZOOM, label: 'Zoom' },
    { value: ServiceType.SKYPE, label: 'Skype' },
    { value: ServiceType.TEAMS, label: 'Microsoft Teams' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-text-primary">
            {isEditing ? 'Edit Studio Profile' : 'Create Studio Profile'}
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            {isEditing ? 'Update your studio information' : 'Add your studio to VoiceoverStudioFinder'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-text-primary border-b pb-2">
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Studio Name"
                placeholder="Enter your studio name"
                error={errors.name?.message || ''}
                {...register('name')}
              />

              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Studio Types
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {studioTypeOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        value={option.value}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        {...register('studioTypes')}
                      />
                      <span className="text-sm text-text-primary">{option.label}</span>
                    </label>
                  ))}
                </div>
                {errors.studioTypes && (
                  <p className="mt-1 text-sm text-red-600">{errors.studioTypes.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Description
              </label>
              <textarea
                rows={4}
                className="flex w-full rounded-md border border-form-border bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-form-focus"
                placeholder="Describe your studio, equipment, and services..."
                {...register('description')}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Location & Contact */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-text-primary border-b pb-2">
              Location & Contact
            </h3>

            <div className="relative">
              <Input
                label="Address"
                placeholder="Enter your studio address"
                error={errors.address?.message || ''}
                {...register('address')}
              />
              <MapPin className="absolute right-3 top-9 h-5 w-5 text-text-secondary" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <Input
                  label="Website (optional)"
                  type="url"
                  placeholder="https://yourstudio.com"
                  error={errors.websiteUrl?.message || ''}
                  {...register('websiteUrl')}
                />
                <Globe className="absolute right-3 top-9 h-5 w-5 text-text-secondary" />
              </div>

              <div className="relative">
                <Input
                  label="Phone (optional)"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  error={errors.phone?.message || ''}
                  {...register('phone')}
                />
                <Phone className="absolute right-3 top-9 h-5 w-5 text-text-secondary" />
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-text-primary border-b pb-2">
              Services & Equipment
            </h3>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                Available Services
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {serviceOptions.map((service) => (
                  <label
                    key={service.value}
                    className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      value={service.value}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      {...register('services')}
                    />
                    <span className="text-sm text-text-primary">{service.label}</span>
                  </label>
                ))}
              </div>
              {errors.services && (
                <p className="mt-1 text-sm text-red-600">{errors.services.message}</p>
              )}
            </div>
          </div>

          {/* Images */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-text-primary border-b pb-2 flex-1">
                Studio Images
              </h3>
            </div>

            {/* Image Upload */}
            {imageFields.length < 10 && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <FileUpload
                      onUpload={handleImageUpload}
                      accept="image/*"
                      maxSize={5}
                      multiple={false}
                      folder="voiceover-studios"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Upload high-quality images of your studio (up to 5MB each)
                  </p>
                </div>
              </div>
            )}

            {/* Uploaded Images Display */}
            {imageFields.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-md font-medium text-text-primary">
                  Uploaded Images ({imageFields.length}/10)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {imageFields.map((field, index) => (
                    <div key={field.id} className="relative group border border-gray-200 rounded-lg overflow-hidden">
                      <div className="aspect-w-16 aspect-h-12">
                        <img
                          src={field.url}
                          alt={field.altText || `Studio image ${index + 1}`}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <div className="p-3">
                        <Input
                          label="Alt Text (optional)"
                          placeholder="Describe this image"
                          {...register(`images.${index}.altText`)}
                          className="text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-sm text-text-secondary bg-blue-50 p-4 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-2">Image Guidelines:</h5>
              <ul className="space-y-1 text-blue-800">
                <li>• Add up to 10 high-quality images of your studio</li>
                <li>• Use images that showcase your equipment, space, and atmosphere</li>
                <li>• Recommended minimum size: 800x600 pixels</li>
                <li>• Supported formats: JPEG, PNG, WebP (max 5MB each)</li>
              </ul>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isLoading}
              disabled={isLoading}
            >
              {isEditing ? 'Update Studio' : 'Create Studio'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
