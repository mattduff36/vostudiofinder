'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { colors } from '@/components/home/HomePage';

interface StudioMarkerModalProps {
  studio: {
    id: string;
    name: string;
    users?: {
      username: string;
    };
    studio_images?: Array<{
      image_url: string;
      alt_text?: string;
    }>;
  };
  position: {
    x: number;
    y: number;
  };
  onClose: () => void;
}

export function StudioMarkerModal({ studio, position, onClose }: StudioMarkerModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    // Add delay to prevent immediate close from the marker click
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Close modal on scroll
  useEffect(() => {
    function handleScroll() {
      onClose();
    }

    window.addEventListener('scroll', handleScroll, true); // Use capture phase to catch all scroll events
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  const handleModalClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking the close button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    if (studio.users?.username) {
      window.open(`/${studio.users.username}`, '_blank', 'noopener,noreferrer');
      onClose(); // Close modal after opening profile
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      ref={modalRef}
      className="fixed z-[10000] animate-scale-in cursor-pointer"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%) translateY(-12px)', // Position above the marker
      }}
      onClick={handleModalClick}
    >
      <div 
        className="bg-white rounded-lg shadow-xl border-2 hover:shadow-2xl transition-all duration-200"
        style={{ 
          borderColor: colors.primary,
          maxWidth: '300px',
          maxHeight: '100px',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleCloseClick}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors flex items-center justify-center z-10"
          style={{ border: `2px solid ${colors.primary}` }}
          aria-label="Close"
        >
          <X className="w-3 h-3" style={{ color: colors.primary }} />
        </button>

        {/* Content */}
        <div className="flex items-center gap-3 p-3">
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            <div 
              className="bg-gray-200 rounded-md overflow-hidden"
              style={{ width: '40px', height: '40px' }}
            >
              <Image
                src={studio.studio_images?.[0]?.image_url || '/favicon_transparent/android-chrome-192x192.png'}
                alt={studio.studio_images?.[0]?.alt_text || studio.name}
                width={40}
                height={40}
                className="object-cover w-full h-full"
                onError={(e) => {
                  // Fallback to logo if image fails to load
                  (e.target as HTMLImageElement).src = '/favicon_transparent/android-chrome-192x192.png';
                }}
              />
            </div>
          </div>

          {/* Studio name */}
          <div className="flex-1 min-w-0 pr-4">
            <h3 
              className="font-semibold text-sm truncate"
              style={{ color: colors.textPrimary }}
            >
              {studio.name}
            </h3>
          </div>
        </div>

        {/* Pointer arrow */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 rotate-45"
          style={{ 
            backgroundColor: 'white',
            borderRight: `2px solid ${colors.primary}`,
            borderBottom: `2px solid ${colors.primary}`,
          }}
        />
      </div>
    </div>
  );
}

