'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { colors } from '../../components/home/HomePage';
import Link from 'next/link';

export default function PrivacyPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-3.jpg"
          alt="Privacy policy background texture"
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
            src="/background-images/21920-5.jpg"
            alt="Hero background texture"
            fill
            className="object-cover opacity-40"
            priority={false}
          />
        </div>
        {/* Red gradient overlay */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${colors.primary}e6, ${colors.primary}cc)` }}></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 transition-all duration-1000 ease-out ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'
          }`} style={{ transitionDelay: '0.2s' }}>Privacy Policy</h1>
          <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
          <p className={`text-xl text-center transition-all duration-1000 ease-out ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.4s', color: 'rgba(255, 255, 255, 0.9)', maxWidth: '768px', margin: '0 auto' }}>
            Your privacy is important to us
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8 md:p-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Coming Soon</h2>
            <p className="text-lg text-gray-600 mb-8">
              Our Privacy Policy is currently being prepared and will be available shortly.
            </p>
            <p className="text-gray-500 mb-8">
              Please check back soon or contact us if you have any questions about how we handle your data.
            </p>
            <Link 
              href="/"
              className="inline-block bg-[#d42027] hover:bg-[#b91c23] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
