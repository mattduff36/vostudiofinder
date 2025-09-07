'use client';

import { useState, useEffect } from 'react';
import { colors } from './HomePage';
import { EnhancedSearchBar } from '../search/EnhancedSearchBar';

import { Mic, Users, MapPin } from 'lucide-react';
import Image from 'next/image';

export function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleSearch = (query: string, type: string, radius?: number) => {
    console.log('Search initiated:', { query, type, radius });
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

          {/* Feature Icons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-3xl mx-auto">
            {[
              { icon: Mic, title: 'Professional Studios', description: 'Verified recording studios with professional equipment and acoustics' },
              { icon: MapPin, title: 'Global Locations', description: 'Find studios worldwide with precise location mapping and directions' },
              { icon: Users, title: 'Direct Contact', description: 'Connect directly with studio owners and book sessions instantly' }
            ].map((feature, index) => (
              <div key={index} className={`text-center transition-all duration-1000 ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`} style={{ transitionDelay: `${0.7 + index * 0.1}s` }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transform hover:scale-110 transition-transform duration-300" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>{feature.title}</h3>
                <p className="text-white">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
