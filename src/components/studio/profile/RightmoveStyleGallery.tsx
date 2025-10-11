'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Camera } from 'lucide-react';

interface RightmoveStyleGalleryProps {
  studio_images: Array<{
    id: string;
    imageUrl: string;
    alt_text?: string;
    sort_order: number;
  }>;
}

export function RightmoveStyleGallery({ studio_images }: RightmoveStyleGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  if (studio_images.length === 0) return null;

  const openLightbox = (index: number) => {
    setSelectedImage(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage + 1) % studio_images.length);
    }
  };

  const prevImage = () => {
    if (selectedImage !== null) {
      setSelectedImage(selectedImage === 0 ? studio_images.length - 1 : selectedImage - 1);
    }
  };

  return (
    <div className="w-full overflow-hidden">
      {/* Rightmove-style image grid */}
      <div className="grid grid-cols-3 gap-0 h-[400px]">
        {/* Main large image - takes up 2/3 width */}
        <div className="col-span-2 relative group cursor-pointer" onClick={() => openLightbox(0)}>
          <img
            src={studio_images[0]?.imageUrl}
            alt={studio_images[0]?.alt_text || 'Studio main image'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Image counter overlay - positioned like Rightmove */}
          <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-sm font-medium flex items-center">
            <Camera className="w-4 h-4 mr-1" />
            1/{studio_images.length}
          </div>
        </div>

        {/* Right column - two smaller images stacked */}
        <div className="col-span-1 flex flex-col">
          {/* Top right image */}
          {studio_images[1] && (
            <div className="flex-1 relative group cursor-pointer" onClick={() => openLightbox(1)}>
              <img
                src={studio_images[1].imageUrl}
                alt={studio_images[1].alt_text || 'Studio image'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          )}

          {/* Bottom right image */}
          {studio_images[2] ? (
            <div className="flex-1 relative group cursor-pointer" onClick={() => openLightbox(2)}>
              <img
                src={studio_images[2].imageUrl}
                alt={studio_images[2].alt_text || 'Studio image'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              
              {/* Show more images overlay if there are more than 3 */}
              {studio_images.length > 3 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">
                  +{studio_images.length - 3} more
                </div>
              )}
            </div>
          ) : (
            // Placeholder if only 2 images
            <div className="flex-1 bg-gray-200 flex items-center justify-center text-gray-500">
              <Camera className="w-8 h-8" />
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage !== null && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
          <div className="relative max-w-7xl max-h-full p-4">
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation */}
            {studio_images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Image */}
            <img
              src={studio_images[selectedImage]?.imageUrl}
              alt={studio_images[selectedImage]?.alt_text || 'Studio image'}
              className="max-w-full max-h-full object-contain"
            />

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
              {selectedImage + 1} of {studio_images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
