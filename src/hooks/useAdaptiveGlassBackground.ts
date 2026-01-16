'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface SamplePoint {
  x: number;
  y: number;
  color?: string;
  label?: string;
}

interface UseAdaptiveGlassBackgroundOptions {
  enabled: boolean;
  luminanceThreshold: number;
  getSamplePoints: () => SamplePoint[];
  ignoreElement?: () => HTMLElement | null;
  onChange?: (isDark: boolean) => void;
  debugSensors?: boolean;
  intervalMs?: number;
}

export function useAdaptiveGlassBackground({
  enabled,
  luminanceThreshold,
  getSamplePoints,
  ignoreElement,
  onChange,
  debugSensors = false,
  intervalMs = 2000,
}: UseAdaptiveGlassBackgroundOptions) {
  const [isDarkBackground, setIsDarkBackground] = useState(false);
  const lastLuminanceRef = useRef(0.5);
  const rafGuardRef = useRef<number | null>(null);

  const parseCssColorToRgba = useMemo(() => {
    return (color: string): { r: number; g: number; b: number; a: number } | null => {
      const normalized = color.trim().toLowerCase();
      if (normalized === 'transparent') return null;

      // Most browsers return rgb()/rgba() from computedStyle.backgroundColor
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
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const luminanceFromRgb = (r: number, g: number, b: number) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

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
          if (!data || data.length < 3 || data[0] === undefined || data[1] === undefined || data[2] === undefined) return null;
          return luminanceFromRgb(data[0], data[1], data[2]);
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
        if (!data || data.length < 3 || data[0] === undefined || data[1] === undefined || data[2] === undefined) return null;
        return luminanceFromRgb(data[0], data[1], data[2]);
      } catch {
        // Can fail if the image is cross-origin/tainted
        return null;
      }
    };

    const getLuminanceAtPoint = (x: number, y: number): number | null => {
      // Skip sampling outside viewport (avoids false readings)
      if (x < 0 || y < 0 || x > window.innerWidth - 1 || y > window.innerHeight - 1) return null;

      const stack = document.elementsFromPoint(x, y);
      const ignore = ignoreElement?.() ?? null;

      for (const el of stack) {
        if (ignore && ignore.contains(el)) continue;

        const computedStyle = window.getComputedStyle(el);
        const bgColor = computedStyle.backgroundColor;
        const rgba = parseCssColorToRgba(bgColor);
        if (rgba && rgba.a > 0.1) {
          return luminanceFromRgb(rgba.r, rgba.g, rgba.b);
        }

        if (el instanceof HTMLImageElement) {
          const lum = sampleImgLuminanceAtPoint(el, x, y);
          if (lum !== null) return lum;
        }
      }

      return null;
    };

    const clearDebugMarkers = () => {
      if (!debugSensors) return;
      document.querySelectorAll('.sensor-debug-marker').forEach((el) => el.remove());
    };

    const createDebugMarker = (point: SamplePoint) => {
      if (!debugSensors) return;

      const marker = document.createElement('div');
      marker.className = 'sensor-debug-marker';
      marker.style.cssText = `
        position: fixed;
        left: ${point.x - 6}px;
        top: ${point.y - 6}px;
        width: 12px;
        height: 12px;
        background: ${point.color ?? '#ff00ff'};
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
      marker.textContent = point.label ?? '';
      document.body.appendChild(marker);
    };

    const detect = () => {
      clearDebugMarkers();

      const points = getSamplePoints().filter((p) => {
        return p.x >= 0 && p.y >= 0 && p.x <= window.innerWidth - 1 && p.y <= window.innerHeight - 1;
      });

      const luminances: number[] = [];
      for (const point of points) {
        createDebugMarker(point);
        const lum = getLuminanceAtPoint(point.x, point.y);
        if (lum !== null) luminances.push(lum);
      }

      if (luminances.length === 0) return;

      const avg = luminances.reduce((a, b) => a + b, 0) / luminances.length;
      const last = lastLuminanceRef.current;
      const hysteresis = 0.15;

      if (Math.abs(avg - last) > hysteresis) {
        lastLuminanceRef.current = avg;
        const nextIsDark = avg < luminanceThreshold;
        setIsDarkBackground(nextIsDark);
        onChange?.(nextIsDark);
      }
    };

    const scheduleDetect = (delayMs: number) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (rafGuardRef.current) cancelAnimationFrame(rafGuardRef.current);
        rafGuardRef.current = requestAnimationFrame(() => {
          detect();
        });
      }, delayMs);
    };

    // Initial detection (slight delay to let layout settle)
    scheduleDetect(100);

    const onScroll = () => scheduleDetect(150);
    const onResize = () => scheduleDetect(200);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const interval = window.setInterval(detect, intervalMs);

    return () => {
      clearDebugMarkers();
      if (timeoutId) clearTimeout(timeoutId);
      if (rafGuardRef.current) cancelAnimationFrame(rafGuardRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.clearInterval(interval);
    };
  }, [debugSensors, enabled, getSamplePoints, ignoreElement, intervalMs, luminanceThreshold, onChange, parseCssColorToRgba]);

  return { isDarkBackground };
}

