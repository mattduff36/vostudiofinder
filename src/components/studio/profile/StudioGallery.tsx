'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface StudioGalleryProps {
  images: Array<{
    id: string;
    imageUrl: string;
    alt_text?: string;
    sort_order: number;
  }>;
}

export function StudioGallery({ images }: StudioGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  if (images.length === 0) return null;

  const openLightbox = (index: number) => {
    setSelectedImage(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (selectedImage !== null) {
      setSelectedImage(selectedImage === 0 ? images.length - 1 : selectedImage - 1);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">Studio Gallery</h3>
        
        {/* Main Image */}
        <div className="mb-4">
          <div
            className="aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer"
            onClick={() => openLightbox(0)}
          >
            <img
              src={images[0]?.imageUrl}
              alt={images[0]?.alt_text || 'Studio image'}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>

        {/* Thumbnail Grid */}
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {images.slice(1, 5).map((image, index) => (
              <div
                key={image.id}
                className="aspect-square bg-gray-200 rounded cursor-pointer overflow-hidden"
                onClick={() => openLightbox(index + 1)}
              >
                <img
                  src={image.imageUrl}
                  alt={image.alt_text || 'Studio image'}
                  className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                />
              </div>
            ))}
            
            {/* Show more indicator */}
            {images.length > 5 && (
              <div
                className="aspect-square bg-black/50 rounded cursor-pointer flex items-center justify-center text-white font-medium"
                onClick={() => openLightbox(5)}
              >
                +{images.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedImage !== null && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="relative max-w-7xl max-h-full p-4">
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Image */}
            <img
              src={images[selectedImage]?.imageUrl}
              alt={images[selectedImage]?.alt_text || 'Studio image'}
              className="max-w-full max-h-full object-contain"
            />

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {selectedImage + 1} of {images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
