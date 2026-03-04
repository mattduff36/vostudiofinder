'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface UseHasNewPlatformUpdatesResult {
  hasNew: boolean;
  isLoading: boolean;
  markSeen: () => void;
}

/**
 * Hook to check if there are new platform updates since the user last viewed them.
 * Listens for 'platformUpdatesSeen' events so all instances clear in sync.
 */
export function useHasNewPlatformUpdates(): UseHasNewPlatformUpdatesResult {
  const { data: session, status } = useSession();
  const [hasNew, setHasNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (!session?.user?.id) {
      setIsLoading(false);
      setHasNew(false);
      return;
    }

    let cancelled = false;

    fetch('/api/platform-updates/has-new')
      .then((res) => (res.ok ? res.json() : { hasNew: false }))
      .then((data) => {
        if (!cancelled) {
          setHasNew(data.hasNew ?? false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasNew(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, status]);

  useEffect(() => {
    const handleSeen = () => setHasNew(false);
    window.addEventListener('platformUpdatesSeen', handleSeen);
    return () => window.removeEventListener('platformUpdatesSeen', handleSeen);
  }, []);

  const markSeen = useCallback(() => {
    setHasNew(false);
    window.dispatchEvent(new CustomEvent('platformUpdatesSeen'));
    fetch('/api/platform-updates/mark-seen', { method: 'POST' }).catch(() => {});
  }, []);

  return { hasNew, isLoading, markSeen };
}
