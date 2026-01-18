'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { GlassCustomization } from '@/types/glass-customization';
import { useAdaptiveGlassBackground } from '@/hooks/useAdaptiveGlassBackground';

export const DEFAULT_CONFIG = {
  // Default glass bubble configuration
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
  showLabel?: boolean; // Show text label next to icon (pill shape)
}

interface AdaptiveGlassBubblesNavProps {
  items: NavItem[];
  isDarkBackground?: boolean;
  onBackgroundChange?: (isDark: boolean) => void;
  config?: GlassCustomization;
  debugSensors?: boolean;
  isVisible?: boolean;
}

export function AdaptiveGlassBubblesNav({
  items,
  isDarkBackground: externalIsDarkBackground,
  onBackgroundChange,
  config = DEFAULT_CONFIG,
  debugSensors = false,
  isVisible = true,
}: AdaptiveGlassBubblesNavProps) {
  const [internalIsDarkBackground, setInternalIsDarkBackground] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  const isDarkBackground = externalIsDarkBackground ?? internalIsDarkBackground;

  // Track if visibility has changed from initial state
  const prevVisible = useRef(isVisible);
  if (prevVisible.current !== isVisible) {
    hasAnimated.current = true;
    prevVisible.current = isVisible;
  }

  const shouldDetectBackground =
    config.adaptiveEnabled && (externalIsDarkBackground === undefined || Boolean(onBackgroundChange));

  const getSamplePoints = useMemo(() => {
    return () => {
      if (!navRef.current) return [];
      const buttons = navRef.current.querySelectorAll('.adaptive-circle-glass');
      if (buttons.length === 0) return [];

      const points: Array<{ x: number; y: number; color: string; label: string }> = [];
      buttons.forEach((button) => {
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        points.push(
          { x: centerX, y: rect.top - 1, color: '#ff0000', label: 'T' },
          { x: rect.right + 1, y: centerY, color: '#00ff00', label: 'R' },
          { x: centerX, y: rect.bottom + 1, color: '#0000ff', label: 'B' },
          { x: rect.left - 1, y: centerY, color: '#ffff00', label: 'L' },
        );
      });

      return points;
    };
  }, []);

  useAdaptiveGlassBackground({
    enabled: shouldDetectBackground,
    luminanceThreshold: config.luminanceThreshold,
    getSamplePoints,
    ignoreElement: () => navRef.current,
    debugSensors,
    onChange: (nextIsDark) => {
      if (externalIsDarkBackground === undefined) {
        setInternalIsDarkBackground(nextIsDark);
      }
      onBackgroundChange?.(nextIsDark);
    },
  });

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
          const isPill = item.showLabel;
          
          const bubble = (
            <div 
              className={`${isPill ? 'adaptive-pill-glass' : 'adaptive-circle-glass'} ${hasAnimated.current ? (isVisible ? 'glass-show' : 'glass-hide') : ''} ${item.active ? 'active' : ''} ${isDarkBackground ? 'dark-bg' : 'light-bg'}`}
              style={{
                width: isPill ? 'auto' : `${config.circleSize}px`,
                height: `${config.circleSize}px`,
                paddingLeft: isPill ? `${config.pillPaddingX}px` : undefined,
                paddingRight: isPill ? `${config.pillPaddingX}px` : undefined,
                paddingTop: isPill ? `${config.pillPaddingY}px` : undefined,
                paddingBottom: isPill ? `${config.pillPaddingY}px` : undefined,
                backdropFilter: `blur(${config.blur}px) saturate(${config.saturation}%) brightness(${config.brightness}) contrast(${config.contrast})`,
                WebkitBackdropFilter: `blur(${config.blur}px) saturate(${config.saturation}%) brightness(${config.brightness}) contrast(${config.contrast})`,
                color: isDarkBackground ? '#ffffff' : '#000000',
                borderColor: isDarkBackground ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)',
                borderWidth: `${config.borderWidth}px`,
                borderStyle: 'solid',
                borderRadius: '9999px',
                background: isDarkBackground ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                boxShadow: isDarkBackground
                  ? `0 12px 40px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 3px rgba(255,255,255,0.25)`
                  : `0 12px 40px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05), inset 0 1px 3px rgba(0,0,0,0.05)`,
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Icon className="w-6 h-6" />
              {isPill && <span className="ml-2 text-sm font-medium whitespace-nowrap">{item.label}</span>}
            </div>
          );

          if (item.href) {
            return (
              <Link
                key={buttonId}
                href={item.href}
                {...(item.onClick ? { onClick: item.onClick } : {})}
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

        /* PILL-SHAPED GLASS BUBBLE - For icon + text */
        .adaptive-pill-glass {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          
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
          transform: translateY(2px) scale(0.92);
          transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 
            0 2px 8px rgba(0, 0, 0, 0.08),
            inset 0 2px 6px rgba(0, 0, 0, 0.15);
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

        /* PILL STYLES - Same as circle but pill-specific selectors */
        
        .adaptive-pill-glass::before {
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

        .group:hover .adaptive-pill-glass {
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

        .group:active .adaptive-pill-glass {
          transform: translateY(2px) scale(0.92);
          transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 
            0 2px 8px rgba(0, 0, 0, 0.08),
            inset 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .adaptive-pill-glass svg {
          stroke: currentColor;
        }

        .adaptive-pill-glass.active {
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

        .adaptive-pill-glass.dark-bg {
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
        
        .group:hover .adaptive-pill-glass.dark-bg {
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

        .adaptive-pill-glass.dark-bg::before {
          background: radial-gradient(
            circle at 50% 0%,
            rgba(255, 255, 255, 0.25),
            transparent 70%
          );
          opacity: 0.8;
        }

        .adaptive-pill-glass.light-bg {
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
        
        .group:hover .adaptive-pill-glass.light-bg {
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

        .adaptive-pill-glass.light-bg::before {
          background: radial-gradient(
            circle at 50% 0%,
            rgba(0, 0, 0, 0.08),
            transparent 70%
          );
          opacity: 0.5;
        }
      
        /* iOS LIQUID GLASS ANIMATIONS - Scroll hide/show */
        
        /* Hide animation - 250ms */
        @keyframes liquidGlassHide {
          0% {
            opacity: 1;
            transform: scale(1);
            backdrop-filter: blur(var(--glass-blur, 40px)) saturate(var(--glass-saturation, 200%)) brightness(var(--glass-brightness, 1.15)) contrast(var(--glass-contrast, 0.85));
            -webkit-backdrop-filter: blur(var(--glass-blur, 40px)) saturate(var(--glass-saturation, 200%)) brightness(var(--glass-brightness, 1.15)) contrast(var(--glass-contrast, 0.85));
          }
          100% {
            opacity: 0;
            transform: scale(0.85);
            backdrop-filter: blur(70px) saturate(var(--glass-saturation, 200%)) brightness(var(--glass-brightness, 1.15)) contrast(var(--glass-contrast, 0.85));
            -webkit-backdrop-filter: blur(70px) saturate(var(--glass-saturation, 200%)) brightness(var(--glass-brightness, 1.15)) contrast(var(--glass-contrast, 0.85));
          }
        }

        /* Show animation - 250ms with bounce */
        @keyframes liquidGlassShow {
          0% {
            opacity: 0;
            transform: scale(0.85);
            backdrop-filter: blur(70px) saturate(var(--glass-saturation, 200%)) brightness(var(--glass-brightness, 1.15)) contrast(var(--glass-contrast, 0.85));
            -webkit-backdrop-filter: blur(70px) saturate(var(--glass-saturation, 200%)) brightness(var(--glass-brightness, 1.15)) contrast(var(--glass-contrast, 0.85));
          }
          60% {
            opacity: 1;
            transform: scale(1.15);
            backdrop-filter: blur(var(--glass-blur, 40px)) saturate(var(--glass-saturation, 200%)) brightness(var(--glass-brightness, 1.15)) contrast(var(--glass-contrast, 0.85));
            -webkit-backdrop-filter: blur(var(--glass-blur, 40px)) saturate(var(--glass-saturation, 200%)) brightness(var(--glass-brightness, 1.15)) contrast(var(--glass-contrast, 0.85));
          }
          100% {
            opacity: 1;
            transform: scale(1);
            backdrop-filter: blur(var(--glass-blur, 40px)) saturate(var(--glass-saturation, 200%)) brightness(var(--glass-brightness, 1.15)) contrast(var(--glass-contrast, 0.85));
            -webkit-backdrop-filter: blur(var(--glass-blur, 40px)) saturate(var(--glass-saturation, 200%)) brightness(var(--glass-brightness, 1.15)) contrast(var(--glass-contrast, 0.85));
          }
        }

        /* Icon hide animation - faster (150ms) */
        @keyframes liquidGlassIconHide {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        /* Icon show animation - 150ms */
        @keyframes liquidGlassIconShow {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        /* Apply hide animation */
        .adaptive-circle-glass.glass-hide {
          animation: liquidGlassHide 250ms cubic-bezier(0.32, 0, 0.67, 0) forwards;
          pointer-events: none;
        }

        .adaptive-circle-glass.glass-hide svg {
          animation: liquidGlassIconHide 150ms cubic-bezier(0.32, 0, 0.67, 0) forwards;
        }

        /* Apply show animation */
        .adaptive-circle-glass.glass-show {
          animation: liquidGlassShow 250ms cubic-bezier(0.33, 1, 0.68, 1) forwards;
        }

        .adaptive-circle-glass.glass-show svg {
          animation: liquidGlassIconShow 150ms cubic-bezier(0.33, 1, 0.68, 1) forwards;
        }

        /* Apply hide animation to pills */
        .adaptive-pill-glass.glass-hide {
          animation: liquidGlassHide 250ms cubic-bezier(0.32, 0, 0.67, 0) forwards;
          pointer-events: none;
        }

        .adaptive-pill-glass.glass-hide svg {
          animation: liquidGlassIconHide 150ms cubic-bezier(0.32, 0, 0.67, 0) forwards;
        }

        .adaptive-pill-glass.glass-hide span {
          animation: liquidGlassIconHide 150ms cubic-bezier(0.32, 0, 0.67, 0) forwards;
        }

        /* Apply show animation to pills */
        .adaptive-pill-glass.glass-show {
          animation: liquidGlassShow 250ms cubic-bezier(0.33, 1, 0.68, 1) forwards;
        }

        .adaptive-pill-glass.glass-show svg {
          animation: liquidGlassIconShow 150ms cubic-bezier(0.33, 1, 0.68, 1) forwards;
        }

        .adaptive-pill-glass.glass-show span {
          animation: liquidGlassIconShow 150ms cubic-bezier(0.33, 1, 0.68, 1) forwards;
        }

        /* Respect reduced motion preference */
        @media (prefers-reduced-motion: reduce) {
          .adaptive-circle-glass.glass-hide,
          .adaptive-circle-glass.glass-show,
          .adaptive-circle-glass.glass-hide svg,
          .adaptive-circle-glass.glass-show svg,
          .adaptive-pill-glass.glass-hide,
          .adaptive-pill-glass.glass-show,
          .adaptive-pill-glass.glass-hide svg,
          .adaptive-pill-glass.glass-show svg,
          .adaptive-pill-glass.glass-hide span,
          .adaptive-pill-glass.glass-show span {
            animation: none;
          }
          
          .adaptive-circle-glass.glass-hide,
          .adaptive-pill-glass.glass-hide {
            opacity: 0;
            pointer-events: none;
          }
          
          .adaptive-circle-glass.glass-show,
          .adaptive-pill-glass.glass-show {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
