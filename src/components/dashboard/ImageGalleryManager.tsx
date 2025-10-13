'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Edit2, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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

export function ImageGalleryManager({ studioId, isAdminMode = false }: ImageGalleryManagerProps = {}) {
  const [images, setImages] = useState<StudioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editAltText, setEditAltText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    // Validate file type - only allow specific formats
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

    // Check image limit - now 5 max
    if (images.length >= 5) {
      setError('Maximum of 5 images reached');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const endpoint = isAdminMode && studioId
        ? `/api/admin/studios/${studioId}/images`
        : '/api/user/profile/images';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const result = await response.json();
      setImages([...images, result.data]);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
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

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageIds: updatedImages.map(img => img.id),
        }),
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

  return (
    <div className={isAdminMode ? "" : "bg-white rounded-lg border border-gray-200 shadow-sm"}>
      {/* Header - Hidden in admin mode */}
      {!isAdminMode && (
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-900">Manage Images</h2>
          <p className="text-sm text-gray-600 mt-1">
            Upload and organize your studio images ({images.length}/5)
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={`bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 ${isAdminMode ? 'mb-4' : 'mx-6 mt-4'}`}>
          {error}
        </div>
      )}

      {/* Upload Zone */}
      <div className={isAdminMode ? "mb-4" : "p-6"}>
        {images.length >= 5 ? (
          <div className={`border-2 border-gray-300 rounded-lg text-center bg-gray-50 ${
            isAdminMode ? 'p-4' : 'p-8'
          }`}>
            <div className="flex flex-col items-center">
              <ImageIcon className={`text-gray-400 ${isAdminMode ? 'w-8 h-8 mb-2' : 'w-12 h-12 mb-3'}`} />
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
              isAdminMode ? 'p-4' : 'p-8'
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
                <Loader2 className={`text-red-600 animate-spin ${isAdminMode ? 'w-8 h-8 mb-2' : 'w-12 h-12 mb-3'}`} />
                <p className="text-sm font-medium text-gray-700">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className={`text-gray-400 ${isAdminMode ? 'w-8 h-8 mb-2' : 'w-12 h-12 mb-3'}`} />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Drop images here or click to browse
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, WebP up to 5MB (max 5 images)
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 ? (
        <div className={isAdminMode ? "" : "px-6 pb-6"}>
          <div className={`grid gap-3 ${isAdminMode ? 'grid-cols-3 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragEnter={() => handleDragEnter(index)}
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
                    <span>⭐</span>
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
              </div>
            ))}
          </div>

          {!isAdminMode && (
            <p className="text-xs text-gray-500 mt-4">
              💡 Tip: Drag and drop images to reorder them. The first image is your featured image.
            </p>
          )}
        </div>
      ) : (
        <div className={`text-center ${isAdminMode ? '' : 'px-6 pb-6'}`}>
          <ImageIcon className={`text-gray-300 mx-auto mb-3 ${isAdminMode ? 'w-12 h-12' : 'w-16 h-16'}`} />
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
    </div>
  );
}

