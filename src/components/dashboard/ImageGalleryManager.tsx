'use client';
import { logger } from '@/lib/logger';

import { useState, useEffect, useRef } from 'react';
import { Upload, Edit2, Trash2, Loader2, Image as ImageIcon, ChevronUp, ChevronDown, Star, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ImageCropperModal } from '@/components/images/ImageCropperModal';
import { ProgressIndicators } from '@/components/dashboard/ProgressIndicators';
import { calculateCompletionStats, type CompletionStats } from '@/lib/utils/profile-completion';

interface StudioImage {
  id: string;
  image_url: string;
  alt_text?: string;
  sort_order: number;
}

interface ImageGalleryManagerProps {
  studioId?: string; // Optional: for admin mode
  isAdminMode?: boolean; // Optional: to use admin API endpoints
}

export function ImageGalleryManager({ 
  studioId, 
  isAdminMode = false
}: ImageGalleryManagerProps = {}) {
  const [images, setImages] = useState<StudioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editAltText, setEditAltText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Cropper state
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  
  // Profile data for completion calculation
  const [profileData, setProfileData] = useState<any>(null);
  
  // Calculate completion stats
  const completionStats: CompletionStats | null = profileData ? calculateCompletionStats({
    user: {
      username: profileData.user.username,
      display_name: profileData.user.display_name,
      avatar_url: profileData.user.avatar_url || null,
      email: profileData.user.email,
    },
    profile: profileData.profile,
    studio: {
      name: profileData.studio?.name || null,
      studio_types: profileData.studio?.studio_types || [], // FIX: Access from studio object
      images: profileData.studio?.images || [],
      website_url: profileData.studio?.website_url || null,
    },
  }) : null;

  useEffect(() => {
    fetchImages();
  }, [studioId, isAdminMode]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const endpoint = isAdminMode && studioId 
        ? `/api/admin/studios/${studioId}`
        : '/api/user/profile';
        
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch images');
      
      const data = await response.json();
      const imageData = isAdminMode 
        ? data.profile?.images || []
        : data.data.studio?.images || [];
      setImages(imageData);
      
      // Store full profile data for completion stats (only for non-admin mode)
      if (!isAdminMode && data.data) {
        setProfileData(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file) return;
    
    logger.log('🖼️ Image Upload Debug - File Selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeKB: (file.size / 1024).toFixed(2) + ' KB',
      sizeMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      isAdminMode,
      studioId,
      currentImageCount: images.length
    });
    
    // Validate file type - only allow specific formats
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      logger.error('❌ Invalid file type:', file.type);
      setError('Please select a valid image file (.png, .jpg, .webp)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      logger.error('❌ File too large:', file.size, 'bytes');
      setError('Image size must be less than 5MB');
      return;
    }

    // Check image limit - now 5 max
    if (images.length >= 5) {
      logger.error('❌ Maximum images reached:', images.length);
      setError('Maximum of 5 images reached');
      return;
    }

    // Open the cropper modal instead of uploading directly
    setError(null);
    setFileToCrop(file);
    setIsCropperOpen(true);
  };

  const handleCropConfirm = async (croppedFile: File) => {
    try {
      setUploading(true);
      setIsCropperOpen(false);
      setError(null);

      const formData = new FormData();
      formData.append('file', croppedFile);

      const endpoint = isAdminMode && studioId
        ? `/api/admin/studios/${studioId}/images`
        : '/api/user/profile/images';

      logger.log('📤 Uploading cropped image to endpoint:', endpoint);
      logger.log('📦 FormData contents:', {
        hasFile: formData.has('file'),
        fileSize: croppedFile.size
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      logger.log('📥 Upload response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('❌ Upload failed - Server error:', {
          status: response.status,
          error: errorData.error,
          details: errorData.details,
          fullResponse: errorData
        });
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const result = await response.json();
      logger.log('✅ Upload successful:', result);
      setImages([...images, result.data]);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Reset cropper state
      setFileToCrop(null);
    } catch (err) {
      logger.error('❌ Upload error caught:', err);
      if (err instanceof Error) {
        logger.error('Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      }
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    if (!movedImage) return;
    newImages.splice(toIndex, 0, movedImage);

    // Update sort orders
    const updatedImages = newImages.map((img, index) => ({
      ...img,
      sort_order: index,
    }));

    setImages(updatedImages);

    try {
      const endpoint = isAdminMode && studioId
        ? `/api/admin/studios/${studioId}/images/reorder`
        : '/api/user/profile/images/reorder';

      // Admin endpoint expects imageIds array, user endpoint expects images array with sort_order
      const requestBody = isAdminMode
        ? { imageIds: updatedImages.map(img => img.id) }
        : { images: updatedImages.map(img => ({ id: img.id, sort_order: img.sort_order })) };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error('Failed to reorder images');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder images');
      // Revert on error
      fetchImages();
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    handleReorder(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleEditAltText = (image: StudioImage) => {
    setEditingImageId(image.id);
    setEditAltText(image.alt_text || '');
  };

  const handleSaveAltText = async (imageId: string) => {
    try {
      const endpoint = isAdminMode && studioId
        ? `/api/admin/studios/${studioId}/images/${imageId}`
        : `/api/user/profile/images/${imageId}`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alt_text: editAltText }),
      });

      if (!response.ok) throw new Error('Failed to update image');

      setImages(images.map(img => 
        img.id === imageId ? { ...img, alt_text: editAltText } : img
      ));
      setEditingImageId(null);
      setEditAltText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update image');
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const endpoint = isAdminMode && studioId
        ? `/api/admin/studios/${studioId}/images/${imageId}`
        : `/api/user/profile/images/${imageId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete image');

      setImages(images.filter(img => img.id !== imageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Use motion wrapper only for desktop, keep original div for mobile
  const Container = !isAdminMode 
    ? motion.div 
    : 'div' as any;
  
  const containerProps = !isAdminMode 
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: 'easeOut' }
      }
    : {};

  return (
    <Container 
      {...containerProps}
      className={isAdminMode ? "" : "bg-white rounded-lg border border-gray-200 shadow-sm md:bg-white/95 md:backdrop-blur-md md:rounded-2xl md:border-gray-100 md:shadow-2xl"}
    >
      {/* Header - Hidden in admin mode */}
      {!isAdminMode && (
        <div className="border-b border-gray-200 px-4 md:px-6 py-4 md:py-5 md:border-gray-100 md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl md:font-extrabold md:tracking-tight">Manage Images</h2>
            <p className="text-sm text-gray-600 mt-1 md:text-base">
              Upload and organise your studio images ({images.length}/5)
            </p>
          </div>

          {/* Progress Indicators */}
          {completionStats && (
            <div className="hidden md:flex flex-shrink-0">
              <ProgressIndicators
                requiredFieldsCompleted={completionStats.required.completed}
                totalRequiredFields={completionStats.required.total}
                overallCompletionPercentage={completionStats.overall.percentage}
                variant="compact"
              />
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={`bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 ${isAdminMode ? 'mb-4' : 'mx-4 md:mx-6 mt-4'}`}>
          {error}
        </div>
      )}

      {/* Upload Zone */}
      <div className={isAdminMode ? "mb-4" : "p-4 md:p-6"}>
        {images.length >= 5 ? (
          <div className={`border-2 border-gray-300 rounded-lg text-center bg-gray-50 ${
            isAdminMode ? 'p-4' : 'p-6 md:p-8'
          }`}>
            <div className="flex flex-col items-center">
              <ImageIcon className={`text-gray-400 ${isAdminMode ? 'w-8 h-8 mb-2' : 'w-10 md:w-12 h-10 md:h-12 mb-3'}`} />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Maximum of 5 images reached
              </p>
              <p className="text-xs text-gray-500">
                Delete an image to upload a new one
              </p>
            </div>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-red-500 transition-colors cursor-pointer ${
              isAdminMode ? 'p-4' : 'p-6 md:p-8'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            
            {uploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className={`text-red-600 animate-spin ${isAdminMode ? 'w-8 h-8 mb-2' : 'w-10 md:w-12 h-10 md:h-12 mb-3'}`} />
                <p className="text-sm font-medium text-gray-700">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className={`text-gray-400 ${isAdminMode ? 'w-8 h-8 mb-2' : 'w-10 md:w-12 h-10 md:h-12 mb-3'}`} />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  {isMobile ? 'Tap to upload image' : 'Drop images here or click to browse'}
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, WebP up to 5MB (max 5 images)
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Grid - Desktop: Grid with drag-and-drop, Mobile: Card list with buttons */}
      {images.length > 0 ? (
        <div className={isAdminMode ? "" : "px-4 md:px-6 pb-6"}>
          {/* Desktop Grid */}
          <div className={`hidden md:grid gap-3 ${isAdminMode ? 'grid-cols-3 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
            {images.map((image, index) => (
              <motion.div
                key={image.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragEnter={() => handleDragEnter(index)}
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ duration: 0.3 }}
                className={`group relative aspect-[25/12] bg-gray-100 rounded-lg overflow-hidden cursor-move ${
                  draggedIndex === index ? 'opacity-50' : ''
                } ${index === 0 ? 'ring-2 ring-[#d42027]' : ''}`}
              >
                <img
                  src={image.image_url}
                  alt={image.alt_text || `Studio image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Featured Badge for first image */}
                {index === 0 && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-[#d42027] text-white text-xs font-bold rounded shadow-lg flex items-center gap-1">
                    <Star className="w-3 h-3" aria-hidden="true" />
                    <span>Featured</span>
                  </div>
                )}
                
                {/* Sort Order Badge */}
                {index > 0 && (
                  <div className="absolute top-2 left-2 w-7 h-7 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                    {index + 1}
                  </div>
                )}

                {/* Action Buttons - Always Visible */}
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => handleEditAltText(image)}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-lg"
                    title="Edit alt text"
                  >
                    <Edit2 className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={() => handleDelete(image.id)}
                    className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors shadow-lg"
                    title="Delete image"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>

                {/* Alt Text Display */}
                {image.alt_text && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white truncate">{image.alt_text}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {images.map((image, index) => (
              <div
                key={image.id}
                className={`bg-white border rounded-lg overflow-hidden shadow-sm ${
                  index === 0 ? 'ring-2 ring-[#d42027]' : 'border-gray-200'
                }`}
              >
                {/* Image Preview */}
                <div className="relative aspect-[25/12] bg-gray-100">
                  <img
                    src={image.image_url}
                    alt={image.alt_text || `Studio image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Featured Badge */}
                  {index === 0 && (
                    <div className="absolute top-3 left-3 px-2.5 py-1.5 bg-[#d42027] text-white text-xs font-bold rounded shadow-lg flex items-center gap-1">
                      <Star className="w-3 h-3" aria-hidden="true" />
                      <span>Featured</span>
                    </div>
                  )}
                  
                  {/* Position Badge */}
                  {index > 0 && (
                    <div className="absolute top-3 left-3 w-8 h-8 bg-red-600 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-lg">
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="p-3 space-y-2">
                  {/* Alt Text Display/Edit */}
                  {image.alt_text && (
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-medium text-gray-500">Alt Text:</span> {image.alt_text}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {/* Reorder Buttons */}
                    <div className="flex gap-1 flex-1">
                      <button
                        onClick={() => handleReorder(index, index - 1)}
                        disabled={index === 0}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                        <span>Up</span>
                      </button>
                      <button
                        onClick={() => handleReorder(index, index + 1)}
                        disabled={index === images.length - 1}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                        <span>Down</span>
                      </button>
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleEditAltText(image)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      title="Edit alt text"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(image.id)}
                      className="px-4 py-2.5 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 flex gap-2">
              <Lightbulb className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong>Tip:</strong> <span className="hidden md:inline">Drag and drop images to reorder them.</span><span className="md:hidden">Use the up/down buttons to reorder images.</span> The first image is your featured image.<br />
                <span className="text-gray-400">Recommended ratio: 25:12. Example sizes: 2500×1200 or 2000×960. You'll be able to adjust the framing after selecting an image.</span>
              </span>
            </p>
          </div>
        </div>
      ) : (
        <div className={`text-center ${isAdminMode ? '' : 'px-4 md:px-6 pb-6'}`}>
          <ImageIcon className={`text-gray-300 mx-auto mb-3 ${isAdminMode ? 'w-12 h-12' : 'w-14 md:w-16 h-14 md:h-16'}`} />
          <p className="text-gray-500">No images uploaded yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload your first image to get started</p>
        </div>
      )}

      {/* Edit Alt Text Modal */}
      {editingImageId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Alt Text</h3>
            <Input
              label="Alt Text"
              value={editAltText}
              onChange={(e) => setEditAltText(e.target.value)}
              placeholder="Describe this image for accessibility"
              helperText="Help screen readers understand what's in the image"
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingImageId(null);
                  setEditAltText('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => handleSaveAltText(editingImageId)}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      <ImageCropperModal
        file={fileToCrop}
        isOpen={isCropperOpen}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
        aspect={25 / 12}
        maxWidth={2000}
        maxHeight={960}
      />
    </Container>
  );
}
