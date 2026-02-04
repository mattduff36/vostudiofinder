'use client';
import { logger } from '@/lib/logger';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { colors } from './HomePage';
import { EnhancedSearchBar } from '../search/EnhancedSearchBar';
import { getPromoConfig } from '@/lib/promo';
import { Sparkles } from 'lucide-react';

import Image from 'next/image';

interface HeroSectionProps {
  /** Server-side promo state from database */
  isPromoActive?: boolean;
}

export function HeroSection({ isPromoActive }: HeroSectionProps) {
  logger.log('🏠 HeroSection component rendered');
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [heroHeight, setHeroHeight] = useState<number | null>(null);
  const lastWidthRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);
  const promoConfig = getPromoConfig();
  
  // Use prop if provided, otherwise fall back to env-based config
  const promoActive = isPromoActive !== undefined ? isPromoActive : promoConfig.isActive;

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Lock hero height on mount and only update on width changes (rotation)
  useEffect(() => {
    const updateHeight = () => {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      
      // Only update if:
      // 1. Initial mount (not yet initialized)
      // 2. Width changed (rotation/resize), but NOT just height change (browser UI)
      if (!hasInitializedRef.current || (lastWidthRef.current !== null && currentWidth !== lastWidthRef.current)) {
        setHeroHeight(currentHeight);
        lastWidthRef.current = currentWidth;
        hasInitializedRef.current = true;
        logger.log('🏠 Hero height locked:', currentHeight, 'width:', currentWidth);
      }
    };

    updateHeight();
    
    // Listen for resize events
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (location: string, coordinates?: { lat: number; lng: number }, radius?: number) => {
    logger.log('Location search initiated:', { location, coordinates, radius });
    
    // Build URL parameters for studios page
    const params = new URLSearchParams();
    
    // Set location parameter
    params.set('location', location);
    
    // Set coordinates if available
    if (coordinates) {
      params.set('lat', coordinates.lat.toString());
      params.set('lng', coordinates.lng.toString());
    }
    
    // Set radius if provided
    if (radius) {
      params.set('radius', radius.toString());
    }
    
    // Navigate to studios page with parameters
    router.push(`/studios?${params.toString()}`);
  };

  return (
    <div className="relative text-white overflow-visible min-h-screen flex items-center justify-center w-full max-w-full" style={{ minHeight: heroHeight ? `${heroHeight}px` : '100dvh' }}>
        {/* Background Image */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/bottom-banner.jpg"
            alt="Professional recording studio"
            fill
            className="object-cover"
            priority
          />
          <div
            className="absolute inset-0 transition-all duration-300"
            style={{ backgroundColor: `${colors.primary}00` }}
          ></div>
        </div>

      {/* Hero Content */}
      <div className="relative z-50 -mt-[10vh] py-6 sm:py-12 md:py-16 lg:py-20 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h1 className={`hp1 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-3 sm:mb-4 md:mb-6 text-center transition-all duration-1000 delay-200 leading-tight ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ color: '#ffffff' }}>
            Find a<br className="hidden sm:block"/>
            <span className="sm:hidden"> </span>
            <span style={{ color: colors.primary }}>Voiceover Recording Studio</span>
          </h1>
          
          <h2 className={`hp2 text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-center mb-2 sm:mb-3 transition-all duration-1000 ease-out px-4 ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.4s', color: '#ffffff', maxWidth: '768px', margin: '0 auto 0.5rem auto' }}>
            Professional Voiceover, Podcast & Recording Studios Worldwide
          </h2>
          
          <motion.h3 
            className="hp3 font-semibold text-center px-4 mb-4 sm:mb-0 text-lg md:text-2xl"
            style={{ maxWidth: '768px', margin: '0 auto 1rem auto' }}
            initial={{ color: '#ffffff', scale: 1, opacity: 0, x: 80 }}
            animate={{ 
              color: colors.primary,
              scale: 1,
              opacity: 1,
              x: 0
            }}
            transition={{
              color: {
                duration: 1.5,
                delay: 5.7, // 3.2s (wave end) + 2.5s pause
                ease: 'easeOut'
              },
              opacity: {
                duration: 1,
                delay: 0.5,
                ease: 'easeOut'
              },
              x: {
                duration: 1,
                delay: 0.5,
                ease: 'easeOut'
              }
            }}
          >
            {/* Wave effect animation with 1s initial delay, 200ms pause, then ultra-slow fade */}
            {'Got a studio? '.split('').map((char, i) => (
              <motion.span
                key={`part1-${i}`}
                initial={{ y: 0 }}
                animate={{ y: [0, -12, 0] }}
                transition={{ 
                  duration: 0.6,
                  delay: 1.0 + (i * 0.05), // 1s initial delay
                  ease: 'easeInOut'
                }}
                className="inline-block"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
            {'Get it listed!'.split('').map((char, i) => (
              <motion.span
                key={`part2-${i}`}
                initial={{ y: 0 }}
                animate={{ y: [0, -12, 0] }}
                transition={{ 
                  duration: 0.6,
                  delay: 1.0 + ('Got a studio? '.length * 0.05) + 0.6 + 0.2 + (i * 0.05), // 1s + first part wave time + 200ms pause
                  ease: 'easeInOut'
                }}
                className="inline-block"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </motion.h3>

          {/* Enhanced Search Form */}
          <div className={`max-w-4xl mx-auto mt-6 sm:mt-8 md:mt-10 lg:mt-12 px-4 transition-all duration-700 w-full ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ transitionDelay: '0.2s' }}>
            <EnhancedSearchBar
              placeholder="Studio Search..."
              showRadius={true}
              onSearch={handleSearch}
            />
          </div>

          {/* Promo CTA Section - Only shows when promo is active */}
          {promoActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="max-w-2xl mx-auto mt-8 sm:mt-10 px-4"
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 sm:p-6 shadow-2xl border border-white/20">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                      <span className="bg-[#d42027] text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {promoConfig.badgeText}
                      </span>
                    </div>
                    <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                      List Your Studio {promoConfig.promoPrice}
                    </h4>
                    <p className="text-sm text-gray-600">
                      <span className="line-through text-gray-400">{promoConfig.normalPrice}</span>
                      <span className="ml-2 font-semibold text-[#d42027]">{promoConfig.promoPrice} for a limited time</span>
                    </p>
                  </div>
                  <Link
                    href="/auth/signup"
                    className="w-full sm:w-auto px-6 py-3 bg-[#d42027] text-white font-semibold rounded-lg hover:bg-[#b91c22] transition-all duration-300 hover:shadow-lg text-center whitespace-nowrap"
                  >
                    {promoConfig.ctaText}
                  </Link>
                </div>
                <p className="text-xs text-gray-500 text-center mt-3">
                  Limited-time promotion — secure your listing while it&apos;s free.
                </p>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
