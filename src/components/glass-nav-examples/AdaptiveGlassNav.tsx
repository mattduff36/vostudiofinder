'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, User } from 'lucide-react';
import { Session } from 'next-auth';
import type { GlassCustomization } from '@/types/glass-customization';

interface AdaptiveGlassNavProps {
  mode: 'static' | 'auto-hide' | 'minimal';
  session: Session | null;
  onMenuClick: () => void;
  customization?: GlassCustomization;
  debugSensors?: boolean;
}

const DEFAULT_CONFIG = {
  blur: 5,
  saturation: 100,
  brightness: 1.15,
  contrast: 1.05,
  backgroundOpacity: 0.05,
  borderWidth: 1,
  borderOpacity: 1,
  circleSize: 56,
  pillPaddingX: 12,
  pillPaddingY: 6,
  fontSize: 11,
  shadowIntensity: 0,
  shadowSpread: 0,
  hoverLift: 4,
  hoverScale: 1.08,
  adaptiveEnabled: true,
  darkBrightness: 1.15,
  lightBrightness: 0.95,
  luminanceThreshold: 0.4,
};

export function AdaptiveGlassNav({ mode, session, onMenuClick, customization, debugSensors = false }: AdaptiveGlassNavProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDarkBackground, setIsDarkBackground] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use customization if provided, otherwise use defaults
  const config = customization || DEFAULT_CONFIG;

  // Debug: Log when customization prop changes
  useEffect(() => {
    console.log('🎨 AdaptiveGlassNav RECEIVED customization prop:', customization);
    console.log('⚙️ AdaptiveGlassNav USING config:', config);
  }, [customization, config]);

  // Debug: Verify CSS variables are actually applied to the DOM
  useEffect(() => {
    if (containerRef.current) {
      const computedStyle = window.getComputedStyle(containerRef.current);
      const actualBlur = containerRef.current.style.getPropertyValue('--glass-blur');
      const actualSaturation = containerRef.current.style.getPropertyValue('--glass-saturation');
      const actualBrightness = containerRef.current.style.getPropertyValue('--glass-brightness');
      const actualContrast = containerRef.current.style.getPropertyValue('--glass-contrast');
      
      console.log('🔍 CSS VARIABLES APPLIED TO DOM:', {
        '--glass-blur': actualBlur,
        '--glass-saturation': actualSaturation,
        '--glass-brightness': actualBrightness,
        '--glass-contrast': actualContrast,
      });
      
      // Also check the actual button element
      const button = containerRef.current.querySelector('.adaptive-circle-glass');
      if (button) {
        const buttonStyle = window.getComputedStyle(button);
        console.log('🎯 BUTTON COMPUTED STYLES:', {
          'backdrop-filter': buttonStyle.backdropFilter,
          'width': buttonStyle.width,
          'height': buttonStyle.height,
          'background': buttonStyle.background,
        });
      }
    }
  }, [config]);

  // Detect background brightness dynamically with debouncing
  useEffect(() => {
    if (!navRef.current || !config.adaptiveEnabled) return;

    let timeoutId: NodeJS.Timeout;
    let lastLuminance = 0.5;

    const detectBackgroundBrightness = () => {
      if (!navRef.current) return;

      // Get all button elements (glass circles)
      const buttons = navRef.current.querySelectorAll('.adaptive-circle-glass');
      if (buttons.length === 0) return;

      const luminanceValues: number[] = [];

      // Remove old debug markers if they exist
      if (debugSensors) {
        document.querySelectorAll('.sensor-debug-marker').forEach(el => el.remove());
      }

      // Temporarily hide nav to sample background
      navRef.current.style.pointerEvents = 'none';
      navRef.current.style.opacity = '0';

      // Sample 4 points around each button's edges
      buttons.forEach((button) => {
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const radius = rect.width / 2;

        // 4 sample points around the button edges (top, right, bottom, left)
        // Now positioned just 1px away from button edge for more accurate local sampling
        const samplePoints = [
          { x: centerX, y: rect.top - 1, color: '#ff0000', label: 'T' },              // Top (red)
          { x: rect.right + 1, y: centerY, color: '#00ff00', label: 'R' },            // Right (green)
          { x: centerX, y: rect.bottom + 1, color: '#0000ff', label: 'B' },           // Bottom (blue)
          { x: rect.left - 1, y: centerY, color: '#ffff00', label: 'L' }              // Left (yellow)
        ];

        samplePoints.forEach((point) => {
          // Create visual debug marker (dev only)
          if (debugSensors) {
            const marker = document.createElement('div');
            marker.className = 'sensor-debug-marker';
            marker.style.cssText = `
              position: fixed;
              left: ${point.x - 6}px;
              top: ${point.y - 6}px;
              width: 12px;
              height: 12px;
              background: ${point.color};
              border: 2px solid white;
              border-radius: 50%;
              z-index: 9999;
              pointer-events: none;
              box-shadow: 0 0 4px rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 8px;
              font-weight: bold;
              color: white;
              text-shadow: 0 0 2px black;
            `;
            marker.textContent = point.label;
            document.body.appendChild(marker);
          }

          // Get the topmost element at this point
          let elementBehind = document.elementFromPoint(point.x, point.y);
          
          if (elementBehind) {
            // Walk up the tree to find an element with an actual background color
            // This ensures we get the frontmost visible background, not a transparent overlay
            let currentElement = elementBehind;
            let foundValidBackground = false;
            let attempts = 0;
            const maxAttempts = 10; // Prevent infinite loops

            while (currentElement && attempts < maxAttempts) {
              const computedStyle = window.getComputedStyle(currentElement);
              const bgColor = computedStyle.backgroundColor;
              
              // Check if this element has a non-transparent background
              const rgb = bgColor.match(/\d+/g);
              if (rgb && rgb.length >= 3) {
                const r = parseInt(rgb[0]);
                const g = parseInt(rgb[1]);
                const b = parseInt(rgb[2]);
                const alpha = rgb.length >= 4 ? parseFloat(rgb[3]) : 1;

                // If background has some opacity, use it
                if (alpha > 0.1) {
                  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                  luminanceValues.push(luminance);
                  foundValidBackground = true;
                  break;
                }
              }

              // Move to parent element
              currentElement = currentElement.parentElement;
              attempts++;
            }
          }
        });
      });

      // Restore nav visibility
      navRef.current.style.pointerEvents = '';
      navRef.current.style.opacity = '';

      // Calculate average luminance from all samples
      if (luminanceValues.length > 0) {
        const avgLuminance = luminanceValues.reduce((a, b) => a + b, 0) / luminanceValues.length;

        // Add hysteresis to prevent flashing
        // Only change if luminance differs significantly from last reading
        const threshold = 0.15;
        if (Math.abs(avgLuminance - lastLuminance) > threshold) {
          lastLuminance = avgLuminance;
          // Use customizable threshold
          setIsDarkBackground(avgLuminance < config.luminanceThreshold);
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
  }, [config.adaptiveEnabled, config.luminanceThreshold, debugSensors]);

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
        '--glass-blur': `${config.blur}px`,
        '--glass-saturation': `${config.saturation}%`,
        '--glass-brightness': String(config.brightness),
        '--glass-contrast': String(config.contrast),
        '--glass-bg-opacity': String(config.backgroundOpacity),
        '--glass-border-width': `${config.borderWidth}px`,
        '--glass-border-opacity': String(config.borderOpacity),
        '--glass-shadow-intensity': String(config.shadowIntensity),
        '--glass-shadow-spread': `${config.shadowSpread}px`,
        '--glass-hover-lift': `${config.hoverLift}px`,
        '--glass-hover-scale': String(config.hoverScale),
      } as React.CSSProperties}
      data-dark-bg={isDarkBackground}
    >
      <div 
        ref={containerRef}
        className="mx-auto max-w-lg mb-4"
      >
        {/* Individual floating elements - circles and badge pills only */}
        <div className="flex items-center justify-around gap-3 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center group"
              >
                {/* Circular glass bubble for icon */}
                <div 
                  className={`adaptive-circle-glass ${item.active ? 'active' : ''} ${isDarkBackground ? 'dark-bg' : 'light-bg'}`}
                  style={{
                    width: `${config.circleSize}px`,
                    height: `${config.circleSize}px`,
                    backdropFilter: `blur(${config.blur}px) saturate(${config.saturation}%) brightness(${config.brightness}) contrast(${config.contrast})`,
                    WebkitBackdropFilter: `blur(${config.blur}px) saturate(${config.saturation}%) brightness(${config.brightness}) contrast(${config.contrast})`,
                    color: isDarkBackground ? '#ffffff' : '#000000',
                    borderColor: isDarkBackground ? '#ffffff' : '#000000',
                  }}
                >
                  <Icon className="w-6 h-6" />
                </div>
                {/* SAVED STYLING - Pill/badge glass for label (hidden, uncomment to restore) */}
                {/* <span 
                  className={`adaptive-pill-glass ${item.active ? 'active' : ''} ${isDarkBackground ? 'dark-bg' : 'light-bg'}`}
                  style={{
                    padding: `${config.pillPaddingY}px ${config.pillPaddingX}px`,
                    fontSize: `${config.fontSize}px`,
                  }}
                >
                  {item.label}
                </span> */}
              </Link>
            );
          })}

          <button onClick={onMenuClick} className="flex flex-col items-center group">
            {/* Circular glass bubble for icon */}
            <div 
              className={`adaptive-circle-glass ${isDarkBackground ? 'dark-bg' : 'light-bg'}`}
              style={{
                width: `${config.circleSize}px`,
                height: `${config.circleSize}px`,
                backdropFilter: `blur(${config.blur}px) saturate(${config.saturation}%) brightness(${config.brightness}) contrast(${config.contrast})`,
                WebkitBackdropFilter: `blur(${config.blur}px) saturate(${config.saturation}%) brightness(${config.brightness}) contrast(${config.contrast})`,
                color: isDarkBackground ? '#ffffff' : '#000000',
                borderColor: isDarkBackground ? '#ffffff' : '#000000',
              }}
            >
              <Menu className="w-6 h-6" />
            </div>
            {/* SAVED STYLING - Pill/badge glass for label (hidden, uncomment to restore) */}
            {/* <span 
              className={`adaptive-pill-glass ${isDarkBackground ? 'dark-bg' : 'light-bg'}`}
              style={{
                padding: `${config.pillPaddingY}px ${config.pillPaddingX}px`,
                fontSize: `${config.fontSize}px`,
              }}
            >
              Menu
            </span> */}
          </button>
        </div>
      </div>

      <style jsx global>{`
        /* CIRCULAR GLASS BUBBLE - For icons only */
        .adaptive-circle-glass {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          
          /* Enhanced adaptive glass effect */
          background: rgba(128, 128, 128, var(--glass-bg-opacity, 0.45));
          
          /* Customizable blur and saturation for liquid glass effect */
          backdrop-filter: blur(var(--glass-blur, 40px)) saturate(var(--glass-saturation, 200%)) brightness(var(--glass-brightness, 1.15)) contrast(var(--glass-contrast, 0.85));
          -webkit-backdrop-filter: blur(var(--glass-blur, 40px)) saturate(var(--glass-saturation, 200%)) brightness(var(--glass-brightness, 1.15)) contrast(var(--glass-contrast, 0.85));
          
          /* Use CanvasText for automatic light/dark text */
          color: CanvasText;
          
          /* Customizable border matching text/icon color */
          border: var(--glass-border-width, 0.5px) solid rgba(128, 128, 128, var(--glass-border-opacity, 0.3));
          
          /* Customizable shadow for depth */
          box-shadow: 
            0 calc(var(--glass-shadow-spread, 40px) / 3) var(--glass-shadow-spread, 40px) rgba(0, 0, 0, var(--glass-shadow-intensity, 0.15)),
            0 calc(var(--glass-shadow-spread, 40px) / 10) calc(var(--glass-shadow-spread, 40px) / 2.5) rgba(0, 0, 0, calc(var(--glass-shadow-intensity, 0.15) * 0.67)),
            inset 0 1px 3px rgba(255, 255, 255, 0.1),
            inset 0 0 60px rgba(255, 255, 255, 0.05);
          
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
          transform: translateY(calc(-1 * var(--glass-hover-lift, 4px))) scale(var(--glass-hover-scale, 1.08));
          background: rgba(128, 128, 128, calc(var(--glass-bg-opacity, 0.45) + 0.1));
          backdrop-filter: blur(calc(var(--glass-blur, 40px) + 8px)) saturate(calc(var(--glass-saturation, 200%) + 20%)) brightness(calc(var(--glass-brightness, 1.15) + 0.05)) contrast(calc(var(--glass-contrast, 0.85) - 0.05));
          -webkit-backdrop-filter: blur(calc(var(--glass-blur, 40px) + 8px)) saturate(calc(var(--glass-saturation, 200%) + 20%)) brightness(calc(var(--glass-brightness, 1.15) + 0.05)) contrast(calc(var(--glass-contrast, 0.85) - 0.05));
          box-shadow: 
            0 calc(var(--glass-shadow-spread, 40px) / 2.5) calc(var(--glass-shadow-spread, 40px) * 1.25) rgba(0, 0, 0, calc(var(--glass-shadow-intensity, 0.15) * 1.33)),
            0 calc(var(--glass-shadow-spread, 40px) / 6.7) calc(var(--glass-shadow-spread, 40px) / 2) rgba(0, 0, 0, var(--glass-shadow-intensity, 0.15)),
            inset 0 1px 3px rgba(255, 255, 255, 0.15),
            inset 0 0 80px rgba(255, 255, 255, 0.08);
        }

        .group:active .adaptive-circle-glass {
          transform: translateY(-1px) scale(0.98);
        }

        /* Make SVG icon strokes inherit the button color (white on dark, black on light) */
        .adaptive-circle-glass svg {
          stroke: currentColor;
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

        /* ==================== SAVED STYLING - PILL/BADGE GLASS ====================
           Uncomment this entire section to restore text labels under buttons
           ======================================================================== */
        
        /* .adaptive-pill-glass {
          display: inline-block;
          border-radius: 16px;
          
          /* Enhanced adaptive glass effect */
          background: rgba(128, 128, 128, var(--glass-bg-opacity, 0.45));
          
          /* Customizable blur and saturation */
          backdrop-filter: blur(var(--glass-blur, 40px)) saturate(var(--glass-saturation, 200%)) brightness(var(--glass-brightness, 1.15)) contrast(var(--glass-contrast, 0.85));
          -webkit-backdrop-filter: blur(var(--glass-blur, 40px)) saturate(var(--glass-saturation, 200%)) brightness(var(--glass-brightness, 1.15)) contrast(var(--glass-contrast, 0.85));
          
          /* Automatic text color adaptation */
          color: CanvasText;
          
          /* Customizable border matching text color */
          border: var(--glass-border-width, 0.5px) solid rgba(128, 128, 128, var(--glass-border-opacity, 0.3));
          
          font-weight: 600;
          letter-spacing: 0.02em;
          
          /* Customizable shadow for depth */
          box-shadow: 
            0 calc(var(--glass-shadow-spread, 40px) / 5) calc(var(--glass-shadow-spread, 40px) / 1.67) rgba(0, 0, 0, calc(var(--glass-shadow-intensity, 0.15) * 0.8)),
            0 calc(var(--glass-shadow-spread, 40px) / 20) calc(var(--glass-shadow-spread, 40px) / 5) rgba(0, 0, 0, calc(var(--glass-shadow-intensity, 0.15) * 0.53)),
            inset 0 1px 2px rgba(255, 255, 255, 0.1),
            inset 0 0 40px rgba(255, 255, 255, 0.05);
          
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
          transform: translateY(calc(-1 * var(--glass-hover-lift, 4px) / 2)) scale(calc(1 + (var(--glass-hover-scale, 1.08) - 1) * 0.625));
          background: rgba(128, 128, 128, calc(var(--glass-bg-opacity, 0.45) + 0.1));
          backdrop-filter: blur(calc(var(--glass-blur, 40px) + 8px)) saturate(calc(var(--glass-saturation, 200%) + 20%)) brightness(calc(var(--glass-brightness, 1.15) + 0.05)) contrast(calc(var(--glass-contrast, 0.85) - 0.05));
          -webkit-backdrop-filter: blur(calc(var(--glass-blur, 40px) + 8px)) saturate(calc(var(--glass-saturation, 200%) + 20%)) brightness(calc(var(--glass-brightness, 1.15) + 0.05)) contrast(calc(var(--glass-contrast, 0.85) - 0.05));
          box-shadow: 
            0 calc(var(--glass-shadow-spread, 40px) / 3.33) calc(var(--glass-shadow-spread, 40px) / 1.25) rgba(0, 0, 0, calc(var(--glass-shadow-intensity, 0.15) * 1.07)),
            0 calc(var(--glass-shadow-spread, 40px) / 10) calc(var(--glass-shadow-spread, 40px) / 3.33) rgba(0, 0, 0, calc(var(--glass-shadow-intensity, 0.15) * 0.8)),
            inset 0 1px 2px rgba(255, 255, 255, 0.15),
            inset 0 0 50px rgba(255, 255, 255, 0.08);
        }

        .group:active .adaptive-pill-glass {
          transform: scale(0.98);
        }

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
        } */

        /* ==================== END SAVED PILL/BADGE STYLING ==================== */

        /* DYNAMIC ADAPTATION - Based on actual background brightness */
        
        /* Dark background detected - Use lighter, brighter glass */
        .adaptive-circle-glass.dark-bg {
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(calc(var(--glass-blur, 40px) + 4px)) saturate(var(--glass-saturation, 200%)) brightness(1.4) contrast(0.75);
          -webkit-backdrop-filter: blur(calc(var(--glass-blur, 40px) + 4px)) saturate(var(--glass-saturation, 200%)) brightness(1.4) contrast(0.75);
          color: #ffffff !important;
          border-color: #ffffff !important;
          box-shadow: 
            0 calc(var(--glass-shadow-spread, 40px) / 3.33) var(--glass-shadow-spread, 40px) rgba(0, 0, 0, 0.3),
            0 calc(var(--glass-shadow-spread, 40px) / 10) calc(var(--glass-shadow-spread, 40px) / 2.5) rgba(0, 0, 0, 0.2),
            inset 0 1px 3px rgba(255, 255, 255, 0.25),
            inset 0 0 60px rgba(255, 255, 255, 0.1);
        }
        
        .group:hover .adaptive-circle-glass.dark-bg {
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(calc(var(--glass-blur, 40px) + 12px)) saturate(calc(var(--glass-saturation, 200%) + 20%)) brightness(1.5) contrast(0.7);
          -webkit-backdrop-filter: blur(calc(var(--glass-blur, 40px) + 12px)) saturate(calc(var(--glass-saturation, 200%) + 20%)) brightness(1.5) contrast(0.7);
          color: #ffffff !important;
          border-color: #ffffff !important;
          box-shadow: 
            0 calc(var(--glass-shadow-spread, 40px) / 2.5) calc(var(--glass-shadow-spread, 40px) * 1.25) rgba(0, 0, 0, 0.35),
            0 calc(var(--glass-shadow-spread, 40px) / 6.67) calc(var(--glass-shadow-spread, 40px) / 2) rgba(0, 0, 0, 0.25),
            inset 0 1px 3px rgba(255, 255, 255, 0.3),
            inset 0 0 80px rgba(255, 255, 255, 0.15);
        }

        .adaptive-circle-glass.dark-bg::before {
          background: radial-gradient(
            circle at 50% 0%,
            rgba(255, 255, 255, 0.25),
            transparent 70%
          );
          opacity: 0.8;
        }

        /* Light background detected - Use darker, more subtle glass */
        .adaptive-circle-glass.light-bg {
          background: rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(calc(var(--glass-blur, 40px) - 2px)) saturate(var(--glass-saturation, 200%)) brightness(0.95) contrast(1.1);
          -webkit-backdrop-filter: blur(calc(var(--glass-blur, 40px) - 2px)) saturate(var(--glass-saturation, 200%)) brightness(0.95) contrast(1.1);
          color: #000000 !important;
          border-color: #000000 !important;
          box-shadow: 
            0 calc(var(--glass-shadow-spread, 40px) / 3.33) var(--glass-shadow-spread, 40px) rgba(0, 0, 0, 0.08),
            0 calc(var(--glass-shadow-spread, 40px) / 10) calc(var(--glass-shadow-spread, 40px) / 2.5) rgba(0, 0, 0, 0.05),
            inset 0 1px 3px rgba(0, 0, 0, 0.05),
            inset 0 0 60px rgba(0, 0, 0, 0.03);
        }
        
        .group:hover .adaptive-circle-glass.light-bg {
          background: rgba(0, 0, 0, 0.12);
          backdrop-filter: blur(calc(var(--glass-blur, 40px) + 6px)) saturate(calc(var(--glass-saturation, 200%) + 20%)) brightness(0.92) contrast(1.15);
          -webkit-backdrop-filter: blur(calc(var(--glass-blur, 40px) + 6px)) saturate(calc(var(--glass-saturation, 200%) + 20%)) brightness(0.92) contrast(1.15);
          color: #000000 !important;
          border-color: #000000 !important;
          box-shadow: 
            0 calc(var(--glass-shadow-spread, 40px) / 2.5) calc(var(--glass-shadow-spread, 40px) * 1.25) rgba(0, 0, 0, 0.12),
            0 calc(var(--glass-shadow-spread, 40px) / 6.67) calc(var(--glass-shadow-spread, 40px) / 2) rgba(0, 0, 0, 0.08),
            inset 0 1px 3px rgba(0, 0, 0, 0.08),
            inset 0 0 80px rgba(0, 0, 0, 0.05);
        }

        .adaptive-circle-glass.light-bg::before {
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
