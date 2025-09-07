'use client';

import { useState, useEffect } from 'react';
import { colors } from './HomePage';
import { EnhancedSearchBar } from '../search/EnhancedSearchBar';

interface MultiCriteriaSearch {
  location?: string;
  studioType?: string;
  services: string[];
  equipment: string[];
}

import Image from 'next/image';

export function HeroSection() {
  console.log('🏠 HeroSection component rendered');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleSearch = (criteria: MultiCriteriaSearch, radius?: number) => {
    console.log('Multi-criteria search initiated:', { criteria, radius });
  };

  return (
    <div className="relative text-white overflow-hidden">
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
      <div className="relative z-10 px-6 pt-32 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className={`text-5xl md:text-6xl font-bold mb-6 transition-all duration-1000 delay-200 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ color: '#ffffff' }}>
            Find Your Perfect<br/>
            <span style={{ color: colors.primary }}>Recording Studio</span>
          </h1>
          
          <p className={`text-xl max-w-3xl mx-auto transition-all duration-1000 ease-out ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.4s', color: '#ffffff' }}>
            Connect with professional voiceover recording studios worldwide.<br/>Advanced search, verified locations, and direct studio contact.
          </p>

          {/* Enhanced Search Form */}
          <div className={`max-w-4xl mx-auto mt-12 transition-all duration-1000 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ transitionDelay: '0.6s' }}>
            <EnhancedSearchBar
              placeholder="Search studios, services, equipment, or location..."
              showRadius={true}
              onSearch={handleSearch}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
