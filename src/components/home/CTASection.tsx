'use client';

import { Session } from 'next-auth';
import { Mic, Building, Users } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { colors } from './HomePage';

interface CTASectionProps {
  session: Session | null;
}

export function CTASection({ }: CTASectionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="relative py-16 overflow-hidden">
      {/* Background Banner Image */}
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
      
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center text-white mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#ffffff' }}>Ready to Get Started?</h2>
          <p className={`text-xl max-w-3xl mx-auto transition-all duration-1000 ease-out ${
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.2s', color: '#ffffff' }}>
            Whether you're a voice artist looking for the perfect studio or a studio owner
            wanting to connect with talent, VoiceoverStudioFinder has you covered.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {[
            { icon: Mic, title: 'For Voice Artists', points: ['Find studios near you or worldwide', 'Compare equipment and services', 'Read reviews from other artists', 'Book sessions directly with studios'] },
            { icon: Building, title: 'For Studio Owners', points: ['Reach thousands of voice artists worldwide', 'Professional listing with photos & details', 'Direct bookings from qualified clients', 'Only £25/year - exceptional value'] },
            { icon: Users, title: 'For Everyone', points: ['Join a global community', 'Network with professionals', 'Share experiences and tips', 'Stay updated on industry trends'] }
          ].map((section, index) => (
            <div key={index} className="text-center text-white">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
                <section.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#ffffff' }}>{section.title}</h3>
              <ul className="space-y-2 text-sm" style={{ color: '#ffffff' }}>
                {section.points.map((point, pointIndex) => (
                  <li key={pointIndex}>• {point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button className="px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: colors.background, color: colors.primary }}>
            List Your Studio - £25/year
          </button>
          <button className="px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl" style={{ border: `1px solid ${colors.background}`, color: colors.background, backgroundColor: 'transparent' }}>
            Browse Studios
          </button>
        </div>
      </div>
    </div>
  );
}
