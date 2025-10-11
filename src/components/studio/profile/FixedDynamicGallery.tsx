'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Camera } from 'lucide-react';

interface FixedDynamicGalleryProps {
  studio_images: Array<{
    id: string;
    imageUrl: string;
    alt_text?: string;
    sort_order: number;
  }>;
}

export function FixedDynamicGallery({ studio_images }: FixedDynamicGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  if (studio_images.length === 0) return null;

  // Simple logic: if we have 5+ images total (1 main + 4 in grid), use 2x2, otherwise use 2x1
  const use2x2Layout = studio_images.length >= 5;
  console.log(`Selected ${use2x2Layout ? '2x2' : '2x1'} layout - ${studio_images.length} images available`);

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

        {/* Right column - dynamic layout */}
        <div className="col-span-1 flex flex-col">
          {use2x2Layout ? (
            // 2x2 Layout - 4 images in a 2x2 grid
            <>
              {/* Top row - 2 images side by side */}
              <div className="flex-1 flex">
                {studio_images[1] && (
                  <div className="flex-1 relative group cursor-pointer" onClick={() => openLightbox(1)}>
                    <img
                      src={studio_images[1].imageUrl}
                      alt={studio_images[1].alt_text || 'Studio image'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                {studio_images[2] && (
                  <div className="flex-1 relative group cursor-pointer" onClick={() => openLightbox(2)}>
                    <img
                      src={studio_images[2].imageUrl}
                      alt={studio_images[2].alt_text || 'Studio image'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
              </div>
              
              {/* Bottom row - 2 images side by side */}
              <div className="flex-1 flex">
                {studio_images[3] && (
                  <div className="flex-1 relative group cursor-pointer" onClick={() => openLightbox(3)}>
                    <img
                      src={studio_images[3].imageUrl}
                      alt={studio_images[3].alt_text || 'Studio image'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                {studio_images[4] ? (
                  <div className="flex-1 relative group cursor-pointer" onClick={() => openLightbox(4)}>
                    <img
                      src={studio_images[4].imageUrl}
                      alt={studio_images[4].alt_text || 'Studio image'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    
                    {/* Show more images overlay if there are more than 5 */}
                    {studio_images.length > 5 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">
                        +{studio_images.length - 5} more
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
              src={studio_images[selectedImage]?.imageUrl}
              alt={studio_images[selectedImage]?.alt_text || 'Studio image'}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-lg">
            {selectedImage + 1} / {studio_images.length}
          </div>
        </div>
      )}
    </div>
  );
}