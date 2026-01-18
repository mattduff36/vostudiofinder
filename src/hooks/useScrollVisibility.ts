'use client';

import { useEffect, useState, useRef } from 'react';

interface UseScrollVisibilityOptions {
  /** Delay in ms after scrolling stops before showing again (default: 800) */
  showDelay?: number;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook to track scroll visibility with iOS-style behavior:
 * - Hides immediately when scrolling starts
 * - Shows again after a delay when scrolling stops
 */
export function useScrollVisibility({
  showDelay = 800,
  enabled = true,
}: UseScrollVisibilityOptions = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      // Hide immediately on scroll start
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        setIsVisible(false);
      }

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set timeout to show after scrolling stops
      timeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        setIsVisible(true);
      }, showDelay);
    };

    // Use passive listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showDelay, enabled]);

  return isVisible;
}
