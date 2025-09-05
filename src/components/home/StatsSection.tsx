'use client';

import { useState, useEffect, useRef } from 'react';
import { Building, Users, Star, Globe } from 'lucide-react';
import Image from 'next/image';
import { colors } from './HomePage';

interface StatsSectionProps {
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

export function StatsSection({ stats }: StatsSectionProps) {
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
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/bakground-images/21920-7.jpg"
          alt="Stats background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className={`text-center mb-12 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <h2 className="text-3xl font-bold mb-4" style={{ color: colors.textPrimary }}>
            Trusted by Voice Professionals Worldwide
          </h2>
          <p className={`text-xl max-w-3xl mx-auto transition-all duration-1000 ease-out ${
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.2s', color: colors.textSecondary }}>
            Join thousands of voice artists and studio owners who use VoiceoverStudioFinder 
            to connect and collaborate on projects.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: Building, number: `${studiosCounter.count.toLocaleString()}+`, label: 'Recording Studios', color: colors.primary },
            { icon: Users, number: `${usersCounter.count.toLocaleString()}+`, label: 'Registered Users', color: '#ff9800' },
            { icon: Star, number: `${countriesCounter.count}+`, label: 'Countries', color: '#4caf50' },
            { icon: Globe, number: '24/7', label: 'Global Access', color: '#2196f3' }
          ].map((stat, index) => (
            <div key={index} className={`text-center transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: `${0.2 + index * 0.2}s` }}>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transform hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <stat.icon className="w-8 h-8" style={{ color: stat.color }} />
              </div>
              <div className="text-3xl font-bold mb-2" style={{ color: colors.textPrimary }}>
                {stat.number}
              </div>
              <div style={{ color: colors.textSecondary }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
