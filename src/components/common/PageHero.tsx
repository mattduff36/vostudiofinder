'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface PageHeroProps {
  title: string;
  description: string;
  backgroundImage?: string;
}

export function PageHero({ 
  title, 
  description, 
  backgroundImage = '/background-images/21920-7.jpg' 
}: PageHeroProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="relative z-10 text-white py-20 overflow-hidden">
      {/* Background texture */}
      <div className="absolute inset-0">
        <Image
          src={backgroundImage}
          alt="Hero background texture"
          fill
          className="object-cover opacity-40"
          priority={false}
        />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        <h1 
          className={`text-4xl md:text-5xl font-bold mb-4 transition-all duration-1000 ease-out ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'
          }`} 
          style={{ transitionDelay: '0.2s' }}
        >
          {title}
        </h1>
        <div className="w-24 h-1 bg-[#d42027] mx-auto mb-6"></div>
        <p 
          className={`text-xl text-center transition-all duration-1000 ease-out ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} 
          style={{ 
            transitionDelay: '0.4s', 
            color: 'rgba(255, 255, 255, 0.9)', 
            maxWidth: '768px', 
            margin: '0 auto' 
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

