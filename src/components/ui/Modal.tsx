'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  preventBackdropClose?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '4xl';
}

export function Modal({ 
  isOpen, 
  onClose, 
  children, 
  preventBackdropClose = false,
  maxWidth = 'md'
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Track if component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Don't render on server or if not open
  if (!isOpen || !isMounted) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (preventBackdropClose || !onClose) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '4xl': 'sm:max-w-4xl',
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        margin: 0,
        padding: 0,
        width: '100vw',
        height: '100dvh'
      }}
    >
      {/* Modal content */}
      <div
        ref={modalRef}
        className={`
          relative w-full h-full
          sm:h-auto sm:rounded-lg sm:shadow-xl
          ${maxWidthClasses[maxWidth]}
          bg-white/90 backdrop-blur-sm
          overflow-y-auto
          sm:max-h-[90vh]
        `}
      >
        {children}
      </div>
    </div>
  );

  // Use portal to render modal at body level, outside any container constraints
  return createPortal(modalContent, document.body);
}
