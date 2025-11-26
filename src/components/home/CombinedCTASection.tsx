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
    totalCountries: number;
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
  const [storyPhase, setStoryPhase] = useState<'section1' | 'section2' | 'section3' | 'full'>('section1');
  const [fadeState, setFadeState] = useState<'in' | 'visible' | 'out'>('in');
  const sectionRef = useRef<HTMLDivElement>(null);
  const animationStartedRef = useRef(false);
  
  const studiosCounter = useCountUp(stats.totalStudios, 2000);
  const usersCounter = useCountUp(stats.totalUsers, 2500);
  const countriesCounter = useCountUp(stats.totalCountries, 1500);

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

  // Story animation sequence
  useEffect(() => {
    if (!isVisible || animationStartedRef.current) return;
    animationStartedRef.current = true;

    const sequence = [
      { phase: 'section1' as const, duration: 10000 },
      { phase: 'section2' as const, duration: 10000 },
      { phase: 'section3' as const, duration: 10000 },
      { phase: 'full' as const, duration: 0 }
    ];

    let currentIndex = 0;

    const runSequence = () => {
      if (currentIndex >= sequence.length) return;

      const current = sequence[currentIndex];
      
      // Fade in
      setFadeState('in');
      setStoryPhase(current.phase);

      setTimeout(() => {
        setFadeState('visible');

        if (current.duration > 0) {
          // Stay visible, then fade out
          setTimeout(() => {
            setFadeState('out');

            // After fade out, move to next
            setTimeout(() => {
              currentIndex++;
              runSequence();
            }, 500); // Fade out duration
          }, current.duration);
        }
      }, 500); // Fade in duration
    };

    runSequence();
  }, [isVisible]);

  return (
    <div ref={sectionRef} className="relative py-8 overflow-hidden">
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
      <div className="relative z-10 py-8 w-full">
        <div className="max-w-7xl mx-auto px-6">
        {/* Founder Story Section */}
        <div className="text-center mb-16">
          <h2 className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-12 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Why I Built This Platform
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-7xl mx-auto">
            {/* Founder Image */}
            <div className={`relative transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'
            }`} style={{ transitionDelay: '0.3s' }}>
              <div className="relative rounded-lg overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-500">
                <Image
                  src="/founder-guy-harris-voiceover-studio.jpg"
                  alt="Guy Harris - Founder of Voiceover Studio Finder recording in professional studio"
                  width={600}
                  height={400}
                  className="object-cover w-full h-auto"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              </div>
            </div>

            {/* Story Text */}
            <div className="text-left text-white relative min-h-[400px] lg:min-h-[500px]">
              {/* Section 1 */}
              <div className={`absolute inset-0 transition-opacity duration-500 ${
                storyPhase === 'section1' && fadeState !== 'out' ? 'opacity-100' : 'opacity-0'
              }`}>
                <p className="text-base md:text-lg leading-relaxed">
                  "I created Voiceover Studio Finder for a very simple reason: my own studio kept making money while I was literally sat there checking emails. Years ago, a voiceover reached out because they were nearby and needed a professional booth. I said yes - and that became the first of dozens of sessions where I earned £150-£200 simply by letting someone use the space...
                </p>
              </div>

              {/* Section 2 */}
              <div className={`absolute inset-0 transition-opacity duration-500 ${
                storyPhase === 'section2' && fadeState !== 'out' ? 'opacity-100' : 'opacity-0'
              }`}>
                <p className="text-base md:text-lg leading-relaxed">
                  "Recently, a local actress from Doncaster recorded a TV commercial here because she didn't have a booth at home - the agency were in Cardiff, so my studio was the perfect middle-ground. Two months ago, an American voice artist on holiday in the UK patched through to the USA for a TV ad, and I earned £175 while she worked...
                </p>
              </div>

              {/* Section 3 */}
              <div className={`absolute inset-0 transition-opacity duration-500 ${
                storyPhase === 'section3' && fadeState !== 'out' ? 'opacity-100' : 'opacity-0'
              }`}>
                <p className="text-base md:text-lg leading-relaxed mb-4">
                  "It hit me... there are thousands of studios like mine - home booths, pro booths, podcast rooms - all sitting empty for hours a day. And there are thousands of voiceovers desperately needing somewhere local and reliable to record.
                </p>
                <p className="text-base md:text-lg leading-relaxed">
                  So I built the website I wished existed: a clean, simple, no-commission platform to connect the two."
                </p>
                <p className="text-sm md:text-base font-semibold mt-6" style={{ color: colors.primary }}>
                  - British Male Voiceover Guy Harris, Founder
                </p>
              </div>

              {/* Full Story */}
              <div className={`absolute inset-0 transition-opacity duration-500 ${
                storyPhase === 'full' && fadeState !== 'out' ? 'opacity-100' : 'opacity-0'
              }`}>
                <p className="text-base md:text-lg leading-relaxed mb-4">
                  "I created Voiceover Studio Finder for a very simple reason: my own studio kept making money while I was literally sat there checking emails. Years ago, a voiceover reached out because they were nearby and needed a professional booth. I said yes - and that became the first of dozens of sessions where I earned £150-£200 simply by letting someone use the space.
                </p>
                <p className="text-base md:text-lg leading-relaxed mb-4">
                  Recently, a local actress from Doncaster recorded a TV commercial here because she didn't have a booth at home - the agency were in Cardiff, so my studio was the perfect middle-ground. Two months ago, an American voice artist on holiday in the UK patched through to the USA for a TV ad, and I earned £175 while she worked.
                </p>
                <p className="text-base md:text-lg leading-relaxed mb-4">
                  It hit me... there are thousands of studios like mine - home booths, pro booths, podcast rooms - all sitting empty for hours a day. And there are thousands of voiceovers desperately needing somewhere local and reliable to record.
                </p>
                <p className="text-base md:text-lg leading-relaxed mb-4">
                  So I built the website I wished existed: a clean, simple, no-commission platform to connect the two."
                </p>
                <p className="text-sm md:text-base font-semibold mt-6" style={{ color: colors.primary }}>
                  - British Male Voiceover Guy Harris, Founder
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`text-center mb-12 mt-16 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`} style={{ transitionDelay: '0.6s' }}>
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold" style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Join Our Growing Community
          </h3>
        </div>
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
