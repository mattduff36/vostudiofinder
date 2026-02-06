'use client';
import { logger } from '@/lib/logger';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from './HomePage';
import { EnhancedSearchBar } from '../search/EnhancedSearchBar';


import Image from 'next/image';

export function HeroSection() {
  logger.log('🏠 HeroSection component rendered');
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [heroHeight, setHeroHeight] = useState<number | null>(null);
  const lastWidthRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);

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
            {'List it for FREE!'.split('').map((char, i) => (
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

        </div>
      </div>
    </div>
  );
}
