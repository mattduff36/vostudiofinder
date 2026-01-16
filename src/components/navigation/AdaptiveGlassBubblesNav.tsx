'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { GlassCustomization } from '@/types/glass-customization';

export const DEFAULT_CONFIG = {
  // Match `/glass-nav-test` default look (demo page source of truth)
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
} satisfies GlassCustomization;

export interface NavItem {
  id?: string;
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
  config?: GlassCustomization;
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
    if (!config.adaptiveEnabled) return;

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
          const elementBehind = document.elementFromPoint(point.x, point.y);
          
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
  }, [config.adaptiveEnabled, config.luminanceThreshold, externalIsDarkBackground, onBackgroundChange, debugSensors]);

  return (
    <>
      <div 
        ref={navRef}
        className="flex items-center justify-around gap-3 px-2"
        style={{
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
      >
        {items.map((item) => {
          const Icon = item.icon;
          const buttonId = item.id || item.href || item.label;
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
                className="flex flex-col items-center group touch-manipulation"
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
                className="flex flex-col items-center group touch-manipulation"
                aria-label={item.label}
              >
                {bubble}
              </button>
            );
          }
        })}
      </div>

      <style jsx global>{`
        /* CIRCULAR GLASS BUBBLE - copied from demo (AdaptiveGlassNav) */
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

        /* Make SVG icon strokes inherit the button color */
        .adaptive-circle-glass svg {
          stroke: currentColor;
        }

        /* Hover effect (demo) */
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

        /* Tap animation - match hover lift once on touch */
        .adaptive-circle-glass.tapped {
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
            inset 0 1px 2px rgba(255, 255, 255, 0.3),
            inset 0 0 60px rgba(212, 32, 39, 0.15);
        }

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
    </>
  );
}
