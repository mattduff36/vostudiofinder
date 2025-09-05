'use client';

import { useState, useEffect } from 'react';
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

  // Simple logic: if we have 5+ images total (1 main + 4 in grid), use 2x2, otherwise use 2x1
  const use2x2Layout = images.length >= 5;
  const rightImages = use2x2Layout ? images.slice(1, 5) : images.slice(1, 3);
  const remainingCount = Math.max(0, images.length - (rightImages.length + 1));

  // Console log for debugging
  console.log(`Selected ${use2x2Layout ? '2x2' : '2x1'} layout - ${images.length} images available`);

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

        {/* Right column - dynamic layout based on image count */}
        <div className="col-span-1 flex flex-col">
          {use2x2Layout ? (
            // 2x2 Layout - 4 images in a 2x2 grid
            <>
              {/* Top row */}
              <div className="flex-1 flex">
                {rightImages.slice(0, 2).map((image, index) => (
                  <div
                    key={image.id}
                    className="flex-1 relative group cursor-pointer"
                    onClick={() => openLightbox(index + 1)}
                  >
                    <img
                      src={image.imageUrl}
                      alt={image.altText || 'Studio image'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200" />
                  </div>
                ))}
              </div>
              
              {/* Bottom row */}
              <div className="flex-1 flex">
                {rightImages.slice(2, 4).map((image, index) => (
                  <div
                    key={image.id}
                    className="flex-1 relative group cursor-pointer"
                    onClick={() => openLightbox(index + 3)}
                  >
                    <img
                      src={image.imageUrl}
                      alt={image.altText || 'Studio image'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {index === 1 && remainingCount > 0 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">
                        +{remainingCount} more
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            // 2x1 Layout for landscape images
            <>
              {rightImages.map((image, index) => (
                <div
                  key={image.id}
                  className="flex-1 relative group cursor-pointer"
                  onClick={() => openLightbox(index + 1)}
                >
                  <img
                    src={image.imageUrl}
                    alt={image.altText || 'Studio image'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {index === rightImages.length - 1 && remainingCount > 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">
                      +{remainingCount} more
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200" />
                </div>
              ))}
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
            <X size={32} />
          </button>
          
          <button
            onClick={prevImage}
            className="absolute left-4 text-white hover:text-gray-300 z-10"
          >
            <ChevronLeft size={48} />
          </button>
          
          <button
            onClick={nextImage}
            className="absolute right-4 text-white hover:text-gray-300 z-10"
          >
            <ChevronRight size={48} />
          </button>
          
          <img
            src={images[selectedImage]?.imageUrl}
            alt={images[selectedImage]?.altText || 'Studio image'}
            className="max-w-full max-h-full object-contain"
          />
          
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
            {selectedImage + 1} of {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
