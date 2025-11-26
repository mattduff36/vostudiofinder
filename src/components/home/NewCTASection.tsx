'use client';

import { Session } from 'next-auth';
import { Mic, Building, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { colors } from './HomePage';

interface NewCTASectionProps {
  session: Session | null;
}

export function NewCTASection({ }: NewCTASectionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="relative py-8 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-3.jpg"
          alt="Professional recording studio"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 py-8 w-full">
        <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.textPrimary }}>The Easiest Way for Voice Artists and Studios to Work Together</h2>
          <p className={`text-xl text-center transition-all duration-1000 ease-out ${
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.2s', color: colors.textSecondary, maxWidth: '768px', margin: '0 auto' }}>
            A simple, no-commission platform built by people who actually work in the industry.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {[
            { icon: Mic, title: 'For Voice Artists', points: ['Find trusted recording studios near you - anywhere in the world', 'Compare booths, equipment, rates and availability', 'Verified studios with real photos and real pros behind them', 'Contact studios directly - no fees, no middlemen', 'Perfect for last-minute sessions, travel jobs and remote patches'] },
            { icon: Building, title: 'For Studio Owners', points: ['Earn extra income from a booth that is sitting empty', 'Get discovered by thousands of voice artists worldwide', 'Showcase your studio with photos, equipment lists and services', 'Receive direct enquiries from qualified clients', 'Just £25/year - one booking often pays for the whole year'] },
            { icon: Users, title: 'For Everyone', points: ['Join a global community of voice artists, producers and podcasters', 'Connect, collaborate and grow your professional network', 'Share industry tips, equipment knowledge and experience', 'Stay updated with trends, technology and opportunities', 'Be part of a platform built by people in the industry'] }
          ].map((section, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${colors.primary}20` }}>
                <section.icon className="w-8 h-8" style={{ color: colors.primary }} />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: colors.textPrimary }}>{section.title}</h3>
              <ul className="space-y-2 text-sm" style={{ color: colors.textSecondary }}>
                {section.points.map((point, pointIndex) => (
                  <li key={pointIndex}>• {point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/auth/signup" className="px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: colors.primary, color: colors.background }}>
            List Your Studio - £25/year
          </Link>
          <Link href="/studios" className="px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl" style={{ border: `1px solid ${colors.primary}`, color: colors.primary, backgroundColor: 'transparent' }}>
            Browse Studios
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}
