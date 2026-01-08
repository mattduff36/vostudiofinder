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
      setHasConsent(consentLevel === 'all');
    };

    // Check immediately
    checkConsent();

    // Listen for cookie changes (when consent banner updates)
    const interval = setInterval(checkConsent, 500);
    
    return () => clearInterval(interval);
  }, []);

  if (!hasConsent) {
    return null;
  }

  return <Analytics />;
}

