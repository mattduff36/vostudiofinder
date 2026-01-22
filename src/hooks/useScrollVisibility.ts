'use client';

import { useEffect, useState, useRef } from 'react';

interface UseScrollVisibilityOptions {
  /** Delay in ms after scrolling stops before showing again (default: 500) */
  showDelay?: number;
  /** Delay in ms before positioning buttons invisibly for detection (default: 150) */
  positionDelay?: number;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

interface ScrollVisibilityState {
  /** Buttons are positioned (may be invisible) - used for detection */
  isPositioned: boolean;
  /** Buttons are visible to user */
  isVisible: boolean;
}

/**
 * Hook to track scroll visibility with iOS-style behavior and two-phase rendering:
 * - Hides immediately when scrolling starts
 * - Positions invisibly after positionDelay (for background detection)
 * - Shows again after showDelay when scrolling stops
 */
export function useScrollVisibility({
  showDelay = 500,
  positionDelay = 150,
  enabled = true,
}: UseScrollVisibilityOptions = {}): ScrollVisibilityState {
  const [isPositioned, setIsPositioned] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const positionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visibleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setIsPositioned(true);
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      // Hide immediately on scroll start
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        setIsPositioned(false);
        setIsVisible(false);
      }

      // Clear any existing timeouts
      if (positionTimeoutRef.current) {
        clearTimeout(positionTimeoutRef.current);
      }
      if (visibleTimeoutRef.current) {
        clearTimeout(visibleTimeoutRef.current);
      }

      // Phase 1: Position buttons invisibly after positionDelay (for detection)
      positionTimeoutRef.current = setTimeout(() => {
        setIsPositioned(true);
      }, positionDelay);

      // Phase 2: Show buttons after showDelay
      visibleTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        setIsVisible(true);
      }, showDelay);
    };

    // Use passive listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (positionTimeoutRef.current) {
        clearTimeout(positionTimeoutRef.current);
      }
      if (visibleTimeoutRef.current) {
        clearTimeout(visibleTimeoutRef.current);
      }
    };
  }, [showDelay, positionDelay, enabled]);

  return { isPositioned, isVisible };
}
