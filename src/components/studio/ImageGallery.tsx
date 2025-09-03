'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2, Edit2, Move, Image as ImageIcon } from 'lucide-react';

interface ImageItem {
  id: string;
  url: string;
  altText?: string;
  sortOrder: number;
}

interface ImageGalleryProps {
  images: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
  maxImages?: number;
  isEditing?: boolean;
}

export function ImageGallery({ 
  images, 
  onImagesChange, 
  maxImages = 10, 
  isEditing = false 
}: ImageGalleryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newImage, setNewImage] = useState({ url: '', altText: '' });
  const [showAddForm, setShowAddForm] = useState(false);

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

  const addImage = () => {
    if (!newImage.url.trim()) return;

    const newImageItem: ImageItem = {
      id: `temp-${Date.now()}`,
      url: newImage.url,
      altText: newImage.altText,
      sortOrder: images.length,
    };

    onImagesChange([...images, newImageItem]);
    setNewImage({ url: '', altText: '' });
    setShowAddForm(false);
  };

  const removeImage = (id: string) => {
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
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Image
          </Button>
        )}
      </div>

      {/* Add Image Form */}
      {showAddForm && (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="space-y-3">
            <Input
              label="Image URL"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={newImage.url}
              onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
            />
            <Input
              label="Alt Text (optional)"
              placeholder="Describe the image for accessibility"
              value={newImage.altText}
              onChange={(e) => setNewImage({ ...newImage, altText: e.target.value })}
            />
            <div className="flex space-x-2">
              <Button
                type="button"
                size="sm"
                onClick={addImage}
                disabled={!newImage.url.trim()}
              >
                Add Image
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewImage({ url: '', altText: '' });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
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

                        {/* Image */}
                        <div className="aspect-video bg-gray-100 relative">
                          <img
                            src={image.url}
                            alt={image.altText || 'Studio image'}
                            className="w-full h-full object-cover"
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
                        </div>

                        {/* Image Info & Actions */}
                        <div className="p-3">
                          {editingId === image.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={image.altText || ''}
                                onChange={(e) => updateImage(image.id, { altText: e.target.value })}
                                placeholder="Alt text"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                              <div className="flex space-x-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setEditingId(null)}
                                  className="text-xs"
                                >
                                  Save
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
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeImage(image.id)}
                                      className="text-red-600 hover:text-red-700"
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
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Image
            </Button>
          )}
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
        </ul>
      </div>
    </div>
  );
}
