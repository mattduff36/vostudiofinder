'use client';

import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import type { GlassCustomization } from '@/types/glass-customization';
import { useAdaptiveGlassBackground } from '@/hooks/useAdaptiveGlassBackground';

interface AdaptiveGlassMenuProps {
  className?: string;
  config: GlassCustomization;
  debugSensors?: boolean;
  onBackgroundChange?: (isDark: boolean) => void;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  isVisible?: boolean;
  style?: CSSProperties;
}

export function AdaptiveGlassMenu({
  className,
  config,
  debugSensors = false,
  onBackgroundChange,
  children,
  onClick,
  isVisible = true,
  style,
}: AdaptiveGlassMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isDarkBackground, setIsDarkBackground] = useState(false);
  const hasAnimated = useRef(false);

  // Track if visibility has changed from initial state
  const prevVisible = useRef(isVisible);
  if (prevVisible.current !== isVisible) {
    hasAnimated.current = true;
    prevVisible.current = isVisible;
  }

  const getSamplePoints = useMemo(() => {
    return () => {
      if (!menuRef.current) return [];
      const rect = menuRef.current.getBoundingClientRect();

      const pad = 1;
      return [
        { x: rect.left - pad, y: rect.top - pad, color: '#ff0000', label: 'TL' },
        { x: rect.right + pad, y: rect.top - pad, color: '#00ff00', label: 'TR' },
        { x: rect.right + pad, y: rect.bottom + pad, color: '#0000ff', label: 'BR' },
        { x: rect.left - pad, y: rect.bottom + pad, color: '#ffff00', label: 'BL' },
      ];
    };
  }, []);

  useAdaptiveGlassBackground({
    enabled: config.adaptiveEnabled,
    luminanceThreshold: config.luminanceThreshold,
    getSamplePoints,
    ignoreElement: () => menuRef.current,
    debugSensors,
    onChange: (nextIsDark) => {
      setIsDarkBackground(nextIsDark);
      onBackgroundChange?.(nextIsDark);
    },
  });

  const textColor = isDarkBackground ? '#ffffff' : '#000000';
  const borderColor = textColor;
  const brightness = isDarkBackground ? config.darkBrightness : config.lightBrightness;

  return (
    <>
      <div
        ref={menuRef}
        className={`adaptive-menu-glass ${hasAnimated.current ? (isVisible ? 'menu-show' : 'menu-hide') : ''} ${isDarkBackground ? 'dark-bg' : 'light-bg'} ${className ?? ''}`}
        onClick={onClick}
        style={{
          ...style,
          color: textColor,
          borderColor,
          '--glass-blur': `${config.blur}px`,
          '--glass-saturation': `${config.saturation}%`,
          '--glass-brightness': String(config.brightness),
          '--glass-contrast': String(config.contrast),
          '--glass-bg-opacity': String(config.backgroundOpacity),
          '--glass-border-width': `${config.borderWidth}px`,
          '--glass-border-opacity': String(config.borderOpacity),
          '--glass-shadow-intensity': String(config.shadowIntensity),
          '--glass-shadow-spread': `${config.shadowSpread}px`,
          backdropFilter: `blur(${config.blur}px) saturate(${config.saturation}%) brightness(${brightness}) contrast(${config.contrast})`,
          WebkitBackdropFilter: `blur(${config.blur}px) saturate(${config.saturation}%) brightness(${brightness}) contrast(${config.contrast})`,
        } as CSSProperties}
      >
        {children}
      </div>
      <style jsx global>{`
        .adaptive-menu-glass {
          border-radius: 16px;
          background: rgba(128, 128, 128, var(--glass-bg-opacity, 0.45));
          border: var(--glass-border-width, 0.5px) solid rgba(128, 128, 128, var(--glass-border-opacity, 0.3));
          box-shadow:
            0 calc(var(--glass-shadow-spread, 40px) / 3) var(--glass-shadow-spread, 40px)
              rgba(0, 0, 0, var(--glass-shadow-intensity, 0.15)),
            0 calc(var(--glass-shadow-spread, 40px) / 10) calc(var(--glass-shadow-spread, 40px) / 2.5)
              rgba(0, 0, 0, calc(var(--glass-shadow-intensity, 0.15) * 0.67)),
            inset 0 1px 3px rgba(255, 255, 255, 0.1),
            inset 0 0 60px rgba(255, 255, 255, 0.05);

          /* Origin from bottom-right (near Menu button) */
          transform-origin: 100% 100%;
          /* Initial entrance - elegant fade in */
          animation: liquidGlassMenuEntrance 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
          animation-delay: 40ms;
        }

        .adaptive-menu-glass::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(
            circle at 50% 0%,
            color-mix(in srgb, Canvas 50%, transparent),
            transparent 70%
          );
          pointer-events: none;
          opacity: 0.65;
        }

        .adaptive-menu-glass.dark-bg {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.25);
          box-shadow:
            0 calc(var(--glass-shadow-spread, 40px) / 3.33) var(--glass-shadow-spread, 40px) rgba(0, 0, 0, 0.3),
            0 calc(var(--glass-shadow-spread, 40px) / 10) calc(var(--glass-shadow-spread, 40px) / 2.5)
              rgba(0, 0, 0, 0.2),
            inset 0 1px 3px rgba(255, 255, 255, 0.25),
            inset 0 0 60px rgba(255, 255, 255, 0.1);
        }

        .adaptive-menu-glass.light-bg {
          background: rgba(0, 0, 0, 0.08);
          color: #000000;
          border-color: rgba(0, 0, 0, 0.12);
          box-shadow:
            0 calc(var(--glass-shadow-spread, 40px) / 3.33) var(--glass-shadow-spread, 40px) rgba(0, 0, 0, 0.08),
            0 calc(var(--glass-shadow-spread, 40px) / 10) calc(var(--glass-shadow-spread, 40px) / 2.5)
              rgba(0, 0, 0, 0.05),
            inset 0 1px 3px rgba(0, 0, 0, 0.05),
            inset 0 0 60px rgba(0, 0, 0, 0.03);
        }

        /* ========================================
           LIQUID GLASS MENU ANIMATIONS
           Designed to complement button reveal stagger
           ======================================== */

        /* Initial entrance - smooth emergence from bottom-right */
        @keyframes liquidGlassMenuEntrance {
          0% {
            opacity: 0;
            transform: translate3d(8px, 6px, 0) scale(0.96);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
            filter: blur(0px);
          }
        }

        /* Menu show - synced with button reveal timing */
        @keyframes liquidGlassMenuShow {
          0% {
            opacity: 0;
            transform: translate3d(8px, 6px, 0) scale(0.96);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
            filter: blur(0px);
          }
        }

        /* Menu hide - quick, elegant exit */
        @keyframes liquidGlassMenuHide {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
            filter: blur(0px);
          }
          100% {
            opacity: 0;
            transform: translate3d(6px, 4px, 0) scale(0.97);
            filter: blur(2px);
          }
        }

        .adaptive-menu-glass.menu-show {
          animation: liquidGlassMenuShow 240ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
          animation-delay: 40ms;
        }

        .adaptive-menu-glass.menu-hide {
          animation: liquidGlassMenuHide 180ms cubic-bezier(0.4, 0, 0.6, 1) forwards;
          pointer-events: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .adaptive-menu-glass {
            animation: none;
            filter: none;
          }
          
          .adaptive-menu-glass.menu-hide {
            opacity: 0;
            pointer-events: none;
          }
          
          .adaptive-menu-glass.menu-show {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

