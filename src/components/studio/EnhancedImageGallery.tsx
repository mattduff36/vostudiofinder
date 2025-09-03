'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';
import { Plus, Trash2, Edit2, Move, Image as ImageIcon, Eye } from 'lucide-react';

interface ImageItem {
  id: string;
  url: string;
  altText?: string;
  sortOrder: number;
}

interface EnhancedImageGalleryProps {
  images: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
  maxImages?: number;
  isEditing?: boolean;
  folder?: string;
}

export function EnhancedImageGallery({ 
  images, 
  onImagesChange, 
  maxImages = 10, 
  isEditing = false,
  folder = 'voiceover-studios'
}: EnhancedImageGalleryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    if (!reorderedItem) return;
    
    items.splice(result.destination.index, 0, reorderedItem);

    // Update sort orders
    const updatedItems = items.map((item, index) => ({
      ...item,
      sortOrder: index,
    }));

    onImagesChange(updatedItems);
  };

  const handleFileUpload = async (file: File) => {
    // The actual upload is handled by the FileUpload component
    // We just need to wait for it to complete and then refresh
    return { url: '', id: '' }; // Placeholder return
  };

  const addImageFromUpload = (uploadResult: { url: string; id: string }) => {
    const newImageItem: ImageItem = {
      id: uploadResult.id,
      url: uploadResult.url,
      altText: '',
      sortOrder: images.length,
    };

    onImagesChange([...images, newImageItem]);
  };

  const removeImage = async (id: string) => {
    // Optional: Delete from Cloudinary
    try {
      await fetch('/api/upload/image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: id }),
      });
    } catch (error) {
      console.warn('Failed to delete image from Cloudinary:', error);
    }

    const updatedImages = images
      .filter(img => img.id !== id)
      .map((img, index) => ({ ...img, sortOrder: index }));
    onImagesChange(updatedImages);
  };

  const updateImage = (id: string, updates: Partial<ImageItem>) => {
    const updatedImages = images.map(img =>
      img.id === id ? { ...img, ...updates } : img
    );
    onImagesChange(updatedImages);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-text-primary">
          Studio Images ({images.length}/{maxImages})
        </h3>
        {isEditing && images.length < maxImages && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowUpload(!showUpload)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Images
          </Button>
        )}
      </div>

      {/* File Upload */}
      {showUpload && isEditing && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <FileUpload
            onUpload={handleFileUpload}
            accept="image/*"
            maxSize={5}
            multiple={true}
            folder={folder}
            className="mb-4"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowUpload(false)}
          >
            Close Upload
          </Button>
        </div>
      )}

      {/* Image Gallery */}
      {images.length > 0 ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="images">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {images.map((image, index) => (
                  <Draggable
                    key={image.id}
                    draggableId={image.id}
                    index={index}
                    isDragDisabled={!isEditing}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`relative group bg-white border border-gray-200 rounded-lg overflow-hidden ${
                          snapshot.isDragging ? 'shadow-lg' : ''
                        }`}
                      >
                        {/* Drag Handle */}
                        {isEditing && (
                          <div
                            {...provided.dragHandleProps}
                            className="absolute top-2 left-2 z-10 bg-black/50 text-white p-1 rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Move className="w-4 h-4" />
                          </div>
                        )}

                        {/* Preview Button */}
                        <button
                          type="button"
                          onClick={() => setPreviewImage(image.url)}
                          className="absolute top-2 right-2 z-10 bg-black/50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Image */}
                        <div className="aspect-video bg-gray-100 relative">
                          <img
                            src={image.url}
                            alt={image.altText || 'Studio image'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const placeholder = document.createElement('div');
                                placeholder.className = 'w-full h-full flex items-center justify-center text-gray-400';
                                placeholder.innerHTML = '<svg class="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';
                                parent.appendChild(placeholder);
                              }
                            }}
                          />
                          
                          {/* Primary Badge */}
                          {index === 0 && (
                            <div className="absolute bottom-2 left-2 bg-primary-600 text-white px-2 py-1 text-xs rounded">
                              Main Photo
                            </div>
                          )}
                        </div>

                        {/* Image Info & Actions */}
                        <div className="p-3">
                          {editingId === image.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={image.altText || ''}
                                onChange={(e) => updateImage(image.id, { altText: e.target.value })}
                                placeholder="Add description for accessibility..."
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                autoFocus
                              />
                              <div className="flex space-x-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setEditingId(null)}
                                  className="text-xs"
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingId(null)}
                                  className="text-xs"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-text-secondary truncate">
                                {image.altText || 'No description'}
                              </p>
                              {isEditing && (
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-text-secondary">
                                    Position: {index + 1}
                                  </span>
                                  <div className="flex space-x-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditingId(image.id)}
                                      title="Edit description"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeImage(image.id)}
                                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                                      title="Delete image"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Images Yet</h3>
          <p className="text-text-secondary mb-4">
            Add images to showcase your studio space and equipment
          </p>
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUpload(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Your First Images
            </Button>
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Usage Tips */}
      <div className="text-sm text-text-secondary bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Image Tips:</h4>
        <ul className="space-y-1 text-blue-800">
          <li>• Use high-quality images (minimum 800x600 pixels)</li>
          <li>• Show your studio space, equipment, and atmosphere</li>
          <li>• Add descriptive alt text for better accessibility</li>
          <li>• Drag and drop to reorder images</li>
          <li>• The first image will be used as your main studio photo</li>
          <li>• Images are automatically optimized and compressed</li>
        </ul>
      </div>
    </div>
  );
}
