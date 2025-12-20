/**
 * ImageModal - Full-Screen Image Viewer for Mobile
 * 
 * Features:
 * - Full-screen display with backdrop
 * - Swipe left/right to navigate between images
 * - Pinch-to-zoom functionality
 * - Dot indicators (iPhone style)
 * - Works in portrait and landscape
 * - Easy close button
 */
'use client';

import { useState, useEffect, useRef, TouchEvent } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

interface ImageModalProps {
  images: Array<{ image_url: string; alt_text?: string }>;
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageModal({ images, initialIndex, isOpen, onClose }: ImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  
  // Touch handling for swipe
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  
  // Pinch-to-zoom handling
  const [initialDistance, setInitialDistance] = useState(0);
  const [isPinching, setIsPinching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom when image changes
  useEffect(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, [currentIndex]);

  // Prevent body scroll and hide nav bars when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.classList.add('image-modal-open');
    } else {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('image-modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('image-modal-open');
    };
  }, [isOpen]);

  // Reset to initial index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const handleTouchStart = (e: TouchEvent) => {
    setTouchStartTime(Date.now());
    
    if (e.touches.length === 2) {
      // Pinch zoom start
      setIsPinching(true);
      const distance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      setInitialDistance(distance);
    } else if (e.touches.length === 1 && scale === 1) {
      // Single touch for swiping (only when not zoomed)
      setIsSwiping(true);
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
      setTouchEnd({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && isPinching) {
      // Pinch zoom
      const distance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const newScale = (distance / initialDistance) * scale;
      setScale(Math.min(Math.max(newScale, 1), 4)); // Min 1x, Max 4x
    } else if (e.touches.length === 1 && isSwiping && scale === 1) {
      // Swipe to navigate (only when not zoomed)
      setTouchEnd({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan when zoomed
      const deltaX = e.touches[0].clientX - touchStart.x;
      const deltaY = e.touches[0].clientY - touchStart.y;
      setTranslateX(deltaX);
      setTranslateY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    const touchDuration = Date.now() - touchStartTime;
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // If it was a quick tap (< 300ms) with minimal movement (< 10px), close the modal
    if (touchDuration < 300 && distance < 10 && !isPinching && scale === 1) {
      onClose();
      setIsSwiping(false);
      setIsPinching(false);
      setTouchStart({ x: 0, y: 0 });
      setTouchEnd({ x: 0, y: 0 });
      return;
    }
    
    if (isSwiping && scale === 1) {
      // Horizontal swipe threshold
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0 && currentIndex > 0) {
          // Swipe right - go to previous image
          setCurrentIndex(currentIndex - 1);
        } else if (deltaX < 0 && currentIndex < images.length - 1) {
          // Swipe left - go to next image
          setCurrentIndex(currentIndex + 1);
        }
      }
    }
    
    setIsSwiping(false);
    setIsPinching(false);
    setTouchStart({ x: 0, y: 0 });
    setTouchEnd({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full transition-colors"
        aria-label="Close modal"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
      >
        <div
          style={{
            transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
            transition: isPinching || (scale > 1) ? 'none' : 'transform 0.3s ease',
          }}
          className="relative w-full h-full flex items-center justify-center"
        >
          <Image
            src={images[currentIndex]?.image_url || ''}
            alt={images[currentIndex]?.alt_text || `Image ${currentIndex + 1}`}
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        </div>
      </div>

      {/* Dot Indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-2.5 h-2.5'
                  : 'bg-white/50'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image Counter (for additional context) */}
      {images.length > 1 && (
        <div className="absolute top-4 left-4 z-10 bg-black/50 rounded-full px-3 py-1.5">
          <span className="text-white text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      )}
    </div>
  );
}

