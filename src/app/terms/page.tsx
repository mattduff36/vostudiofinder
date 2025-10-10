'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function TermsPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-4.jpg"
          alt="Terms of service background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      {/* Hero Section */}
      <div className="relative z-10 text-white py-20 overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0">
          <Image
            src="/background-images/21920-7.jpg"
            alt="Hero background texture"
            fill
            className="object-cover opacity-40"
            priority={false}
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 transition-all duration-1000 ease-out ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'
          }`} style={{ transitionDelay: '0.2s' }}>Terms of Service</h1>
          <div className="w-24 h-1 bg-[#d42027] mx-auto mb-6"></div>
          <p className={`text-xl text-center transition-all duration-1000 ease-out ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.4s', color: 'rgba(255, 255, 255, 0.9)', maxWidth: '768px', margin: '0 auto' }}>
            Terms and conditions for using VoiceoverStudioFinder
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8 md:p-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Coming Soon</h2>
            <p className="text-lg text-gray-600 mb-8">
              Our Terms of Service are currently being prepared and will be available shortly.
            </p>
            <p className="text-gray-500 mb-8">
              Please check back soon or contact us if you have any questions.
            </p>
            <button 
              onClick={() => window.close()}
              className="inline-block bg-[#d42027] hover:bg-[#b91c23] text-white font-semibold px-8 py-3 rounded-lg transition-colors cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
