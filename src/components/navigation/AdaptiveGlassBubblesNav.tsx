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

  const shouldDetectBackground =
    config.adaptiveEnabled && (externalIsDarkBackground === undefined || Boolean(onBackgroundChange));

  // Detect background brightness dynamically with debouncing
  useEffect(() => {
    if (!navRef.current) return;
    if (!shouldDetectBackground) return;

    let timeoutId: NodeJS.Timeout;
    let lastLuminance = 0.5;

    const parseCssColorToRgba = (color: string): { r: number; g: number; b: number; a: number } | null => {
      const normalized = color.trim().toLowerCase();
      if (normalized === 'transparent') return null;

      // Most browsers return rgb()/rgba() from computedStyle.backgroundColor
      const rgbMatch = normalized.match(/^rgba?\((.+)\)$/);
      if (!rgbMatch) return null;

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

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    const getLuminanceFromRgb = (r: number, g: number, b: number) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const sampleImgLuminanceAtPoint = (img: HTMLImageElement, pointX: number, pointY: number): number | null => {
      if (!ctx) return null;
      if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) return null;

      const rect = img.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      if (pointX < rect.left || pointX > rect.right || pointY < rect.top || pointY > rect.bottom) return null;

      const localX = pointX - rect.left;
      const localY = pointY - rect.top;

      const computed = window.getComputedStyle(img);
      const objectFit = computed.objectFit || 'fill';

      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const w = rect.width;
      const h = rect.height;

      let scale = 1;
      let offsetX = 0;
      let offsetY = 0;

      if (objectFit === 'cover') {
        scale = Math.max(w / nw, h / nh);
        offsetX = (w - nw * scale) / 2;
        offsetY = (h - nh * scale) / 2;
      } else if (objectFit === 'contain') {
        scale = Math.min(w / nw, h / nh);
        offsetX = (w - nw * scale) / 2;
        offsetY = (h - nh * scale) / 2;
      } else if (objectFit === 'fill') {
        // Stretch
        const sx = nw / w;
        const sy = nh / h;
        const srcX = clamp(localX * sx, 0, nw - 1);
        const srcY = clamp(localY * sy, 0, nh - 1);
        try {
          ctx.clearRect(0, 0, 1, 1);
          ctx.drawImage(img, srcX, srcY, 1, 1, 0, 0, 1, 1);
          const data = ctx.getImageData(0, 0, 1, 1).data;
          if (!data || data.length < 3) return null;
          return getLuminanceFromRgb(data[0], data[1], data[2]);
        } catch {
          return null;
        }
      }

      // Map displayed pixel back to natural pixel using scale/offset
      const srcX = clamp((localX - offsetX) / scale, 0, nw - 1);
      const srcY = clamp((localY - offsetY) / scale, 0, nh - 1);

      try {
        ctx.clearRect(0, 0, 1, 1);
        ctx.drawImage(img, srcX, srcY, 1, 1, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        if (!data || data.length < 3) return null;
        return getLuminanceFromRgb(data[0], data[1], data[2]);
      } catch {
        // Can fail if the image is cross-origin/tainted
        return null;
      }
    };

    const getLuminanceAtPoint = (x: number, y: number): number | null => {
      // Skip sampling outside the viewport (elementFromPoint can behave oddly there)
      if (x < 0 || y < 0 || x > window.innerWidth - 1 || y > window.innerHeight - 1) return null;

      const stack = document.elementsFromPoint(x, y);
      for (const el of stack) {
        // Ignore anything inside the nav itself
        if (navRef.current?.contains(el)) continue;

        const computedStyle = window.getComputedStyle(el);
        const bgColor = computedStyle.backgroundColor;
        const rgba = parseCssColorToRgba(bgColor);
        if (rgba && rgba.a > 0.1) {
          return getLuminanceFromRgb(rgba.r, rgba.g, rgba.b);
        }

        // If the element itself is an image, sample the actual rendered pixel
        if (el instanceof HTMLImageElement) {
          const lum = sampleImgLuminanceAtPoint(el, x, y);
          if (lum !== null) return lum;
        }
      }

      return null;
    };

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
          // Skip points outside the viewport (can cause false readings)
          if (
            point.x < 0 ||
            point.y < 0 ||
            point.x > window.innerWidth - 1 ||
            point.y > window.innerHeight - 1
          ) {
            return;
          }

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

          const luminance = getLuminanceAtPoint(point.x, point.y);
          if (luminance !== null) {
            luminanceValues.push(luminance);
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
          if (externalIsDarkBackground === undefined) {
            setInternalIsDarkBackground(isDark);
          }
          onBackgroundChange?.(isDark);
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
  }, [
    config.adaptiveEnabled,
    config.luminanceThreshold,
    externalIsDarkBackground,
    onBackgroundChange,
    debugSensors,
    shouldDetectBackground,
  ]);

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
