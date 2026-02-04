'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getPromoConfig, formatPromoEndDate } from '@/lib/promo';

interface PromoBannerProps {
  /** Allow users to dismiss the banner */
  dismissible?: boolean;
  /** Variant: 'top' for site-wide header, 'inline' for page sections */
  variant?: 'top' | 'inline';
  /** Override the promo active state (passed from server component) */
  isPromoActive?: boolean;
}

export function PromoBanner({ dismissible = true, variant = 'top', isPromoActive }: PromoBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const config = getPromoConfig();
  
  // Use prop if provided, otherwise fall back to env-based config
  const promoActive = isPromoActive !== undefined ? isPromoActive : config.isActive;

  useEffect(() => {
    // Check if banner was previously dismissed in this session
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem('promo-banner-dismissed');
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    }
    // Slight delay for smooth entrance
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Don't render if promo is not active or banner is dismissed
  if (!promoActive || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promo-banner-dismissed', 'true');
    }
  };

  const endDateFormatted = formatPromoEndDate();

  if (variant === 'inline') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-gradient-to-r from-[#d42027] to-[#e63946] rounded-lg p-4 mb-6 shadow-lg"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="text-white">
                  <div className="flex items-center gap-2">
                    <span className="bg-white/20 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {config.badgeText}
                    </span>
                  </div>
                  <p className="font-semibold mt-1">
                    {config.message}
                  </p>
                  <p className="text-sm text-white/90">
                    <span className="line-through opacity-75">{config.normalPrice}</span>
                    <span className="ml-2 font-bold">{config.promoPrice}</span>
                  </p>
                </div>
              </div>
              <Link
                href="/auth/signup"
                className="bg-white text-[#d42027] px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {config.ctaText}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Default: top banner variant
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="bg-gradient-to-r from-[#d42027] via-[#e63946] to-[#d42027] text-white relative z-[60]"
        >
          <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3">
            <div className="flex items-center justify-center gap-2 sm:gap-4 text-sm sm:text-base">
              {/* Badge */}
              <span className="hidden sm:inline-flex items-center gap-1.5 bg-white/20 text-xs font-semibold px-2.5 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                {config.badgeText}
              </span>

              {/* Main message */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                <span className="font-semibold">
                  <span className="sm:hidden">🎉 </span>
                  FLASH SALE:
                </span>
                <span>
                  <span className="font-bold">{config.promoPrice}</span>
                  {' '}membership
                  <span className="text-white/80 ml-1">
                    (normally <span className="line-through">{config.normalPrice}</span>)
                  </span>
                </span>
              </div>

              {/* End date indicator */}
              {endDateFormatted && (
                <span className="hidden md:inline-flex items-center gap-1 text-white/80 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  Ends {endDateFormatted}
                </span>
              )}

              {/* CTA Button */}
              <Link
                href="/auth/signup"
                className="bg-white text-[#d42027] px-3 sm:px-4 py-1 sm:py-1.5 rounded-md font-semibold text-xs sm:text-sm hover:bg-gray-100 transition-colors whitespace-nowrap ml-1 sm:ml-2"
              >
                Get free membership
              </Link>

              {/* Dismiss button */}
              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Secondary link - mobile visible */}
            <div className="flex justify-center mt-1.5 sm:hidden">
              <Link
                href="/help"
                className="text-white/80 text-xs underline hover:text-white transition-colors"
              >
                See what&apos;s included
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
