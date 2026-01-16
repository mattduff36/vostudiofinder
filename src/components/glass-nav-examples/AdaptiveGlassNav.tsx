'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, User } from 'lucide-react';
import { Session } from 'next-auth';
import type { GlassCustomization } from '@/app/glass-nav-test/page';

interface AdaptiveGlassNavProps {
  mode: 'static' | 'auto-hide' | 'minimal';
  session: Session | null;
  onMenuClick: () => void;
  customization?: GlassCustomization;
}

export function AdaptiveGlassNav({ mode, session, onMenuClick, customization }: AdaptiveGlassNavProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDarkBackground, setIsDarkBackground] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Use customization if provided, otherwise use defaults
  const config = customization || {
    blur: 40,
    saturation: 200,
    brightness: 1.15,
    contrast: 0.85,
    backgroundOpacity: 0.45,
    borderWidth: 0.5,
    borderOpacity: 0.3,
    circleSize: 56,
    pillPaddingX: 12,
    pillPaddingY: 6,
    fontSize: 11,
    shadowIntensity: 0.15,
    shadowSpread: 40,
    hoverLift: 4,
    hoverScale: 1.08,
    adaptiveEnabled: true,
    darkBrightness: 1.4,
    lightBrightness: 0.95,
    luminanceThreshold: 0.4,
  };

  // Detect background brightness dynamically with debouncing
  useEffect(() => {
    if (!navRef.current || !config.adaptiveEnabled) return;

    let timeoutId: NodeJS.Timeout;
    let lastLuminance = 0.5;

    const detectBackgroundBrightness = () => {
      if (!navRef.current) return;

      // Get the element behind the nav
      const rect = navRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      // Temporarily hide nav to sample background
      navRef.current.style.pointerEvents = 'none';
      navRef.current.style.opacity = '0';
      const elementBehind = document.elementFromPoint(x, y);
      navRef.current.style.pointerEvents = '';
      navRef.current.style.opacity = '';

      if (elementBehind) {
        const computedStyle = window.getComputedStyle(elementBehind);
        const bgColor = computedStyle.backgroundColor;

        // Parse RGB values
        const rgb = bgColor.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          // Calculate relative luminance
          const r = parseInt(rgb[0]);
          const g = parseInt(rgb[1]);
          const b = parseInt(rgb[2]);
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          // Add hysteresis to prevent flashing
          // Only change if luminance differs significantly from last reading
          const threshold = 0.15;
          if (Math.abs(luminance - lastLuminance) > threshold) {
            lastLuminance = luminance;
            // Use customizable threshold
            setIsDarkBackground(luminance < config.luminanceThreshold);
          }
        }
      }
    };

    // Initial detection with delay
    const initialTimeout = setTimeout(detectBackgroundBrightness, 100);

    // Debounced scroll handler
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        requestAnimationFrame(detectBackgroundBrightness);
      }, 150);
    };

    // Debounced resize handler
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        requestAnimationFrame(detectBackgroundBrightness);
      }, 200);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    
    // Check less frequently - every 2 seconds instead of 500ms
    const interval = setInterval(detectBackgroundBrightness, 2000);

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, [config.adaptiveEnabled, config.luminanceThreshold]);

  useEffect(() => {
    if (mode !== 'auto-hide') {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, mode]);

  const navItems = [
    { label: 'Home', icon: Home, href: '/', active: pathname === '/' },
    { label: 'Studios', icon: Search, href: '/studios', active: pathname === '/studios' },
    { label: 'Profile', icon: User, href: `/${session?.user?.username || 'user'}`, active: false },
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', active: pathname === '/dashboard' },
  ];

  if (mode === 'minimal') {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="relative">
          {isExpanded && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-2 mb-3">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className="adaptive-minimal-item"
                      style={{
                        animation: `adaptiveFadeIn 0.4s ease-out ${index * 0.05}s both`,
                      }}
                    >
                      <Icon className={`w-5 h-5 ${item.active ? 'text-[#d42027]' : ''}`} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <button onClick={() => setIsExpanded(!isExpanded)} className="adaptive-fab">
            <Menu className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        <style jsx global>{`
          @keyframes adaptiveFadeIn {
            from {
              opacity: 0;
              transform: translateY(10px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .adaptive-minimal-item {
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: color-mix(in srgb, Canvas 50%, transparent);
            backdrop-filter: blur(20px) saturate(180%) brightness(1.1) contrast(0.9);
            -webkit-backdrop-filter: blur(20px) saturate(180%) brightness(1.1) contrast(0.9);
            border: 1px solid color-mix(in srgb, Canvas 20%, transparent);
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.12),
              0 2px 8px rgba(0, 0, 0, 0.08),
              inset 0 1px 2px color-mix(in srgb, Canvas 80%, transparent);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            color: CanvasText;
          }

          .adaptive-minimal-item:hover {
            transform: scale(1.1);
            background: color-mix(in srgb, Canvas 60%, transparent);
            box-shadow: 
              0 12px 48px rgba(0, 0, 0, 0.16),
              0 4px 12px rgba(0, 0, 0, 0.12),
              inset 0 1px 2px color-mix(in srgb, Canvas 90%, transparent);
          }

          .adaptive-fab {
            width: 68px;
            height: 68px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: color-mix(in srgb, Canvas 60%, transparent);
            backdrop-filter: blur(24px) saturate(180%) brightness(1.15) contrast(0.85);
            -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.15) contrast(0.85);
            border: 1.5px solid color-mix(in srgb, Canvas 30%, transparent);
            box-shadow: 
              0 12px 48px rgba(0, 0, 0, 0.15),
              0 4px 16px rgba(0, 0, 0, 0.1),
              inset 0 1px 2px color-mix(in srgb, Canvas 90%, transparent);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            color: CanvasText;
          }

          .adaptive-fab:hover {
            transform: scale(1.08);
            background: color-mix(in srgb, Canvas 70%, transparent);
            box-shadow: 
              0 16px 64px rgba(0, 0, 0, 0.2),
              0 6px 20px rgba(0, 0, 0, 0.12),
              inset 0 1px 2px color-mix(in srgb, Canvas 95%, transparent);
          }
        `}</style>
      </div>
    );
  }

  return (
    <nav
      ref={navRef}
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
      style={{
        padding: '0 max(env(safe-area-inset-left), 1rem) env(safe-area-inset-bottom) max(env(safe-area-inset-right), 1rem)',
      }}
      data-dark-bg={isDarkBackground}
    >
      <div className="mx-auto max-w-lg mb-4">
        {/* Individual floating elements - circles and badge pills only */}
        <div className="flex items-center justify-around gap-3 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-2 group"
              >
                {/* Circular glass bubble for icon */}
                <div className={`adaptive-circle-glass ${item.active ? 'active' : ''} ${isDarkBackground ? 'dark-bg' : 'light-bg'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                {/* Pill/badge glass for label */}
                <span className={`adaptive-pill-glass ${item.active ? 'active' : ''} ${isDarkBackground ? 'dark-bg' : 'light-bg'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button onClick={onMenuClick} className="flex flex-col items-center gap-2 group">
            {/* Circular glass bubble for icon */}
            <div className={`adaptive-circle-glass ${isDarkBackground ? 'dark-bg' : 'light-bg'}`}>
              <Menu className="w-6 h-6" />
            </div>
            {/* Pill/badge glass for label */}
            <span className={`adaptive-pill-glass ${isDarkBackground ? 'dark-bg' : 'light-bg'}`}>Menu</span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        /* CIRCULAR GLASS BUBBLE - For icons only */
        .adaptive-circle-glass {
          display: flex;
          align-items: center;
          justify-content: center;
          width: ${config.circleSize}px;
          height: ${config.circleSize}px;
          border-radius: 50%;
          
          /* Enhanced adaptive glass effect */
          background: color-mix(in srgb, Canvas ${config.backgroundOpacity * 100}%, transparent);
          
          /* Customizable blur and saturation for liquid glass effect */
          backdrop-filter: blur(${config.blur}px) saturate(${config.saturation}%) brightness(${config.brightness}) contrast(${config.contrast});
          -webkit-backdrop-filter: blur(${config.blur}px) saturate(${config.saturation}%) brightness(${config.brightness}) contrast(${config.contrast});
          
          /* Use CanvasText for automatic light/dark text */
          color: CanvasText;
          
          /* Customizable border matching text/icon color */
          border: ${config.borderWidth}px solid rgba(128, 128, 128, ${config.borderOpacity});
          
          /* Customizable shadow for depth */
          box-shadow: 
            0 ${config.shadowSpread / 3}px ${config.shadowSpread}px rgba(0, 0, 0, ${config.shadowIntensity}),
            0 ${config.shadowSpread / 10}px ${config.shadowSpread / 2.5}px rgba(0, 0, 0, ${config.shadowIntensity * 0.67}),
            inset 0 1px 3px color-mix(in srgb, Canvas 90%, transparent),
            inset 0 0 60px color-mix(in srgb, Canvas 30%, transparent);
          
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }

        /* Shimmer effect inside circle */
        .adaptive-circle-glass::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 50% 0%,
            color-mix(in srgb, Canvas 50%, transparent),
            transparent 70%
          );
          pointer-events: none;
          opacity: 0.6;
        }

        /* Circle hover effect */
        .group:hover .adaptive-circle-glass {
          transform: translateY(-${config.hoverLift}px) scale(${config.hoverScale});
          background: color-mix(in srgb, Canvas ${(config.backgroundOpacity + 0.1) * 100}%, transparent);
          backdrop-filter: blur(${config.blur + 8}px) saturate(${config.saturation + 20}%) brightness(${config.brightness + 0.05}) contrast(${config.contrast - 0.05});
          -webkit-backdrop-filter: blur(${config.blur + 8}px) saturate(${config.saturation + 20}%) brightness(${config.brightness + 0.05}) contrast(${config.contrast - 0.05});
          box-shadow: 
            0 ${config.shadowSpread / 2.5}px ${config.shadowSpread * 1.25}px rgba(0, 0, 0, ${config.shadowIntensity * 1.33}),
            0 ${config.shadowSpread / 6.7}px ${config.shadowSpread / 2}px rgba(0, 0, 0, ${config.shadowIntensity}),
            inset 0 1px 3px color-mix(in srgb, Canvas 95%, transparent),
            inset 0 0 80px color-mix(in srgb, Canvas 40%, transparent);
        }

        .group:active .adaptive-circle-glass {
          transform: translateY(-1px) scale(0.98);
        }

        /* Active state circle with red accent */
        .adaptive-circle-glass.active {
          background: color-mix(in srgb, rgba(212, 32, 39, 0.25) 60%, Canvas 40%);
          color: #d42027;
          border-color: #d42027;
          backdrop-filter: blur(40px) saturate(220%) brightness(1.1);
          -webkit-backdrop-filter: blur(40px) saturate(220%) brightness(1.1);
          box-shadow: 
            0 12px 40px rgba(212, 32, 39, 0.25),
            0 4px 16px rgba(212, 32, 39, 0.15),
            inset 0 1px 3px rgba(255, 255, 255, 0.3),
            inset 0 0 60px rgba(212, 32, 39, 0.15);
        }

        /* PILL/BADGE GLASS - For labels only */
        .adaptive-pill-glass {
          display: inline-block;
          padding: ${config.pillPaddingY}px ${config.pillPaddingX}px;
          border-radius: 16px;
          
          /* Enhanced adaptive glass effect */
          background: color-mix(in srgb, Canvas ${config.backgroundOpacity * 100}%, transparent);
          
          /* Customizable blur and saturation */
          backdrop-filter: blur(${config.blur}px) saturate(${config.saturation}%) brightness(${config.brightness}) contrast(${config.contrast});
          -webkit-backdrop-filter: blur(${config.blur}px) saturate(${config.saturation}%) brightness(${config.brightness}) contrast(${config.contrast});
          
          /* Automatic text color adaptation */
          color: CanvasText;
          
          /* Customizable border matching text color */
          border: ${config.borderWidth}px solid rgba(128, 128, 128, ${config.borderOpacity});
          
          font-size: ${config.fontSize}px;
          font-weight: 600;
          letter-spacing: 0.02em;
          
          /* Customizable shadow for depth */
          box-shadow: 
            0 ${config.shadowSpread / 5}px ${config.shadowSpread / 1.67}px rgba(0, 0, 0, ${config.shadowIntensity * 0.8}),
            0 ${config.shadowSpread / 20}px ${config.shadowSpread / 5}px rgba(0, 0, 0, ${config.shadowIntensity * 0.53}),
            inset 0 1px 2px color-mix(in srgb, Canvas 90%, transparent),
            inset 0 0 40px color-mix(in srgb, Canvas 30%, transparent);
          
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }

        /* Shimmer effect inside pill */
        .adaptive-pill-glass::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            color-mix(in srgb, Canvas 50%, transparent),
            transparent 60%
          );
          pointer-events: none;
          opacity: 0.5;
        }

        /* Pill hover effect */
        .group:hover .adaptive-pill-glass {
          transform: translateY(-${config.hoverLift / 2}px) scale(${(config.hoverScale - 1) * 0.625 + 1});
          background: color-mix(in srgb, Canvas ${(config.backgroundOpacity + 0.1) * 100}%, transparent);
          backdrop-filter: blur(${config.blur + 8}px) saturate(${config.saturation + 20}%) brightness(${config.brightness + 0.05}) contrast(${config.contrast - 0.05});
          -webkit-backdrop-filter: blur(${config.blur + 8}px) saturate(${config.saturation + 20}%) brightness(${config.brightness + 0.05}) contrast(${config.contrast - 0.05});
          box-shadow: 
            0 ${config.shadowSpread / 3.33}px ${config.shadowSpread / 1.25}px rgba(0, 0, 0, ${config.shadowIntensity * 1.07}),
            0 ${config.shadowSpread / 10}px ${config.shadowSpread / 3.33}px rgba(0, 0, 0, ${config.shadowIntensity * 0.8}),
            inset 0 1px 2px color-mix(in srgb, Canvas 95%, transparent),
            inset 0 0 50px color-mix(in srgb, Canvas 40%, transparent);
        }

        .group:active .adaptive-pill-glass {
          transform: scale(0.98);
        }

        /* Active state pill with red accent */
        .adaptive-pill-glass.active {
          background: color-mix(in srgb, rgba(212, 32, 39, 0.25) 60%, Canvas 40%);
          color: #d42027;
          border-color: #d42027;
          font-weight: 700;
          backdrop-filter: blur(40px) saturate(220%) brightness(1.1);
          -webkit-backdrop-filter: blur(40px) saturate(220%) brightness(1.1);
          box-shadow: 
            0 8px 24px rgba(212, 32, 39, 0.2),
            0 2px 8px rgba(212, 32, 39, 0.12),
            inset 0 1px 2px rgba(255, 255, 255, 0.3),
            inset 0 0 40px rgba(212, 32, 39, 0.15);
        }

        /* DYNAMIC ADAPTATION - Based on actual background brightness */
        
        /* Dark background detected - Use lighter, brighter glass */
        .adaptive-circle-glass.dark-bg,
        .adaptive-pill-glass.dark-bg {
          background: rgba(255, 255, 255, ${config.backgroundOpacity * 0.27});
          backdrop-filter: blur(${config.blur + 4}px) saturate(${config.saturation}%) brightness(${config.darkBrightness}) contrast(${config.contrast * 0.88});
          -webkit-backdrop-filter: blur(${config.blur + 4}px) saturate(${config.saturation}%) brightness(${config.darkBrightness}) contrast(${config.contrast * 0.88});
          color: rgba(255, 255, 255, 0.95);
          border-color: rgba(255, 255, 255, ${config.borderOpacity});
          box-shadow: 
            0 ${config.shadowSpread / 3.33}px ${config.shadowSpread}px rgba(0, 0, 0, ${config.shadowIntensity * 2}),
            0 ${config.shadowSpread / 10}px ${config.shadowSpread / 2.5}px rgba(0, 0, 0, ${config.shadowIntensity * 1.33}),
            inset 0 1px 3px rgba(255, 255, 255, 0.25),
            inset 0 0 60px rgba(255, 255, 255, 0.1);
        }
        
        .group:hover .adaptive-circle-glass.dark-bg,
        .group:hover .adaptive-pill-glass.dark-bg {
          background: rgba(255, 255, 255, ${config.backgroundOpacity * 0.4});
          backdrop-filter: blur(${config.blur + 12}px) saturate(${config.saturation + 20}%) brightness(${config.darkBrightness + 0.1}) contrast(${config.contrast * 0.82});
          -webkit-backdrop-filter: blur(${config.blur + 12}px) saturate(${config.saturation + 20}%) brightness(${config.darkBrightness + 0.1}) contrast(${config.contrast * 0.82});
          border-color: rgba(255, 255, 255, ${config.borderOpacity + 0.1});
          box-shadow: 
            0 ${config.shadowSpread / 2.5}px ${config.shadowSpread * 1.25}px rgba(0, 0, 0, ${config.shadowIntensity * 2.33}),
            0 ${config.shadowSpread / 6.67}px ${config.shadowSpread / 2}px rgba(0, 0, 0, ${config.shadowIntensity * 1.67}),
            inset 0 1px 3px rgba(255, 255, 255, 0.3),
            inset 0 0 80px rgba(255, 255, 255, 0.15);
        }

        .adaptive-circle-glass.dark-bg::before,
        .adaptive-pill-glass.dark-bg::before {
          background: radial-gradient(
            circle at 50% 0%,
            rgba(255, 255, 255, 0.25),
            transparent 70%
          );
          opacity: 0.8;
        }

        /* Light background detected - Use darker, more subtle glass */
        .adaptive-circle-glass.light-bg,
        .adaptive-pill-glass.light-bg {
          background: rgba(0, 0, 0, ${config.backgroundOpacity * 0.18});
          backdrop-filter: blur(${config.blur - 2}px) saturate(${config.saturation}%) brightness(${config.lightBrightness}) contrast(${config.contrast * 1.29});
          -webkit-backdrop-filter: blur(${config.blur - 2}px) saturate(${config.saturation}%) brightness(${config.lightBrightness}) contrast(${config.contrast * 1.29});
          color: rgba(0, 0, 0, 0.85);
          border-color: rgba(0, 0, 0, ${config.borderOpacity * 0.67});
          box-shadow: 
            0 ${config.shadowSpread / 3.33}px ${config.shadowSpread}px rgba(0, 0, 0, ${config.shadowIntensity * 0.53}),
            0 ${config.shadowSpread / 10}px ${config.shadowSpread / 2.5}px rgba(0, 0, 0, ${config.shadowIntensity * 0.33}),
            inset 0 1px 3px rgba(0, 0, 0, 0.05),
            inset 0 0 60px rgba(0, 0, 0, 0.03);
        }
        
        .group:hover .adaptive-circle-glass.light-bg,
        .group:hover .adaptive-pill-glass.light-bg {
          background: rgba(0, 0, 0, ${config.backgroundOpacity * 0.27});
          backdrop-filter: blur(${config.blur + 6}px) saturate(${config.saturation + 20}%) brightness(${config.lightBrightness - 0.03}) contrast(${config.contrast * 1.35});
          -webkit-backdrop-filter: blur(${config.blur + 6}px) saturate(${config.saturation + 20}%) brightness(${config.lightBrightness - 0.03}) contrast(${config.contrast * 1.35});
          border-color: rgba(0, 0, 0, ${config.borderOpacity * 0.83});
          box-shadow: 
            0 ${config.shadowSpread / 2.5}px ${config.shadowSpread * 1.25}px rgba(0, 0, 0, ${config.shadowIntensity * 0.8}),
            0 ${config.shadowSpread / 6.67}px ${config.shadowSpread / 2}px rgba(0, 0, 0, ${config.shadowIntensity * 0.53}),
            inset 0 1px 3px rgba(0, 0, 0, 0.08),
            inset 0 0 80px rgba(0, 0, 0, 0.05);
        }

        .adaptive-circle-glass.light-bg::before,
        .adaptive-pill-glass.light-bg::before {
          background: radial-gradient(
            circle at 50% 0%,
            rgba(0, 0, 0, 0.08),
            transparent 70%
          );
          opacity: 0.5;
        }
      `}</style>
    </nav>
  );
}
