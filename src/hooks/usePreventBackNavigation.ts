'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface UsePreventBackNavigationOptions {
  enabled?: boolean;
  warningMessage?: string;
  onBackAttempt?: () => void;
  allowBackAfter?: () => boolean;
}

/**
 * Hook to prevent browser back navigation on critical pages
 * Uses history API manipulation and confirmation dialogs
 */
export function usePreventBackNavigation(options: UsePreventBackNavigationOptions = {}) {
  const {
    enabled = true,
    warningMessage = 'Are you sure you want to leave? Your progress may be lost.',
    onBackAttempt,
    allowBackAfter,
  } = options;

  const historyPushedRef = useRef(false);

  const handlePopState = useCallback(() => {
    if (!enabled) return;

    // Check if back navigation is allowed
    if (allowBackAfter && allowBackAfter()) {
      return;
    }

    // Call callback if provided
    if (onBackAttempt) {
      onBackAttempt();
    }

    // Show confirmation dialog
    const confirmed = window.confirm(warningMessage);

    if (!confirmed) {
      // User wants to stay - push state forward again
      window.history.pushState(null, '', window.location.href);
    } else {
      // User confirmed they want to leave - allow navigation
      // Remove the event listener to prevent interfering
      window.removeEventListener('popstate', handlePopState);
    }
  }, [enabled, warningMessage, onBackAttempt, allowBackAfter]);

  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (!enabled) return;

    // Check if navigation is allowed
    if (allowBackAfter && allowBackAfter()) {
      return;
    }

    // Standard way to show browser warning
    event.preventDefault();
    event.returnValue = warningMessage;
    return warningMessage;
  }, [enabled, warningMessage, allowBackAfter]);

  useEffect(() => {
    if (!enabled) return;

    // Push initial state to create a history entry
    // This allows us to detect when user presses back
    if (!historyPushedRef.current) {
      window.history.pushState(null, '', window.location.href);
      historyPushedRef.current = true;
    }

    // Listen for back button
    window.addEventListener('popstate', handlePopState);

    // Listen for page unload (close/refresh)
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, handlePopState, handleBeforeUnload]);

  return {
    // Allow components to manually enable/disable protection
    isEnabled: enabled,
  };
}

