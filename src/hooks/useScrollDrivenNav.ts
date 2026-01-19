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
 * The nav position interpolates smoothly based on scroll delta.
 * 
 * - Scrolling down: navbar hides by sliding up
 * - Scrolling up: navbar shows by sliding down
 * - Smooth interpolation based on actual scroll distance
 */
export function useScrollDrivenNav({
  navHeight = 88,
  enabled = true,
  scrollThreshold = 5,
}: UseScrollDrivenNavOptions = {}) {
  const [scrollHideOffset, setScrollHideOffset] = useState(0);
  const lastScrollY = useRef(0);
  const accumulatedDelta = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setScrollHideOffset(0);
      return;
    }

    // Initialize scroll position
    const initialScrollY = window.visualViewport 
      ? window.visualViewport.pageTop 
      : window.scrollY;
    lastScrollY.current = initialScrollY;

    const handleViewportChange = () => {
      // Cancel any pending animation frame
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      // Use RAF for smooth performance
      rafId.current = requestAnimationFrame(() => {
        const currentScrollY = window.visualViewport 
          ? window.visualViewport.pageTop 
          : window.scrollY;
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

        // Update scroll-based hide offset
        setScrollHideOffset(accumulatedDelta.current);
        lastScrollY.current = currentScrollY;
      });
    };

    // Listen to scroll events (use visualViewport on mobile for better accuracy)
    window.addEventListener('scroll', handleViewportChange, { passive: true });
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }

    return () => {
      window.removeEventListener('scroll', handleViewportChange);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [navHeight, enabled, scrollThreshold]);

  // Return scroll-based offset only
  // Note: viewportCompensation is calculated but not used - it was part of an earlier
  // approach to handle iOS Chrome toolbar. The real fix was locking the hero height.
  return { 
    visualViewportOffset: 0,  // Not used anymore
    scrollHideOffset,         // Our scroll-driven hide/show
    translateY: scrollHideOffset, // Only use scroll offset, not compensation
    isFullyHidden: scrollHideOffset >= navHeight 
  };
}
