'use client';

import Image from 'next/image';
import { PageHero } from '@/components/common/PageHero';

export default function PrivacyPage() {

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
      <PageHero
        title="Privacy Policy"
        description="Your privacy is important to us"
        backgroundImage="/background-images/21920-5.jpg"
      />

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
