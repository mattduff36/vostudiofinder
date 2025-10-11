'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, X, Edit2, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface StudioImage {
  id: string;
  image_url: string;
  alt_text?: string;
  sort_order: number;
}

export function ImageGalleryManager() {
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
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/profile');
      if (!response.ok) throw new Error('Failed to fetch images');
      
      const data = await response.json();
      setImages(data.data.studio?.images || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    // Check image limit
    if (images.length >= 10) {
      setError('Maximum 10 images allowed');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/user/profile/images', {
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
    newImages.splice(toIndex, 0, movedImage);

    // Update sort orders
    const updatedImages = newImages.map((img, index) => ({
      ...img,
      sort_order: index,
    }));

    setImages(updatedImages);

    try {
      const response = await fetch('/api/user/profile/images/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: updatedImages.map(img => ({
            id: img.id,
            sort_order: img.sort_order,
          })),
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
      const response = await fetch(`/api/user/profile/images/${imageId}`, {
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
      const response = await fetch(`/api/user/profile/images/${imageId}`, {
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-2xl font-bold text-gray-900">Manage Images</h2>
        <p className="text-sm text-gray-600 mt-1">
          Upload and organize your studio images ({images.length}/10)
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Upload Zone */}
      <div className="p-6">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-700">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Drop images here or click to browse
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, WebP up to 5MB (max 10 images)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Image Grid */}
      {images.length > 0 ? (
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragEnter={() => handleDragEnter(index)}
                className={`group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-move ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                <img
                  src={image.image_url}
                  alt={image.alt_text || `Studio image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Sort Order Badge */}
                <div className="absolute top-2 left-2 w-7 h-7 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                  {index + 1}
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleEditAltText(image)}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                    title="Edit alt text"
                  >
                    <Edit2 className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={() => handleDelete(image.id)}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
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

          <p className="text-xs text-gray-500 mt-4">
            💡 Tip: Drag and drop images to reorder them. The first image is your featured image.
          </p>
        </div>
      ) : (
        <div className="px-6 pb-6 text-center">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-3" />
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

