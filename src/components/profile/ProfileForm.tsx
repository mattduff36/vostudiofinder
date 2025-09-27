'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validations/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User, Camera, Save, X, LogOut } from 'lucide-react';

interface ProfileFormProps {
  initialData?: {
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  };
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      displayName: initialData?.displayName || session?.user?.displayName || '',
      username: initialData?.username || session?.user?.username || '',
      avatarUrl: initialData?.avatarUrl || session?.user?.avatarUrl || '',
    },
  });

  const onSubmit = async (data: UpdateProfileInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully!');
      
      // Update the session with new data
      await update({
        ...session,
        user: {
          ...session?.user,
          displayName: data.displayName,
          username: data.username,
          avatarUrl: data.avatarUrl || null,
        },
      });

      // Reset form dirty state
      reset(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setError(null);
    setSuccess(null);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div style={{ maxWidth: '768px', margin: '0 auto' }}>
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-text-primary">Profile Settings</h2>
          <p className="text-sm text-text-secondary mt-1">
            Update your personal information and preferences
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {session?.user?.avatarUrl ? (
                  <img
                    src={session.user.avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-text-primary">Profile Photo</h3>
              <p className="text-sm text-text-secondary">
                Update your profile photo by providing an image URL
              </p>
            </div>
            <Button type="button" variant="outline" size="sm">
              <Camera className="w-4 h-4 mr-2" />
              Change
            </Button>
          </div>

          <Input
            label="Avatar URL"
            type="url"
            placeholder="https://example.com/avatar.jpg"
            error={errors.avatarUrl?.message || ''}
            helperText="Enter a URL to your profile image"
            {...register('avatarUrl')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Display Name"
              type="text"
              placeholder="Your full name"
              error={errors.displayName?.message || ''}
              {...register('displayName')}
            />

            <Input
              label="Username"
              type="text"
              placeholder="username"
              error={errors.username?.message || ''}
              helperText="This will be part of your profile URL"
              {...register('username')}
            />
          </div>

          {/* Account Information (Read-only) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                  Email Address
                </label>
                <p className="text-sm text-text-primary">{session?.user?.email}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                  Account Role
                </label>
                <p className="text-sm text-text-primary capitalize">
                  {session?.user?.role?.toLowerCase().replace('_', ' ')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                  Email Verified
                </label>
                <p className="text-sm text-text-primary">
                  {session?.user?.emailVerified ? (
                    <span className="text-green-600">✓ Verified</span>
                  ) : (
                    <span className="text-red-600">✗ Not verified</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={isLoading || !isDirty}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isLoading}
                disabled={isLoading || !isDirty}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
