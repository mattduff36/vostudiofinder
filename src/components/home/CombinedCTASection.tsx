'use client';

import { Session } from 'next-auth';
import { useState, useEffect, useRef } from 'react';
import { Building, Users, Star } from 'lucide-react';
import Image from 'next/image';
import { colors } from './HomePage';

interface CombinedCTASectionProps {
  session: Session | null;
  stats: {
    totalStudios: number;
    totalUsers: number;
  };
}

// Animated counter hook
const useCountUp = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const animate = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    const startTime = Date.now();
    const startCount = 0;

    const updateCount = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(startCount + (end - startCount) * easeOutQuart);
      
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(updateCount);
  };

  return { count, animate };
};

export function CombinedCTASection({ stats }: CombinedCTASectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  
  const studiosCounter = useCountUp(stats.totalStudios, 2000);
  const usersCounter = useCountUp(stats.totalUsers, 2500);
  const countriesCounter = useCountUp(50, 1500);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          // Start animations with slight delays
          setTimeout(() => studiosCounter.animate(), 200);
          setTimeout(() => usersCounter.animate(), 400);
          setTimeout(() => countriesCounter.animate(), 600);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible, studiosCounter, usersCounter, countriesCounter]);

  return (
    <div ref={sectionRef} className="relative py-16 overflow-hidden">
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
      <div className="relative z-10 py-16 w-full">
        <div className="max-w-7xl mx-auto px-6">
        {/* Stats Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#ffffff' }}>
            Built by Voice Artists<br />
            Loved by Studio Owners
          </h2>
          <p className={`text-xl text-center transition-all duration-1000 ease-out text-white ${
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.2s', maxWidth: '768px', margin: '0 auto' }}>
            Join the fastest-growing global hub for voiceover talent and recording studios. Already trusted by creatives in 50+ countries.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            { 
              icon: Building, 
              number: `${studiosCounter.count.toLocaleString()}+`, 
              label: 'Recording Studios', 
              color: '#ffffff',
              points: ['Professional facilities worldwide', 'Verified locations and equipment', 'Direct booking capabilities', 'Competitive pricing options']
            },
            { 
              icon: Users, 
              number: `${usersCounter.count.toLocaleString()}+`, 
              label: 'Registered Users', 
              color: '#ff9800',
              points: ['Voice artists and studio owners', 'Active community members', 'Verified professional profiles', 'Growing network daily']
            },
            { 
              icon: Star, 
              number: `${countriesCounter.count}+`, 
              label: 'Countries', 
              color: '#4caf50',
              points: ['Global reach and coverage', 'Local studios in major cities', 'International collaboration', 'Multi-timezone support']
            }
          ].map((stat, index) => (
            <div key={index} className={`text-center transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: `${0.2 + index * 0.2}s` }}>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transform hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <stat.icon className="w-8 h-8" style={{ color: stat.color }} />
              </div>
              <div className="text-3xl font-bold mb-2 text-white">
                {stat.number}
              </div>
              <div className="text-white text-lg font-semibold mb-3">{stat.label}</div>
              <ul className="space-y-2 text-sm text-white">
                {stat.points.map((point, pointIndex) => (
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
    </div>
  );
}
