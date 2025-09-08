'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Map NLP detected types to enum values
  const mapStudioTypeToEnum = (nlpType: string): string => {
    const mapping: { [key: string]: string } = {
      'podcast': 'PODCAST',
      'podcasting': 'PODCAST', 
      'recording': 'RECORDING',
      'production': 'PRODUCTION',
      'home': 'HOME',
      'mobile': 'MOBILE'
    };
    
    return mapping[nlpType.toLowerCase()] || nlpType.toUpperCase();
  };

  const handleSearch = (criteria: MultiCriteriaSearch, radius?: number) => {
    console.log('Multi-criteria search initiated:', { criteria, radius });
    
    // Build URL parameters for studios page
    const params = new URLSearchParams();
    
    if (criteria.location) {
      params.set('location', criteria.location);
    }
    
    if (criteria.studioType) {
      // Map NLP detected type to enum value
      const mappedStudioType = mapStudioTypeToEnum(criteria.studioType);
      params.set('studioType', mappedStudioType);
    }
    
    if (criteria.services && criteria.services.length > 0) {
      params.set('services', criteria.services.join(','));
    }
    
    if (criteria.equipment && criteria.equipment.length > 0) {
      params.set('equipment', criteria.equipment.join(','));
    }
    
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
      <div className="relative z-10 py-20 w-full">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className={`text-5xl md:text-6xl font-bold mb-6 text-center transition-all duration-1000 delay-200 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ color: '#ffffff' }}>
            Find Your Perfect<br/>
            <span style={{ color: colors.primary }}>Recording Studio</span>
          </h1>
          
          <p className={`text-xl text-center transition-all duration-1000 ease-out ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.4s', color: '#ffffff', maxWidth: '768px', margin: '0 auto' }}>
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
