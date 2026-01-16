'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export const DEFAULT_CONFIG = {
  blur: 5,
  saturation: 100,
  brightness: 1.15,
  contrast: 1.05,
  backgroundOpacity: 0.05,
  borderWidth: 1,
  circleSize: 56,
  darkBrightness: 1.15,
  lightBrightness: 0.95,
  luminanceThreshold: 0.4,
};

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}

interface AdaptiveGlassBubblesNavProps {
  items: NavItem[];
  isDarkBackground?: boolean;
  onBackgroundChange?: (isDark: boolean) => void;
  tappedButtonId?: string | null;
  config?: typeof DEFAULT_CONFIG;
  debugSensors?: boolean;
}

export function AdaptiveGlassBubblesNav({
  items,
  isDarkBackground: externalIsDarkBackground,
  onBackgroundChange,
  tappedButtonId,
  config = DEFAULT_CONFIG,
  debugSensors = false,
}: AdaptiveGlassBubblesNavProps) {
  const [internalIsDarkBackground, setInternalIsDarkBackground] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const isDarkBackground = externalIsDarkBackground ?? internalIsDarkBackground;

  // Detect background brightness dynamically with debouncing
  useEffect(() => {
    if (!navRef.current || externalIsDarkBackground !== undefined) return;

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

        // 4 sample points around the button edges (top, right, bottom, left)
        // Positioned just 1px away from button edge for accurate local sampling
        const samplePoints = [
          { x: centerX, y: rect.top - 1, color: '#ff0000', label: 'T' },              // Top (red)
          { x: rect.right + 1, y: centerY, color: '#00ff00', label: 'R' },            // Right (green)
          { x: centerX, y: rect.bottom + 1, color: '#0000ff', label: 'B' },           // Bottom (blue)
          { x: rect.left - 1, y: centerY, color: '#ffff00', label: 'L' }              // Left (yellow)
        ];

        samplePoints.forEach((point) => {
          // Create visual debug marker if enabled
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
            let currentElement = elementBehind;
            let attempts = 0;
            const maxAttempts = 10;

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
                  break;
                }
              }

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
        const threshold = 0.15;
        if (Math.abs(avgLuminance - lastLuminance) > threshold) {
          lastLuminance = avgLuminance;
          const isDark = avgLuminance < config.luminanceThreshold;
          setInternalIsDarkBackground(isDark);
          if (onBackgroundChange) {
            onBackgroundChange(isDark);
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
    
    // Check every 2 seconds
    const interval = setInterval(detectBackgroundBrightness, 2000);

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, [config.luminanceThreshold, externalIsDarkBackground, onBackgroundChange, debugSensors]);

  return (
    <>
      <div 
        ref={navRef}
        className="flex items-center justify-around gap-3 px-2"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const buttonId = item.href || item.label;
          const isTapped = tappedButtonId === buttonId;
          
          const bubble = (
            <div 
              className={`adaptive-circle-glass ${item.active ? 'active' : ''} ${isDarkBackground ? 'dark-bg' : 'light-bg'} ${isTapped ? 'tapped' : ''}`}
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
          );

          if (item.href) {
            return (
              <Link
                key={buttonId}
                href={item.href}
                onClick={item.onClick}
                className="mobile-glass-button group flex-1 flex items-center justify-center touch-manipulation"
                aria-label={item.label}
                aria-current={item.active ? 'page' : undefined}
              >
                {bubble}
              </Link>
            );
          } else {
            return (
              <button
                key={buttonId}
                onClick={item.onClick}
                className="mobile-glass-button group flex-1 flex items-center justify-center touch-manipulation"
                aria-label={item.label}
              >
                {bubble}
              </button>
            );
          }
        })}
      </div>

      <style jsx global>{`
        /* Base glass circle styles - EXACTLY like demo page */
        .adaptive-circle-glass {
          display: flex;
          align-items: center;
          justify-center;
          border-radius: 50%;
          background: rgba(128, 128, 128, ${config.backgroundOpacity});
          border: ${config.borderWidth}px solid currentColor;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.08),
            0 2px 4px rgba(0, 0, 0, 0.05),
            inset 0 1px 2px rgba(255, 255, 255, 0.1),
            inset 0 0 40px rgba(255, 255, 255, 0.05);
        }

        /* SVG icon stroke inherits color */
        .adaptive-circle-glass svg {
          stroke: currentColor;
          transition: stroke 0.3s ease;
        }

        /* Tap animation - plays hover effect once */
        .adaptive-circle-glass.tapped {
          transform: translateY(-4px) scale(1.08);
          box-shadow: 
            0 8px 24px rgba(0, 0, 0, 0.15),
            0 4px 8px rgba(0, 0, 0, 0.1),
            inset 0 1px 3px rgba(255, 255, 255, 0.15),
            inset 0 0 50px rgba(255, 255, 255, 0.08);
        }

        /* Active state with red accent */
        .adaptive-circle-glass.active {
          background: rgba(212, 32, 39, 0.15);
          border-color: #d42027 !important;
          box-shadow: 
            0 6px 20px rgba(212, 32, 39, 0.2),
            0 2px 6px rgba(212, 32, 39, 0.12),
            inset 0 1px 2px rgba(255, 255, 255, 0.3),
            inset 0 0 40px rgba(212, 32, 39, 0.15);
        }

        .adaptive-circle-glass.active svg {
          stroke: #d42027 !important;
        }

        /* Dark background styles */
        .adaptive-circle-glass.dark-bg {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff !important;
          border-color: #ffffff !important;
          box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.2),
            inset 0 1px 3px rgba(255, 255, 255, 0.25),
            inset 0 0 60px rgba(255, 255, 255, 0.1);
        }

        /* Light background styles */
        .adaptive-circle-glass.light-bg {
          background: rgba(0, 0, 0, 0.08);
          color: #000000 !important;
          border-color: #000000 !important;
          box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.08),
            0 2px 4px rgba(0, 0, 0, 0.05),
            inset 0 1px 3px rgba(0, 0, 0, 0.05),
            inset 0 0 60px rgba(0, 0, 0, 0.03);
        }
      `}</style>
    </>
  );
}
