'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'dashboard_widget_animation_shown';
const DESKTOP_BREAKPOINT = 768; // md breakpoint in Tailwind

interface UseProfileAnimationReturn {
  shouldAnimate: boolean;
  isDesktop: boolean;
  prefersReducedMotion: boolean;
  markAnimationComplete: () => void;
}

/**
 * Custom hook to manage profile completion widget animation state
 * 
 * Features:
 * - Session storage check (animation runs once per session)
 * - Desktop viewport detection (≥768px only)
 * - Reduced motion detection for accessibility
 * - Viewport resize monitoring
 */
export function useProfileAnimation(): UseProfileAnimationReturn {
  const [isDesktop, setIsDesktop] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(true); // Default to true for SSR

  useEffect(() => {
    // Check if we're on desktop
    const checkViewport = () => {
      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(desktop);
    };

    // Check if user prefers reduced motion
    const checkReducedMotion = () => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
    };

    // Check if animation has already been shown this session
    const checkAnimationStatus = () => {
      try {
        const hasShown = sessionStorage.getItem(STORAGE_KEY) === 'true';
        setHasAnimated(hasShown);
      } catch (error) {
        // SessionStorage might not be available (privacy mode, etc.)
        console.warn('SessionStorage not available:', error);
        setHasAnimated(true); // Skip animation if we can't check
      }
    };

    // Initial checks
    checkViewport();
    checkReducedMotion();
    checkAnimationStatus();

    // Listen for viewport changes
    const handleResize = () => {
      checkViewport();
    };

    // Listen for reduced motion preference changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    window.addEventListener('resize', handleResize);
    mediaQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  const markAnimationComplete = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
      setHasAnimated(true);
    } catch (error) {
      console.warn('Could not save animation state:', error);
    }
  };

  // Animation should only run if:
  // 1. We're on desktop (≥768px)
  // 2. User doesn't prefer reduced motion
  // 3. Animation hasn't been shown this session
  const shouldAnimate = isDesktop && !prefersReducedMotion && !hasAnimated;

  return {
    shouldAnimate,
    isDesktop,
    prefersReducedMotion,
    markAnimationComplete,
  };
}
