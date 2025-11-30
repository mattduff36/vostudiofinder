'use client';

import { Session } from 'next-auth';
import { useState, useEffect, useRef } from 'react';
import { Building, Users, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
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
  const [nextSection, setNextSection] = useState(1);
  const [textVisible, setTextVisible] = useState(false);
  const [imageVisible, setImageVisible] = useState(false);
  const [kenBurnsActive, setKenBurnsActive] = useState(false);
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

  // Story animation sequence - cycle through images only
  useEffect(() => {
    if (!isVisible || animationStartedRef.current) return;
    animationStartedRef.current = true;

    // Initial fade in of text and first image
    setTimeout(() => {
      setImageVisible(true);
      setTextVisible(true);
      // Start Ken Burns effect after image is visible
      setTimeout(() => {
        setKenBurnsActive(true);
      }, 100);
    }, 100);

    // Sequence timing - cycle through images
    const runSequence = (imageNum: number) => {
      if (imageNum > 3) {
        // Loop back to first image
        runSequence(1);
        return;
      }

      const displayDuration = 10000; // 10 seconds per image

      setTimeout(() => {
        // Fade out current image and reset Ken Burns
        setImageVisible(false);
        setKenBurnsActive(false);
        
        // After 500ms, start fading in next image (overlap)
        setTimeout(() => {
          const nextImg = imageNum === 3 ? 1 : imageNum + 1;
          setNextSection(nextImg);
          setImageVisible(true);
          
          // Start Ken Burns effect after new image is visible
          setTimeout(() => {
            setKenBurnsActive(true);
          }, 100);
          
          // Continue to next image
          runSequence(nextImg);
        }, 500); // Image cross-fade overlap
      }, displayDuration);
    };

    runSequence(1);
  }, [isVisible]);

  const getImageSrc = () => {
    if (nextSection === 1) return '/Image1.png';
    if (nextSection === 2) return '/Image2.png';
    return '/Image3.png';
  };

  const getContent = () => {
    return (
      <>
        <p className="text-sm leading-relaxed text-white">
          "Voiceover Studio Finder was created when my own studio started earning money while I sat answering emails. Emmerdale actors would pop in to record. Chris Kamara now books my booth because it's nearby. Travelling voiceovers with last-minute jobs used it too. Over time, it became pretty damn lucrative.
        </p>
        <br />
        <p className="text-sm leading-relaxed text-white">
          I wanted other voiceovers to earn the same extra income, and to show agencies that amazing studios exist outside London and Manchester.
        </p>
        <br />
        <p className="text-sm leading-relaxed text-white">
          Talking to other voice artists, it became clear that lots of great studios sit empty… while voiceovers and agencies urgently need reliable, local places to record.
        </p>
        <br />
        <p className="text-sm leading-relaxed text-white">
          So I built the platform I wished existed: a clean, simple, no-commission way to connect the two."
        </p>
        <br />
        <p className="text-xs font-semibold text-red-500 text-right">
          - British Male Voiceover Guy Harris, Founder
        </p>
      </>
    );
  };

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
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[500px]">
            {/* Image on Left - Fade + Ken Burns effect, cycles through 3 images */}
            <div className={`relative rounded-lg overflow-hidden shadow-2xl transition-opacity duration-600 ${
              imageVisible ? 'opacity-100' : 'opacity-0'
            }`}>
              <div 
                key={`ken-burns-${nextSection}`}
                className={`transition-all duration-[10000ms] ease-out ${
                  kenBurnsActive ? 'scale-110 rotate-2' : 'scale-100 rotate-0'
                }`}
              >
                <Image
                  src={getImageSrc()}
                  alt="Guy Harris Studio"
                  width={600}
                  height={400}
                  className="object-cover w-full h-auto"
                  priority
                  unoptimized
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            </div>

            {/* Text on Right - Fade in once and stay static */}
            <div className={`relative flex items-center transition-opacity duration-1000 ${
              textVisible ? 'opacity-100' : 'opacity-0'
            }`}>
              <div className="w-full">
                {getContent()}
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
          <Link href="/auth/signup" className="px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: colors.background, color: colors.primary }}>
            List Your Studio - £25/year
          </Link>
          <Link href="/studios" className="px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl" style={{ border: `1px solid ${colors.background}`, color: colors.background, backgroundColor: 'transparent' }}>
            Browse Studios
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}
