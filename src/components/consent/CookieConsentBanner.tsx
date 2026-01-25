'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

type ConsentLevel = 'all' | 'necessary' | 'decline' | null;

// Extend Window interface for Google Analytics
declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

interface CookieConsentBannerProps {
  initialLevel: ConsentLevel;
}

export function CookieConsentBanner({ initialLevel }: CookieConsentBannerProps) {
  const [showBanner, setShowBanner] = useState(initialLevel === null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const animationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const errorOccurredRef = React.useRef<boolean>(false);

  // Manage body class for conditional mobile padding
  // Keep class active during both visible state AND exit animation
  useEffect(() => {
    if (showBanner || isAnimatingOut) {
      document.body.classList.add('cookie-banner-visible');
    } else {
      document.body.classList.remove('cookie-banner-visible');
    }
    
    return () => {
      document.body.classList.remove('cookie-banner-visible');
    };
  }, [showBanner, isAnimatingOut]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // Don't render if user has already made a choice and animation is complete
  if (!showBanner && !isAnimatingOut) {
    return null;
  }

  const handleConsent = async (level: 'all' | 'necessary' | 'decline') => {
    setIsSubmitting(true);

    try {
      // Delete existing Google Analytics cookies if user declines or chooses necessary only
      if (level === 'decline' || level === 'necessary') {
        // Get all cookies
        const cookies = document.cookie.split(';');
        
        // Delete GA cookies
        cookies.forEach(cookie => {
          const cookieName = cookie.split('=')[0]?.trim();
          if (cookieName && (cookieName.startsWith('_ga') || cookieName.startsWith('_gid') || cookieName.startsWith('_gat'))) {
            // Delete cookie by setting it to expire
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
      }

      // Send consent choice to server
      const response = await fetch('/api/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ level }),
      });

      if (response.ok) {
        // Apply consent settings without page reload
        if (level === 'all') {
          // Dynamically load Google Analytics if user accepts
          // Check if GA is already loaded or loading to prevent duplicates
          const existingGA = document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
          const hasDataLayer = window.dataLayer && Array.isArray(window.dataLayer);
          
          if (!existingGA && !hasDataLayer) {
            window.dataLayer = [];
            function gtag(...args: any[]) {
              window.dataLayer!.push(args);
            }
            window.gtag = gtag;
            
            // Load GA script and wait for it to load before adding config script
            const script1 = document.createElement('script');
            script1.src = 'https://www.googletagmanager.com/gtag/js?id=G-JKPCYM50W7';
            script1.async = true;
            
            // Mark script as loading to prevent duplicate loads
            script1.setAttribute('data-ga-loading', 'true');
            
            // Wait for script1 to load before adding script2
            script1.onload = () => {
              script1.removeAttribute('data-ga-loading');
              const script2 = document.createElement('script');
              script2.innerHTML = `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-JKPCYM50W7');
              `;
              document.head.appendChild(script2);
            };
            
            script1.onerror = () => {
              console.error('Failed to load Google Analytics script');
              script1.removeAttribute('data-ga-loading');
            };
            
            document.head.appendChild(script1);
          } else if (existingGA && !hasDataLayer) {
            // Script exists but dataLayer not ready
            // Initialize dataLayer immediately (script may already be loaded)
            // Also add event listener as fallback in case script is still loading
            const initializeDataLayer = () => {
              if (!window.dataLayer) {
                window.dataLayer = [];
              }
              if (!window.gtag) {
                function gtag(...args: any[]) {
                  window.dataLayer!.push(args);
                }
                window.gtag = gtag;
              }
            };
            
            // Try to initialize immediately (script may already be loaded)
            initializeDataLayer();
            
            // Also listen for load event in case script is still loading
            // This handles both cases: already loaded and still loading
            existingGA.addEventListener('load', initializeDataLayer);
          }
        }
        
        // Hide banner with smooth animation
        setIsAnimatingOut(true);
        // Don't reset isSubmitting yet - wait for animation to complete
        // This prevents race condition where buttons become enabled while banner is still animating
        // Reset error flag before setting timeout
        errorOccurredRef.current = false;
        // Clear any existing timeout
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
        }
        animationTimeoutRef.current = setTimeout(() => {
          // Only apply timeout state changes if no error occurred
          // This prevents race condition where error occurs after timeout is set
          if (!errorOccurredRef.current) {
            setShowBanner(false);
            setIsAnimatingOut(false);
            // Reset submitting state after animation completes
            setIsSubmitting(false);
          }
          animationTimeoutRef.current = null;
        }, 300); // Match transition duration
      } else {
        console.error('Failed to set cookie consent');
        // Mark error occurred to prevent timeout callback from overwriting error state
        errorOccurredRef.current = true;
        // Clear any pending animation timeout
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
          animationTimeoutRef.current = null;
        }
        // Reset all states immediately on error
        setIsAnimatingOut(false);
        setIsSubmitting(false);
        // Unconditionally restore banner visibility on error
        // Don't check showBanner state as it may be stale due to closure
        setShowBanner(true);
      }
    } catch (error) {
      console.error('Error setting cookie consent:', error);
      // Mark error occurred to prevent timeout callback from overwriting error state
      errorOccurredRef.current = true;
      // Clear any pending animation timeout
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      // Reset all states immediately on error
      setIsAnimatingOut(false);
      setIsSubmitting(false);
      // Unconditionally restore banner visibility on error
      // Don't check showBanner state as it may be stale due to closure
      setShowBanner(true);
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[9999] bg-black/95 backdrop-blur-sm border-t border-white/10 transition-all duration-300 ease-in-out ${
      showBanner && !isAnimatingOut ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Content */}
          <div className="flex-1 text-white">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm text-white/80 mb-2">
                  We use cookies to ensure site functionality and, with your consent, to analyse traffic and improve your experience.
                </p>
                <p className="text-xs text-white/60">
                  Essential cookies (login, security) are always active. Analytics cookies require your consent.{' '}
                  <a href="/privacy" className="underline hover:text-white">
                    Learn more
                  </a>
                </p>
              </div>
              {/* Close button - only shows on mobile */}
              <button
                onClick={() => handleConsent('necessary')}
                className="sm:hidden text-white/70 hover:text-white transition-colors p-1"
                aria-label="Close and accept necessary only"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleConsent('decline')}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Decline
            </button>
            <button
              onClick={() => handleConsent('necessary')}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-white/20 hover:bg-white/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Necessary Only
            </button>
            <button
              onClick={() => handleConsent('all')}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

