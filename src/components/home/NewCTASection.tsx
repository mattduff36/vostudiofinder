'use client';

import { Session } from 'next-auth';
import { Mic, Building, Users, CheckCircle2 } from 'lucide-react';
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

  const sections = [
    { 
      icon: Mic, 
      title: 'For Voice Artists', 
      points: [
        'Find trusted recording studios near you - anywhere in the world', 
        'Compare booths, equipment, rates and availability', 
        'Verified studios with real photos and real pros behind them', 
        'Contact studios directly - no fees, no middlemen', 
        'Perfect for last-minute sessions, travel jobs and remote patches'
      ] 
    },
    { 
      icon: Building, 
      title: 'For Studio Owners', 
      points: [
        'Earn extra income from a booth that is sitting empty', 
        'Get discovered by thousands of voice artists worldwide', 
        'Showcase your studio with photos, equipment lists and services', 
        'Receive direct enquiries from qualified clients', 
        'Just £25/year - one booking often pays for the whole year'
      ] 
    },
    { 
      icon: Users, 
      title: 'For Everyone', 
      points: [
        'Join a global community of voice artists, producers and podcasters', 
        'Connect, collaborate and grow your professional network', 
        'Share industry tips, equipment knowledge and experience', 
        'Stay updated with trends, technology and opportunities', 
        'Be part of a platform built by people in the industry'
      ] 
    }
  ];

  return (
    <div className="relative py-16 overflow-hidden" style={{ backgroundColor: colors.background }}>
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
      <div className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.textPrimary }}>
              The Easiest Way for Voice Artists and Studios to Work Together
            </h2>
            <p className={`text-lg md:text-xl text-center transition-all duration-1000 ease-out ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
            }`} style={{ 
              transitionDelay: '0.2s', 
              color: colors.textSecondary, 
              maxWidth: '768px', 
              margin: '0 auto' 
            }}>
              A simple, no-commission platform built by people who actually work in the industry.
            </p>
          </div>

          {/* Three Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mb-16">
            {sections.map((section, index) => (
              <div key={index} className="flex flex-col">
                {/* Icon */}
                <div 
                  className="w-16 h-16 rounded-lg flex items-center justify-center mb-6"
                  style={{ backgroundColor: colors.primary }}
                >
                  <section.icon className="w-8 h-8 text-white" />
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-semibold mb-6" style={{ color: colors.textPrimary }}>
                  {section.title}
                </h3>
                
                {/* Points */}
                <ul className="space-y-3">
                  {section.points.map((point, pointIndex) => (
                    <li key={pointIndex} className="flex items-start gap-3">
                      <CheckCircle2 
                        className="w-5 h-5 flex-shrink-0 mt-0.5" 
                        style={{ color: colors.primary }}
                      />
                      <span className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/auth/signup" 
              className="px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl" 
              style={{ backgroundColor: colors.primary, color: '#ffffff' }}
            >
              List Your Studio - £25/year
            </Link>
            <Link 
              href="/studios" 
              className="px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl" 
              style={{ 
                border: `2px solid ${colors.primary}`, 
                color: colors.primary, 
                backgroundColor: 'transparent' 
              }}
            >
              Browse Studios
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
