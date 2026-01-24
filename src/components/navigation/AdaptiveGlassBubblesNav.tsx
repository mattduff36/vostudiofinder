'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  pillMinWidth?: number; // Minimum width in pixels for pill buttons (ensures consistent sizing)
}

interface AdaptiveGlassBubblesNavProps {
  items: NavItem[];
  isDarkBackground?: boolean;
  onBackgroundChange?: (isDark: boolean) => void;
  config?: GlassCustomization;
  debugSensors?: boolean;
  isPositioned?: boolean; // Buttons positioned (may be invisible) for detection
  isVisible?: boolean; // Buttons visible to user
  // Reveal animation props (for logged-in menu expand/collapse)
  revealExpanded?: boolean; // undefined = no reveal logic, true = expanded, false = collapsed
  revealMenuId?: string; // ID of the menu button (always visible) - default 'menu'
  revealStaggerMs?: number; // Stagger delay between each button reveal - default 100
  revealBaseDelayMs?: number; // Base delay before first button appears - default 0
}

export function AdaptiveGlassBubblesNav({
  items,
  isDarkBackground: externalIsDarkBackground,
  onBackgroundChange,
  config = DEFAULT_CONFIG,
  debugSensors = false,
  isPositioned = true,
  isVisible = true,
  revealExpanded,
  revealMenuId = 'menu',
  revealStaggerMs = 100,
  revealBaseDelayMs = 0,
}: AdaptiveGlassBubblesNavProps) {
  const [internalIsDarkBackground, setInternalIsDarkBackground] = useState(false);
  // Track dark/light state per button
  const [buttonBackgrounds, setButtonBackgrounds] = useState<Map<string, boolean>>(new Map());
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

  // Create ONE sensor per button at its center
  const getSamplePointsPerButton = useMemo(() => {
    return () => {
      if (!navRef.current) return new Map<string, Array<{ x: number; y: number; color: string; label: string }>>();
      const buttons = navRef.current.querySelectorAll('.adaptive-circle-glass, .adaptive-pill-glass');
      if (buttons.length === 0) return new Map();

      const pointsMap = new Map<string, Array<{ x: number; y: number; color: string; label: string }>>();
      
      buttons.forEach((button, index) => {
        const rect = button.getBoundingClientRect();
        
        // Skip buttons with invalid (zero) dimensions - not laid out yet
        if (rect.width === 0 || rect.height === 0) {
          return;
        }
        
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const buttonId = button.getAttribute('data-button-id') || `button-${index}`;
        // Single sensor at button center
        pointsMap.set(buttonId, [
          { x: centerX, y: centerY, color: '#00ff00', label: 'C' },
        ]);
      });

      return pointsMap;
    };
  }, []);

  // Legacy hook for backward compatibility (averages all buttons)
  const getSamplePoints = useMemo(() => {
    return () => {
      if (!navRef.current) return [];
      const buttons = navRef.current.querySelectorAll('.adaptive-circle-glass, .adaptive-pill-glass');
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

  // Use the legacy hook for global state (for onBackgroundChange callback)
  useAdaptiveGlassBackground({
    enabled: shouldDetectBackground,
    luminanceThreshold: config.luminanceThreshold,
    getSamplePoints,
    ignoreElement: () => navRef.current,
    debugSensors: false, // Disable debug for global hook
    onChange: (nextIsDark) => {
      if (externalIsDarkBackground === undefined) {
        setInternalIsDarkBackground(nextIsDark);
      }
      onBackgroundChange?.(nextIsDark);
    },
  });

  // New per-button detection effect
  useEffect(() => {
    if (!shouldDetectBackground) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let rafId: number | null = null;

    const parseCssColorToRgba = (color: string): { r: number; g: number; b: number; a: number } | null => {
      const normalized = color.trim().toLowerCase();
      if (normalized === 'transparent') return null;

      const rgbMatch = normalized.match(/^rgba?\((.+)\)$/);
      if (!rgbMatch || !rgbMatch[1]) return null;

      const parts = rgbMatch[1]
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      if (parts.length < 3) return null;

      const r = Number(parts[0]);
      const g = Number(parts[1]);
      const b = Number(parts[2]);
      const a = parts.length >= 4 ? Number(parts[3]) : 1;

      if (![r, g, b, a].every((n) => Number.isFinite(n))) return null;

      return { r, g, b, a };
    };

    const luminanceFromRgb = (r: number, g: number, b: number) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    const getLuminanceAtPoint = (x: number, y: number): number | null => {
      if (x < 0 || y < 0 || x > window.innerWidth - 1 || y > window.innerHeight - 1) return null;

      const stack = document.elementsFromPoint(x, y);
      const ignore = navRef.current;

      // Collect ALL images at this point, then sample from the LARGEST one (backgrounds are larger than thumbnails)
      const images: Array<{el: HTMLImageElement, size: number, opacity: number}> = [];
      
      for (const el of stack) {
        // Skip nav elements AND their parent containers
        if (ignore && (ignore.contains(el) || el.contains(ignore))) continue;

        const computedStyle = window.getComputedStyle(el);
        const elementOpacity = Number(computedStyle.opacity || '1');
        const opacity = Number.isFinite(elementOpacity) ? elementOpacity : 1;

        // Collect images for later sampling
        if (el instanceof HTMLImageElement && opacity > 0.25 && el.complete && el.naturalWidth > 0) {
          const size = el.naturalWidth * el.naturalHeight;
          images.push({el, size, opacity});
        }

        // Also check for solid background colors as fallback
        const bgColor = computedStyle.backgroundColor;
        const rgba = parseCssColorToRgba(bgColor);
        if (rgba && rgba.a * opacity > 0.1 && images.length === 0) {
          const lum = luminanceFromRgb(rgba.r, rgba.g, rgba.b);
          return lum;
        }
      }

      // Sample from LARGEST image (prefer backgrounds over thumbnails)
      if (images.length > 0) {
        images.sort((a, b) => b.size - a.size); // Largest first
        const largestImage = images[0];
        
        if (!largestImage) return null; // TypeScript safety check
        
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const rect = largestImage.el.getBoundingClientRect();
            const imgX = Math.max(0, Math.min(x - rect.left, rect.width - 1));
            const imgY = Math.max(0, Math.min(y - rect.top, rect.height - 1));
            const scaleX = largestImage.el.naturalWidth / rect.width;
            const scaleY = largestImage.el.naturalHeight / rect.height;
            const sourceX = Math.floor(imgX * scaleX);
            const sourceY = Math.floor(imgY * scaleY);
            ctx.drawImage(largestImage.el, sourceX, sourceY, 1, 1, 0, 0, 1, 1);
            const pixelData = ctx.getImageData(0, 0, 1, 1).data;
            const lum = luminanceFromRgb(pixelData[0] ?? 0, pixelData[1] ?? 0, pixelData[2] ?? 0);
            return lum;
          }
        } catch (e) {
          // CORS error - continue
        }
      }

      return null;
    };

    const clearDebugMarkers = () => {
      if (!debugSensors) return;
      document.querySelectorAll('.sensor-debug-marker-per-button').forEach((el) => el.remove());
    };

    const createDebugMarker = (point: { x: number; y: number; color: string; label: string }, luminance: number | null) => {
      if (!debugSensors) return;

      const marker = document.createElement('div');
      marker.className = 'sensor-debug-marker-per-button';
      marker.style.cssText = `
        position: fixed;
        left: ${point.x - 6}px;
        top: ${point.y - 6}px;
        width: 12px;
        height: 12px;
        background: ${point.color};
        border: 2px solid ${luminance !== null ? (luminance < config.luminanceThreshold ? 'white' : 'black') : 'red'};
        border-radius: 50%;
        z-index: 10000;
        pointer-events: none;
        box-shadow: 0 0 4px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 7px;
        font-weight: bold;
        color: white;
        text-shadow: 0 0 2px black;
      `;
      marker.textContent = luminance !== null ? `${point.label}:${luminance.toFixed(2)}` : `${point.label}:X`;
      document.body.appendChild(marker);
    };

    const detectPerButton = () => {
      clearDebugMarkers();
      
      const pointsMap = getSamplePointsPerButton();
      
      // If buttons have zero dimensions (not laid out yet), retry after a short delay
      if (pointsMap.size === 0) {
        setTimeout(detectPerButton, 50);
        return;
      }
      
      const newBackgrounds = new Map<string, boolean>();

      pointsMap.forEach((points, buttonId) => {
        const luminances: number[] = [];
        
        for (const point of points) {
          if (point.x >= 0 && point.y >= 0 && point.x <= window.innerWidth - 1 && point.y <= window.innerHeight - 1) {
            const lum = getLuminanceAtPoint(point.x, point.y);
            createDebugMarker(point, lum);
            if (lum !== null) luminances.push(lum);
          }
        }

        if (luminances.length > 0) {
          const avg = luminances.reduce((a, b) => a + b, 0) / luminances.length;
          const isDark = avg < config.luminanceThreshold;
          newBackgrounds.set(buttonId, isDark);
          
          if (debugSensors) {
            console.log(`Button ${buttonId}: avg luminance=${avg.toFixed(3)}, isDark=${isDark}, threshold=${config.luminanceThreshold}`);
          }
        }
      });

      if (newBackgrounds.size > 0) {
        setButtonBackgrounds(newBackgrounds);
      }
    };

    const scheduleDetect = (delayMs: number) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          detectPerButton();
        });
      }, delayMs);
    };

    // Initial detection
    scheduleDetect(100);

    const onScroll = () => scheduleDetect(150);
    const onResize = () => scheduleDetect(200);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const interval = window.setInterval(detectPerButton, 2000);

    return () => {
      clearDebugMarkers();
      if (timeoutId) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.clearInterval(interval);
    };
  }, [shouldDetectBackground, config.luminanceThreshold, getSamplePointsPerButton, debugSensors]);

  // Trigger detection when buttons become positioned (even if invisible)
  // This allows detection to run BEFORE buttons are shown to users
  const prevPositioned = useRef(isPositioned);
  useEffect(() => {
    if (isPositioned && !prevPositioned.current && shouldDetectBackground && navRef.current) {
      // Buttons just became positioned - trigger detection after a microtask to ensure layout is complete
      // Use requestAnimationFrame to ensure buttons are fully laid out
      requestAnimationFrame(() => {
        const pointsMap = getSamplePointsPerButton();
        if (pointsMap.size > 0) {
          // Buttons are positioned, run detection
          const newBackgrounds = new Map<string, boolean>();
          pointsMap.forEach((points, buttonId) => {
            const luminances: number[] = [];
            for (const point of points) {
              if (point.x >= 0 && point.y >= 0 && point.x <= window.innerWidth - 1 && point.y <= window.innerHeight - 1) {
                const stack = document.elementsFromPoint(point.x, point.y);
                const ignore = navRef.current;
                // Simplified detection for positioned phase
                for (const el of stack) {
                  if (ignore && (ignore.contains(el) || el.contains(ignore))) continue;
                  const computedStyle = window.getComputedStyle(el);
                  const bgColor = computedStyle.backgroundColor;
                  if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                    // Quick luminance check (simplified)
                    const match = bgColor.match(/\d+/g);
                    if (match && match.length >= 3 && match[0] && match[1] && match[2]) {
                      const r = Number.parseInt(match[0], 10);
                      const g = Number.parseInt(match[1], 10);
                      const b = Number.parseInt(match[2], 10);
                      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                      luminances.push(lum);
                      break;
                    }
                  }
                }
              }
            }
            if (luminances.length > 0) {
              const avg = luminances.reduce((a, b) => a + b, 0) / luminances.length;
              newBackgrounds.set(buttonId, avg < config.luminanceThreshold);
            }
          });
          if (newBackgrounds.size > 0) {
            setButtonBackgrounds(newBackgrounds);
          }
        }
      });
    }
    prevPositioned.current = isPositioned;
  }, [isPositioned, shouldDetectBackground, getSamplePointsPerButton, config.luminanceThreshold, isVisible]);

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
        {items.map((item, index) => {
          const Icon = item.icon;
          const buttonId = item.id || item.href || item.label || `button-${index}`;
          const isPill = item.showLabel;
          
          // Use individual button's background state if available, otherwise fall back to global state
          const isButtonDark = externalIsDarkBackground !== undefined 
            ? externalIsDarkBackground 
            : (buttonBackgrounds.get(buttonId) ?? isDarkBackground);
          
          // Reveal animation logic (for logged-in menu expand/collapse)
          const isMenuButton = buttonId === revealMenuId;
          const hasRevealLogic = revealExpanded !== undefined;
          // Calculate stagger delay: rightmost non-menu button appears first, then leftward
          // items.length - 2 gives us the index of the last non-menu button
          // Subtract current index to get reverse order delay
          // Add base delay so menu appears first, then buttons follow
          const revealDelayMs = hasRevealLogic && !isMenuButton 
            ? revealBaseDelayMs + (items.length - 2 - index) * revealStaggerMs 
            : 0;
          // Determine if this button should be revealed
          const isRevealed = !hasRevealLogic || isMenuButton || revealExpanded;
          
          const bubble = (
            <div 
              data-button-id={buttonId}
              className={`${isPill ? 'adaptive-pill-glass' : 'adaptive-circle-glass'} ${hasAnimated.current ? (isVisible ? 'glass-show' : 'glass-hide') : ''} ${isPositioned && !isVisible ? 'glass-positioning' : ''} ${item.active ? 'active' : ''} ${isButtonDark ? 'dark-bg' : 'light-bg'}`}
              style={{
                width: isPill ? 'auto' : `${config.circleSize}px`,
                minWidth: isPill && item.pillMinWidth ? `${item.pillMinWidth}px` : undefined,
                height: `${config.circleSize}px`,
                paddingLeft: isPill ? `${config.pillPaddingX}px` : undefined,
                paddingRight: isPill ? `${config.pillPaddingX}px` : undefined,
                paddingTop: isPill ? `${config.pillPaddingY}px` : undefined,
                paddingBottom: isPill ? `${config.pillPaddingY}px` : undefined,
                backdropFilter: `blur(${config.blur}px) saturate(${config.saturation}%) brightness(${config.brightness}) contrast(${config.contrast})`,
                WebkitBackdropFilter: `blur(${config.blur}px) saturate(${config.saturation}%) brightness(${config.brightness}) contrast(${config.contrast})`,
                color: isButtonDark ? '#ffffff' : '#000000',
                borderColor: isButtonDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)',
                borderWidth: `${config.borderWidth}px`,
                borderStyle: 'solid',
                borderRadius: '9999px',
                background: isButtonDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                boxShadow: isButtonDark
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

          const linkOrButton = item.href ? (
            <Link
              href={item.href}
              {...(item.onClick ? { onClick: item.onClick } : {})}
              className="flex flex-col items-center group touch-manipulation"
              aria-label={item.label}
              aria-current={item.active ? 'page' : undefined}
            >
              {bubble}
            </Link>
          ) : (
            <button
              onClick={item.onClick}
              className="flex flex-col items-center group touch-manipulation"
              aria-label={item.label}
            >
              {bubble}
            </button>
          );

          // Wrap content in reveal wrapper for stagger animation (logged-in only)
          if (hasRevealLogic && !isMenuButton) {
            return (
              <div
                key={buttonId}
                className={`glass-reveal-wrapper ${isRevealed ? 'revealed' : 'collapsed'}`}
                style={{
                  // Apply stagger delay only when expanding (not collapsing)
                  transitionDelay: isRevealed ? `${revealDelayMs}ms` : '0ms',
                }}
              >
                {linkOrButton}
              </div>
            );
          }

          // No reveal logic or is menu button - render directly with key
          return (
            <div key={buttonId} className="glass-reveal-always-visible">
              {linkOrButton}
            </div>
          );
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

        /* Positioning phase - buttons positioned but invisible (for detection) */
        .adaptive-circle-glass.glass-positioning,
        .adaptive-pill-glass.glass-positioning {
          opacity: 0;
          pointer-events: none;
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

        /* ========================================
           REVEAL WRAPPER - Menu expand/collapse stagger
           Separate layer from scroll hide/show to avoid conflicts
           ======================================== */
        
        .glass-reveal-wrapper {
          /* GPU-accelerated properties for smooth animation */
          will-change: opacity, transform;
          /* Spring-like easing for premium feel */
          transition: 
            opacity 220ms cubic-bezier(0.34, 1.56, 0.64, 1),
            transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Collapsed state - hidden with slight translate */
        .glass-reveal-wrapper.collapsed {
          opacity: 0;
          transform: translate3d(10px, 0, 0);
          pointer-events: none;
        }

        /* Revealed state - fully visible */
        .glass-reveal-wrapper.revealed {
          opacity: 1;
          transform: translate3d(0, 0, 0);
          pointer-events: auto;
        }

        /* Always-visible wrapper (menu button, non-logged-in) */
        .glass-reveal-always-visible {
          /* No special styles needed, just a wrapper for consistent key handling */
        }

        /* Reduced motion: instant show/hide, no transition */
        @media (prefers-reduced-motion: reduce) {
          .glass-reveal-wrapper {
            transition: none;
          }
          
          .glass-reveal-wrapper.collapsed {
            opacity: 0;
            transform: none;
            pointer-events: none;
          }
          
          .glass-reveal-wrapper.revealed {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </>
  );
}
