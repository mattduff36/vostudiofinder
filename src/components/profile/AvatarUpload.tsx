'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Loader2, Upload } from 'lucide-react';
import { ImageCropperModal } from '@/components/images/ImageCropperModal';

interface AvatarUploadProps {
  currentAvatar?: string | null | undefined;
  onAvatarChange: (url: string) => void;
  size?: 'small' | 'medium' | 'large';
  editable?: boolean;
  userName?: string;
  variant?: 'user' | 'admin' | 'profile' | 'light'; // New: determines border color and style
}

export function AvatarUpload({
  currentAvatar,
  onAvatarChange,
  size = 'medium',
  editable = true,
  userName = 'User',
  variant = 'user',
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
  };

  // Border color based on variant
  const borderColorClass = 
    variant === 'admin' ? 'border-gray-900' 
    : variant === 'light' ? 'border-white' 
    : 'border-[#d42027]';
  const hoverBorderColorClass = 
    variant === 'admin' ? 'group-hover:border-gray-700' 
    : variant === 'light' ? 'group-hover:border-gray-100' 
    : 'group-hover:border-[#b91c23]';

  // Treat empty strings as no avatar
  const hasAvatar = currentAvatar && currentAvatar.trim() !== '';

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

    setUploadError(null);

    // Open cropper modal with square aspect ratio
    setFileToCrop(file);
    setIsCropperOpen(true);
  };

  const handleCropConfirm = async (croppedFile: File) => {
    setIsUploading(true);
    setIsCropperOpen(false);
    setUploadError(null);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', croppedFile);
      formData.append('folder', 'voiceover-studios/avatars');

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
      
      // Update avatar (API returns image.url)
      onAvatarChange(data.image.url);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFileToCrop(null);
    }
  };

  const handleCropCancel = () => {
    setIsCropperOpen(false);
    setFileToCrop(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Different rendering for edit pages vs profile display
  if (variant === 'profile') {
    // Avatar for profile display - respects size prop
    const imageSizes = {
      small: '48px',
      medium: '96px',
      large: '128px',
    };
    
    return (
      <div className={`relative ${sizeClasses[size]} rounded-lg overflow-hidden border-2 border-gray-200 flex-shrink-0`}>
        {hasAvatar ? (
          <Image
            key={currentAvatar}
            src={currentAvatar}
            alt={`${userName}'s avatar`}
            fill
            className="object-cover"
            sizes={imageSizes[size]}
            unoptimized={currentAvatar.includes('cloudinary')}
          />
        ) : null}
      </div>
    );
  }

  // Edit mode (user/admin)
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <div
          className={`${sizeClasses[size]} rounded-lg ${
            hasAvatar ? 'overflow-hidden' : 'bg-transparent'
          } border-2 ${borderColorClass} ${hoverBorderColorClass} ${
            editable ? 'cursor-pointer' : ''
          } relative transition-colors`}
          onClick={handleClick}
        >
          {hasAvatar ? (
            <img
              key={currentAvatar}
              src={currentAvatar}
              alt={`${userName}'s avatar`}
              className="absolute inset-0 w-full h-full object-cover z-0"
            />
          ) : (
            // Empty state - just the border box
            <div className="w-full h-full"></div>
          )}

          {/* Hover overlay with Upload button */}
          {editable && !isUploading && (
            <>
              {/* Desktop hover */}
              {hasAvatar ? (
                // Dark overlay for existing avatars - only visible on hover
                <div className="hidden md:flex absolute inset-0 opacity-0 hover:opacity-100 group-hover:opacity-100 bg-black/60 transition-opacity items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Upload className="w-6 h-6" />
                    <span className="text-xs font-medium">Change Avatar</span>
                  </div>
                </div>
              ) : (
                // Empty state - always visible on desktop with subtle background
                <div className="hidden md:flex absolute inset-0 bg-gray-50/50 items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-2 transition-transform group-hover:scale-110">
                    <Upload className={`w-6 h-6 ${
                      variant === 'admin' ? 'text-gray-900' 
                      : variant === 'light' ? 'text-white' 
                      : 'text-[#d42027]'
                    }`} />
                    <span className={`text-xs font-medium ${
                      variant === 'admin' ? 'text-gray-900' 
                      : variant === 'light' ? 'text-white' 
                      : 'text-[#d42027]'
                    }`}>
                      Upload Avatar
                    </span>
                  </div>
                </div>
              )}
              
              {/* Mobile - show button inside avatar box - only for empty state */}
              {!hasAvatar && (
                <div className="md:hidden absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    className={`text-xs px-3 py-1.5 rounded border ${
                      variant === 'admin' 
                        ? 'border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
                        : variant === 'light'
                        ? 'border-white text-white hover:bg-white hover:text-red-600'
                        : 'border-[#d42027] text-[#d42027] hover:bg-[#d42027] hover:text-white'
                    } transition-colors font-medium`}
                    onClick={handleClick}
                  >
                    Upload
                  </button>
                </div>
              )}
            </>
          )}

          {/* Loading overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
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

      {uploadError && (
        <p className="text-xs text-red-600 text-center">{uploadError}</p>
      )}

      {/* Image Cropper Modal - Square aspect ratio for avatars */}
      <ImageCropperModal
        file={fileToCrop}
        isOpen={isCropperOpen}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
        aspect={1}
        maxWidth={800}
        maxHeight={800}
      />
    </div>
  );
}

