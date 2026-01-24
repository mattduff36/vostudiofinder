/**
 * MapFullscreen - Wrapper for SimpleStudioMap with Custom Fullscreen
 * 
 * Provides iOS and Android-compatible fullscreen functionality:
 * - iOS: CSS-based fullscreen (Apple restrictions)
 * - Android: Native Fullscreen API
 * - Hides nav bars when in fullscreen mode
 * 
 * Only visible on mobile (< 768px)
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { SimpleStudioMap } from '@/components/maps/SimpleStudioMap';

interface MapFullscreenProps {
  latitude?: number | undefined;
  longitude?: number | undefined;
  address: string;
  fullAddress?: string;
  useCoordinates?: boolean;
  showExactLocation?: boolean;
}

export function MapFullscreen({
  latitude,
  longitude,
  address,
  fullAddress,
  useCoordinates = false,
  showExactLocation = true,
}: MapFullscreenProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [supportsNativeFullscreen, setSupportsNativeFullscreen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Use actual viewport height for iOS compatibility
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(window.innerHeight);
    };
    
    updateHeight();
    setSupportsNativeFullscreen(!!document.documentElement.requestFullscreen);
    
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Handle native fullscreen changes (Android/Desktop only)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (supportsNativeFullscreen) {
        setIsFullscreen(!!document.fullscreenElement);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [supportsNativeFullscreen]);

  // Lock body scroll and hide nav bars when in CSS-based fullscreen (iOS)
  useEffect(() => {
    if (!supportsNativeFullscreen && isFullscreen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.documentElement.setAttribute('data-map-fullscreen', 'true');
      
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.documentElement.removeAttribute('data-map-fullscreen');
      };
    }
    return undefined;
  }, [supportsNativeFullscreen, isFullscreen]);

  // Fullscreen toggle function (currently unused - functionality to be implemented)
  // const toggleFullscreen = useCallback(async () => {
  //   if (supportsNativeFullscreen) {
  //     // Use native Fullscreen API (Android/Desktop)
  //     try {
  //       if (!document.fullscreenElement) {
  //         await mapContainerRef.current?.requestFullscreen();
  //       } else {
  //         await document.exitFullscreen();
  //       }
  //     } catch (err) {
  //       console.error('Error toggling fullscreen:', err);
  //     }
  //   } else {
  //     // Use CSS-based fullscreen (iOS)
  //     setIsFullscreen(!isFullscreen);
  //   }
  // }, [supportsNativeFullscreen, isFullscreen]);

  // Calculate height for fullscreen
  const containerHeight = !supportsNativeFullscreen && isFullscreen && viewportHeight
    ? `${viewportHeight}px`
    : '192px'; // 48 * 4 = h-48

  return (
    <div
      ref={mapContainerRef}
      className={`relative ${
        !supportsNativeFullscreen && isFullscreen
          ? 'fixed inset-0 z-[200] bg-white'
          : 'h-48 rounded-lg overflow-hidden'
      }`}
      style={
        !supportsNativeFullscreen && isFullscreen
          ? { height: containerHeight, width: '100vw' }
          : undefined
      }
    >
      <SimpleStudioMap
        latitude={latitude}
        longitude={longitude}
        address={address}
        fullAddress={fullAddress || ''}
        useCoordinates={useCoordinates}
        showExactLocation={showExactLocation}
        height="100%"
        className="w-full h-full"
      />
    </div>
  );
}

