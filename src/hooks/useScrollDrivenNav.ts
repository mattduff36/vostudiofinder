'use client';

import { useEffect, useState, useRef } from 'react';

interface UseScrollDrivenNavOptions {
  /** Height of the navigation bar in pixels */
  navHeight?: number;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
  /** Threshold for scroll distance before starting to hide (default: 5px) */
  scrollThreshold?: number;
}

/**
 * Hook for scroll-driven navigation animation matching iOS browser toolbar behavior.
 * The nav position interpolates smoothly based on scroll delta, not discrete show/hide states.
 */
export function useScrollDrivenNav({
  navHeight = 88,
  enabled = true,
  scrollThreshold = 5,
}: UseScrollDrivenNavOptions = {}) {
  const [translateY, setTranslateY] = useState(0);
  const lastScrollY = useRef(0);
  const accumulatedDelta = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTranslateY(0);
      return;
    }

    // Initialize scroll position
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      // Cancel any pending animation frame
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      // Use RAF for smooth performance
      rafId.current = requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY.current;

        // Only react to scroll if we're past the threshold
        if (Math.abs(scrollDelta) < scrollThreshold && accumulatedDelta.current === 0) {
          lastScrollY.current = currentScrollY;
          return;
        }

        // Accumulate scroll delta for smooth interpolation
        accumulatedDelta.current += scrollDelta;

        // Clamp accumulated delta between 0 (fully visible) and navHeight (fully hidden)
        if (scrollDelta > 0) {
          // Scrolling down - hide nav
          accumulatedDelta.current = Math.min(accumulatedDelta.current, navHeight);
        } else {
          // Scrolling up - show nav
          accumulatedDelta.current = Math.max(accumulatedDelta.current, 0);
        }

        // If at top of page, always show nav
        if (currentScrollY <= 10) {
          accumulatedDelta.current = 0;
        }

        // Update transform
        setTranslateY(accumulatedDelta.current);
        lastScrollY.current = currentScrollY;
      });
    };

    // Use passive listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [navHeight, enabled, scrollThreshold]);

  return { translateY, isFullyHidden: translateY >= navHeight };
}
