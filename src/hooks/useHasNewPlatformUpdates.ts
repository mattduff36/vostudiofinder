'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface UseHasNewPlatformUpdatesResult {
  hasNew: boolean;
  isLoading: boolean;
}

/**
 * Hook to check if there are new platform updates since the user's last login.
 * Only fetches when the user is logged in.
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

  return { hasNew, isLoading };
}
