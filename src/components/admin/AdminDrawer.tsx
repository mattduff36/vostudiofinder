'use client';

import { useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Use back arrow instead of X icon */
  showBackButton?: boolean;
  /** Additional class names for the drawer content */
  className?: string;
}

/**
 * Mobile-first full-screen drawer for admin pages.
 * Hidden on desktop (md+), used for detail views on mobile.
 */
export function AdminDrawer({
  isOpen,
  onClose,
  title,
  children,
  showBackButton = false,
  className = '',
}: AdminDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 bg-black/50 z-[200]"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="md:hidden fixed inset-0 z-[201] bg-white flex flex-col"
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close drawer"
              >
                {showBackButton ? (
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                ) : (
                  <X className="w-5 h-5 text-gray-700" />
                )}
              </button>
              <h2 className="text-lg font-semibold text-gray-900 truncate flex-1">
                {title}
              </h2>
            </div>

            {/* Scrollable Content */}
            <div className={`flex-1 overflow-y-auto ${className}`}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
