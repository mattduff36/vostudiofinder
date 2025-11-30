'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from './HomePage';
import { EnhancedSearchBar } from '../search/EnhancedSearchBar';


import Image from 'next/image';

export function HeroSection() {
  console.log('🏠 HeroSection component rendered');
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);


  const handleSearch = (location: string, coordinates?: { lat: number; lng: number }, radius?: number) => {
    console.log('Location search initiated:', { location, coordinates, radius });
    
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
    <div className="relative text-white overflow-hidden min-h-screen flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
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
      <div className="relative z-10 py-12 sm:py-16 md:py-20 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h1 className={`hp1 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-center transition-all duration-1000 delay-200 leading-tight ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ color: '#ffffff' }}>
            Find a<br className="hidden sm:block"/>
            <span className="sm:hidden"> </span>
            <span style={{ color: colors.primary }}>Voiceover Recording Studio</span>
          </h1>
          
          <h2 className={`text-xl sm:text-2xl md:text-3xl font-semibold text-center mb-3 transition-all duration-1000 ease-out px-4 ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.4s', color: '#ffffff', maxWidth: '768px', margin: '0 auto 1rem auto' }}>
            Professional Voiceover, Podcast & Broadcast Studios Worldwide
          </h2>
          
          <p className={`text-base sm:text-lg text-center transition-all duration-1000 ease-out px-4 ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.5s', color: '#ffffff', maxWidth: '768px', margin: '0 auto' }}>
            Verified locations. No commission. Direct studio contact.
          </p>

          {/* Enhanced Search Form */}
          <div className={`max-w-4xl mx-auto mt-8 sm:mt-10 md:mt-12 px-4 transition-all duration-1000 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ transitionDelay: '0.6s' }}>
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
