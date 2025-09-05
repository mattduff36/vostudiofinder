'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Camera } from 'lucide-react';

interface FixedDynamicGalleryProps {
  images: Array<{
    id: string;
    imageUrl: string;
    altText?: string;
    sortOrder: number;
  }>;
}

export function FixedDynamicGallery({ images }: FixedDynamicGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  if (images.length === 0) return null;

  // Simple logic: if we have 5+ images total (1 main + 4 in grid), use 2x2, otherwise use 2x1
  const use2x2Layout = images.length >= 5;
  console.log(`Selected ${use2x2Layout ? '2x2' : '2x1'} layout - ${images.length} images available`);

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
    <div className="w-full overflow-hidden">
      {/* Rightmove-style image grid */}
      <div className="grid grid-cols-3 gap-0 h-[400px]">
        {/* Main large image - takes up 2/3 width */}
        <div className="col-span-2 relative group cursor-pointer" onClick={() => openLightbox(0)}>
          <img
            src={images[0]?.imageUrl}
            alt={images[0]?.altText || 'Studio main image'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Image counter overlay - positioned like Rightmove */}
          <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-sm font-medium flex items-center">
            <Camera className="w-4 h-4 mr-1" />
            1/{images.length}
          </div>
        </div>

        {/* Right column - dynamic layout */}
        <div className="col-span-1 flex flex-col">
          {use2x2Layout ? (
            // 2x2 Layout - 4 images in a 2x2 grid
            <>
              {/* Top row - 2 images side by side */}
              <div className="flex-1 flex">
                {images[1] && (
                  <div className="flex-1 relative group cursor-pointer" onClick={() => openLightbox(1)}>
                    <img
                      src={images[1].imageUrl}
                      alt={images[1].altText || 'Studio image'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                {images[2] && (
                  <div className="flex-1 relative group cursor-pointer" onClick={() => openLightbox(2)}>
                    <img
                      src={images[2].imageUrl}
                      alt={images[2].altText || 'Studio image'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
              </div>
              
              {/* Bottom row - 2 images side by side */}
              <div className="flex-1 flex">
                {images[3] && (
                  <div className="flex-1 relative group cursor-pointer" onClick={() => openLightbox(3)}>
                    <img
                      src={images[3].imageUrl}
                      alt={images[3].altText || 'Studio image'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                {images[4] ? (
                  <div className="flex-1 relative group cursor-pointer" onClick={() => openLightbox(4)}>
                    <img
                      src={images[4].imageUrl}
                      alt={images[4].altText || 'Studio image'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    
                    {/* Show more images overlay if there are more than 5 */}
                    {images.length > 5 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">
                        +{images.length - 5} more
                      </div>
                    )}
                  </div>
                ) : (
                  // Placeholder if only 4 images
                  <div className="flex-1 bg-gray-200 flex items-center justify-center text-gray-500">
                    <Camera className="w-8 h-8" />
                  </div>
                )}
              </div>
            </>
          ) : (
            // 2x1 Layout - 2 images stacked vertically (original Rightmove style)
            <>
              {/* Top right image */}
              {images[1] && (
                <div className="flex-1 relative group cursor-pointer" onClick={() => openLightbox(1)}>
                  <img
                    src={images[1].imageUrl}
                    alt={images[1].altText || 'Studio image'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}

              {/* Bottom right image */}
              {images[2] ? (
                <div className="flex-1 relative group cursor-pointer" onClick={() => openLightbox(2)}>
                  <img
                    src={images[2].imageUrl}
                    alt={images[2].altText || 'Studio image'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  
                  {/* Show more images overlay if there are more than 3 */}
                  {images.length > 3 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">
                      +{images.length - 3} more
                    </div>
                  )}
                </div>
              ) : (
                // Placeholder if only 2 images
                <div className="flex-1 bg-gray-200 flex items-center justify-center text-gray-500">
                  <Camera className="w-8 h-8" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage !== null && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="w-8 h-8" />
          </button>
          
          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
          >
            <ChevronLeft className="w-12 h-12" />
          </button>
          
          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
          >
            <ChevronRight className="w-12 h-12" />
          </button>

          <div className="max-w-4xl max-h-full p-4">
            <img
              src={images[selectedImage]?.imageUrl}
              alt={images[selectedImage]?.altText || 'Studio image'}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-lg">
            {selectedImage + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}