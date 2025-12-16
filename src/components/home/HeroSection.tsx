'use client';
import { logger } from '@/lib/logger';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from './HomePage';
import { EnhancedSearchBar } from '../search/EnhancedSearchBar';


import Image from 'next/image';

export function HeroSection() {
  logger.log('🏠 HeroSection component rendered');
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
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
    <div className="relative text-white overflow-visible min-h-screen flex items-center w-full max-w-full" style={{ minHeight: '100dvh' }}>
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
      <div className="relative z-50 py-6 sm:py-12 md:py-16 lg:py-20 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h1 className={`hp1 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-3 sm:mb-4 md:mb-6 text-center transition-all duration-1000 delay-200 leading-tight ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ color: '#ffffff' }}>
            Find a<br className="hidden sm:block"/>
            <span className="sm:hidden"> </span>
            <span style={{ color: colors.primary }}>Voiceover Recording Studio</span>
          </h1>
          
          <h2 className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-center mb-2 sm:mb-3 transition-all duration-1000 ease-out px-4 ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.4s', color: '#ffffff', maxWidth: '768px', margin: '0 auto 0.5rem auto' }}>
            Professional Voiceover, Podcast & Broadcast Studios Worldwide
          </h2>
          
          <p className={`text-sm sm:text-base md:text-lg text-center transition-all duration-1000 ease-out px-4 mb-4 sm:mb-0 ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.5s', color: '#ffffff', maxWidth: '768px', margin: '0 auto 1rem auto' }}>
            Verified locations. No commission. Direct studio contact.
          </p>

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
