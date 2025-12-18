/**
 * useScrollDirection Hook
 * 
 * Detects scroll direction and position for showing/hiding navigation bars.
 * Returns:
 * - scrollDirection: 'up' | 'down' - the current scroll direction
 * - isAtTop: boolean - whether the page is scrolled to the top
 */
'use client';

import { useState, useEffect } from 'react';

interface ScrollDirectionOptions {
  threshold?: number; // Minimum scroll distance to trigger direction change
  initialDirection?: 'up' | 'down';
}

export function useScrollDirection(options: ScrollDirectionOptions = {}) {
  const { threshold = 10, initialDirection = 'up' } = options;
  
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>(initialDirection);
  const [isAtTop, setIsAtTop] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    // Initialize scroll position
    setLastScrollY(window.scrollY);
    setIsAtTop(window.scrollY < 10);

    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;

      // Check if at top
      setIsAtTop(scrollY < 10);

      // Only update direction if we've scrolled past the threshold
      if (Math.abs(scrollY - lastScrollY) < threshold) {
        ticking = false;
        return;
      }

      // Update direction based on scroll position
      if (scrollY > lastScrollY && scrollY > 80) {
        // Scrolling down and not near top
        setScrollDirection('down');
      } else if (scrollY < lastScrollY) {
        // Scrolling up
        setScrollDirection('up');
      }

      setLastScrollY(scrollY);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY, threshold]);

  return { scrollDirection, isAtTop };
}
