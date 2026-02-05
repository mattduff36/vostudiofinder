'use client';

import { Mic, Building, Users, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { colors } from './HomePage';

export function NewCTASection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const sections = [
    { 
      icon: Mic, 
      title: 'For Voice Artists', 
      points: [
        'Find trusted voiceover recording studios near you - anywhere in the world', 
        'Compare booths, equipment, rates and availability', 
        'Verified studios with real photos and real professionals behind them', 
        'Contact studios directly - no fees, no middlemen', 
        'Perfect for last-minute sessions, travel jobs and remote patches'
      ] 
    },
    { 
      icon: Building, 
      title: 'For Studio Owners', 
      points: [
        'Earn extra income from a voiceover booth that is sitting empty', 
        'Get discovered by thousands of voice artists worldwide', 
        'Showcase your studio with photos, equipment lists, prices  and services', 
        'Receive direct enquiries from qualified clients', 
        'List for free or go Premium for £25/year - one booking pays for itself.'
      ] 
    },
    { 
      icon: Users, 
      title: 'For Everyone', 
      points: [
        'Join a global community of voice artists, studio owners, producers and podcasters', 
        'Connect, collaborate and make extra money easily and directly.', 
        'Share industry tips, equipment knowledge and experience', 
        'Stay busy and benefit from Studio Finder\'s great user interface.', 
        'Be part of a platform built by people in the business'
      ] 
    }
  ];

  return (
    <div className="relative py-10 sm:py-12 md:py-16 overflow-hidden w-full max-w-full" style={{ backgroundColor: colors.background }}>
      {/* Background Image */}
      <div className="absolute inset-0 overflow-hidden">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 px-2" style={{ color: colors.textPrimary }}>
              The Easiest Way for Voice Artists and Studios to Work Together
            </h2>
            <p className={`text-sm sm:text-base md:text-lg lg:text-xl text-center transition-all duration-1000 ease-out px-2 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
            }`} style={{ 
              transitionDelay: '0.2s', 
              color: colors.textSecondary, 
              maxWidth: '768px', 
              margin: '0 auto' 
            }}>
              A simple, no-commission platform built by people who work in the business.
            </p>
            <p className={`text-sm sm:text-base md:text-lg text-center transition-all duration-1000 ease-out px-2 mt-2 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
            }`} style={{ 
              transitionDelay: '0.3s', 
              color: colors.textSecondary, 
              maxWidth: '768px', 
              margin: '0 auto' 
            }}>
              Verified locations. No commission. Direct studio contact.
            </p>
          </div>

          {/* Three Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 mb-10 sm:mb-12 md:mb-16">
            {sections.map((section, index) => (
              <div key={index} className="flex flex-col px-2">
                {/* Icon */}
                <div 
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center mb-4 sm:mb-6"
                  style={{ backgroundColor: colors.primary }}
                >
                  <section.icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                
                {/* Title */}
                <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6" style={{ color: colors.textPrimary }}>
                  {section.title}
                </h3>
                
                {/* Points */}
                <ul className="space-y-2.5 sm:space-y-3">
                  {section.points.map((point, pointIndex) => (
                    <li key={pointIndex} className="flex items-start gap-2.5 sm:gap-3">
                      <CheckCircle2 
                        className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" 
                        style={{ color: colors.primary }}
                      />
                      <span className="text-xs sm:text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-2">
            <Link 
              href="/auth/signup" 
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl text-center" 
              style={{ backgroundColor: colors.primary, color: '#ffffff' }}
            >
              List Your Studio - Free
            </Link>
            <Link 
              href="/studios" 
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl text-center" 
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
