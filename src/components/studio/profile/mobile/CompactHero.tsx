/**
 * CompactHero - Mobile-Optimized Profile Hero Section with Auto-Scrolling Carousel
 * 
 * Two-part design:
 * 1. Full-width auto-scrolling image carousel (mobile only)
 * 2. Avatar and basic info section below
 * 
 * Features:
 * - Auto-scrolls every 5 seconds with smooth transitions
 * - Swipeable left/right navigation
 * - Auto-scroll stops permanently after user interaction
 * - Click to open full-screen modal
 * - Only visible on mobile (< 768px)
 */
'use client';

import { useState, useEffect, useRef, TouchEvent } from 'react';
import Image from 'next/image';
import { Check, MapPin } from 'lucide-react';
import { ImageModal } from './ImageModal';

interface CompactHeroProps {
  studioName: string;
  ownerDisplayName: string;
  ownerUsername: string;
  ownerAvatarUrl?: string | undefined;
  studioImages?: Array<{ image_url: string; alt_text?: string }>;
  isVerified: boolean;
  abbreviatedAddress?: string | undefined;
  showAddress?: boolean | null | undefined;
}

export function CompactHero({
  studioName,
  ownerDisplayName,
  ownerAvatarUrl,
  studioImages = [],
  isVerified,
  abbreviatedAddress,
  showAddress = true,
}: CompactHeroProps) {
  const [imageError, setImageError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Touch handling for swipe
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use studio images or fallback to placeholder
  const images = studioImages.length > 0 
    ? studioImages 
    : [{ image_url: '/images/placeholder-studio.jpg', alt_text: studioName }];

  const shouldShowAddress = showAddress !== false;

  // Auto-scroll logic: 8 seconds per image
  useEffect(() => {
    if (isAutoScrollEnabled && images.length > 1) {
      autoScrollTimerRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          if (prevIndex === images.length - 1) {
            return 0; // Loop back to first image
          }
          return prevIndex + 1;
        });
      }, 8000); // 8 seconds per image

      return () => {
        if (autoScrollTimerRef.current) {
          clearInterval(autoScrollTimerRef.current);
        }
      };
    }
  }, [isAutoScrollEnabled, images.length]);

  // Handle swipe gestures
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe || isRightSwipe) {
      // User interacted - stop auto-scroll permanently
      setIsAutoScrollEnabled(false);
      
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }

      if (isLeftSwipe && currentIndex < images.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (isRightSwipe && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }

    // Reset touch positions
    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleImageClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="md:hidden bg-white">
        {/* Hero Image Carousel - Full Width */}
        <div 
          className="relative w-full aspect-[16/9] bg-gray-200 overflow-hidden cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleImageClick}
        >
          {/* Images Container */}
          <div
            className="flex transition-transform duration-500 ease-out h-full"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
            }}
          >
            {images.map((image, index) => (
              <div
                key={index}
                className="relative w-full h-full flex-shrink-0"
              >
                <Image
                  src={image.image_url}
                  alt={image.alt_text || `${studioName} image ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                  sizes="100vw"
                  onError={() => setImageError(true)}
                />
              </div>
            ))}
          </div>

          {/* Dot Indicators - Only show if multiple images */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 z-10">
              {images.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-white w-2 h-2'
                      : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Studio Info Card */}
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-start space-x-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm bg-gray-100">
                {ownerAvatarUrl && !imageError ? (
                  <Image
                    src={ownerAvatarUrl}
                    alt={ownerDisplayName}
                    width={64}
                    height={64}
                    className="object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#d42027] text-white text-xl font-bold">
                    {ownerDisplayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Studio Name & Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-gray-900 font-bold text-lg leading-tight">
                  {studioName}
                </h1>
                {isVerified && (
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 flex-shrink-0 ml-1"
                    title="Verified studio — approved by our team"
                  >
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </span>
                )}
              </div>
              
              {/* Abbreviated Address */}
              {shouldShowAddress && abbreviatedAddress && (
                <div className="flex items-center space-x-1.5 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{abbreviatedAddress}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen Image Modal */}
      <ImageModal
        images={images}
        initialIndex={currentIndex}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
