'use client';

import { Session } from 'next-auth';
import { useState, useEffect, useRef } from 'react';
import { Building, Users, Star, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { colors } from './HomePage';
import { getPromoConfig, getSignupCtaText } from '@/lib/promo';

interface CombinedCTASectionProps {
  session: Session | null;
  stats: {
    totalStudios: number;
    totalUsers: number;
    totalCountries: number;
  };
  /** Server-side promo state from database */
  isPromoActive?: boolean;
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

export function CombinedCTASection({ stats, isPromoActive }: CombinedCTASectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [nextSection, setNextSection] = useState(1);
  const [textVisible, setTextVisible] = useState(false);
  const [imageVisible, setImageVisible] = useState(false);
  const [kenBurnsActive, setKenBurnsActive] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const animationStartedRef = useRef(false);
  const promoConfig = getPromoConfig();
  
  // Use prop if provided, otherwise fall back to env-based config
  const promoActive = isPromoActive !== undefined ? isPromoActive : promoConfig.isActive;
  const signupCtaText = promoActive ? 'List Your Studio' : getSignupCtaText();
  
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
      <div className="px-2 sm:px-0">
        <p className="text-xs sm:text-sm leading-relaxed text-white text-left">
          "Voiceover Studio Finder was created when my own studio earnt money while I sat answering emails. Emmerdale actors would pop in to record. Chris Kamara now books my booth because it's nearby. Travelling voiceovers with last-minute jobs used it too. Over time, it became pretty damn lucrative.
        </p>
        <br />
        <p className="text-xs sm:text-sm leading-relaxed text-white text-left">
          I wanted other voiceovers to earn the same extra income, and to show agencies that amazing studios exist outside London and Manchester.
        </p>
        <br />
        <p className="text-xs sm:text-sm leading-relaxed text-white text-left">
          Talking to other voice artists, it became clear that lots of great studios sit empty… while voiceovers and agencies urgently need reliable, local places to record.
        </p>
        <br />
        <p className="text-xs sm:text-sm leading-relaxed text-white text-left">
          So I built the platform I wished existed: a clean, simple, no-commission way to connect the two."
        </p>
        <br />
        <p className="text-xs font-semibold text-left">
          <span className="text-red-500">-</span>{' '}
            <a 
              href="https://www.voiceoverguy.co.uk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-red-500 hover:text-red-600 hover:underline transition-all duration-200 font-semibold"
            >
              British Male Voiceover Guy Harris, Founder
            </a>
        </p>
      </div>
    );
  };

  return (
    <div ref={sectionRef} className="relative py-6 sm:py-8 overflow-hidden w-full max-w-full">
      {/* Background Banner Image */}
      <div className="absolute inset-0 overflow-hidden">
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
      <div className="relative z-10 py-6 sm:py-8 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Founder Story Section */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-8 sm:mb-10 md:mb-12 transition-all duration-1000 px-2 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Why Voiceover Studio Finder Exists
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] gap-4 sm:gap-6 lg:gap-3 items-center min-h-[400px] sm:min-h-[500px]">
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
        <div className={`text-center mb-8 sm:mb-10 md:mb-12 mt-12 sm:mt-14 md:mt-16 transition-all duration-1000 px-2 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`} style={{ transitionDelay: '0.6s' }}>
          <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold" style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Join Our Growing Community
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {[
            { 
              icon: Building, 
              number: `${studiosCounter.count.toLocaleString()}+`, 
              label: 'Recording Studios', 
              color: '#ffffff',
              points: [
                'Professional facilities worldwide', 
                'Verified locations and equipment', 
                'Direct booking capabilities', 
                promoActive ? `List FREE (normally ${promoConfig.normalPrice})` : 'Competitive pricing options'
              ]
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
            <div key={index} className={`text-center transition-all duration-1000 px-2 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`} style={{ transitionDelay: `${0.2 + index * 0.2}s` }}>
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 transform hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <stat.icon className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: stat.color }} />
              </div>
              <div className="text-2xl sm:text-3xl font-bold mb-2 text-white">
                {stat.number}
              </div>
              <div className="text-white text-base sm:text-lg font-semibold mb-2 sm:mb-3">{stat.label}</div>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-white">
                {stat.points.map((point, pointIndex) => (
                  <li key={pointIndex}>• {point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-2">
          <Link href="/auth/signup" className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl text-center relative" style={{ backgroundColor: colors.background, color: colors.primary }}>
            {promoActive && (
              <span className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                FREE
              </span>
            )}
            {signupCtaText}
          </Link>
          <Link href="/studios" className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl text-center" style={{ border: `1px solid ${colors.background}`, color: colors.background, backgroundColor: 'transparent' }}>
            Browse Studios
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}
