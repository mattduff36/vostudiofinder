'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';

/**
 * Client-side wrapper for Vercel Analytics that loads dynamically
 * based on cookie consent. This allows analytics to be enabled without
 * requiring a page reload.
 */
export function DynamicAnalytics() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // Check cookie consent on mount and when it changes
    const checkConsent = () => {
      const consentCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('vsf_cookie_consent='));
      
      const consentLevel = consentCookie?.split('=')[1];
      const hasConsentNow = consentLevel === 'all';
      setHasConsent(hasConsentNow);
      return hasConsentNow;
    };

    // Check immediately
    const initialConsent = checkConsent();
    
    // If consent already exists, no need to poll
    if (initialConsent) {
      return;
    }

    // Listen for cookie changes with longer interval to reduce CPU usage
    // Check every 2 seconds instead of 500ms, and stop once consent is detected
    const interval = setInterval(() => {
      const hasConsentNow = checkConsent();
      if (hasConsentNow) {
        clearInterval(interval);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  if (!hasConsent) {
    return null;
  }

  return <Analytics />;
}

