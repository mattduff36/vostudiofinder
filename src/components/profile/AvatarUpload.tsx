'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AvatarUploadProps {
  currentAvatar?: string | null | undefined;
  onAvatarChange: (url: string) => void;
  size?: 'small' | 'medium' | 'large';
  editable?: boolean;
  userName?: string;
}

export function AvatarUpload({
  currentAvatar,
  onAvatarChange,
  size = 'medium',
  editable = true,
  userName = 'User',
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'avatar');

      // Upload to Cloudinary via our API
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      
      // Update avatar
      onAvatarChange(data.url);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <div
          className={`${sizeClasses[size]} rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 ${
            editable ? 'cursor-pointer' : ''
          } relative`}
          onClick={handleClick}
        >
          {currentAvatar ? (
            <Image
              src={currentAvatar}
              alt={`${userName}'s avatar`}
              fill
              className="object-cover"
              sizes={size === 'small' ? '48px' : size === 'medium' ? '96px' : '128px'}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-1/2 h-1/2 text-gray-400" />
            </div>
          )}

          {/* Overlay on hover for editable */}
          {editable && !isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          {/* Loading overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Hidden file input */}
        {editable && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
        )}
      </div>

      {editable && (
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                {currentAvatar ? 'Change' : 'Upload'} Avatar
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 mt-1">
            Max 5MB • JPG, PNG, GIF
          </p>
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-600 text-center">{uploadError}</p>
      )}
    </div>
  );
}

