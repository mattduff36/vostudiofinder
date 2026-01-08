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
    
    // Always set up polling to detect consent changes after mount
    // This handles cases where consent changes from non-'all' to 'all' after page load
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

