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
  const [rightColumnLayout, setRightColumnLayout] = useState<'2x1' | '2x2'>('2x1');

  // Analyze images to determine layout
  useEffect(() => {
    if (images.length === 0) return;

    // Simple logic: if we have 4+ images, use 2x2, otherwise use 2x1
    // This avoids the complex image loading that might be causing issues
    if (images.length >= 4) {
      setRightColumnLayout('2x2');
      console.log('Selected 2x2 layout - 4+ images available');
    } else {
      setRightColumnLayout('2x1');
      console.log('Selected 2x1 layout - less than 4 images');
    }
  }, [images]);

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
          {rightColumnLayout === '2x2' ? (
            // 2x2 Layout - 4 images in a 2x2 grid
            <>
              {/* Top row */}
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
              
              {/* Bottom row */}
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
