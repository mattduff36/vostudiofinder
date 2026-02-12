'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentLocation } from '@/lib/maps';
import { logger } from '@/lib/logger';

interface UserLocation {
  lat: number;
  lng: number;
  source: 'browser' | 'ip' | null;
}

interface UseUserLocationReturn {
  /** Resolved user location (browser or IP fallback), or null if unknown */
  userLocation: UserLocation | null;
  /** Whether the browser geolocation permission is 'granted' | 'prompt' | 'denied' */
  permissionState: PermissionState | null;
  /** Call this when the user interacts with the search box to trigger the soft prompt flow */
  requestPreciseLocation: () => void;
  /** True while waiting for either IP-geo or browser geolocation */
  isResolving: boolean;
}

/**
 * Shared hook that resolves the user's location for sorting autocomplete results.
 *
 * Strategy:
 * 1. On mount, fetch coarse location from /api/geo/ip (Vercel headers — no prompt).
 * 2. On first search-box interaction, check `navigator.permissions` for geolocation:
 *    - 'granted': silently call getCurrentLocation().
 *    - 'prompt': the caller can show an inline affordance; when accepted, call requestPreciseLocation().
 *    - 'denied': stick with IP-geo.
 * 3. Cache the result in memory for the session.
 */
export function useUserLocation(): UseUserLocationReturn {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const hasRequestedBrowser = useRef(false);
  const hasRequestedIp = useRef(false);

  // 1. Fetch IP-based coarse location on mount (no prompt, silent)
  useEffect(() => {
    if (hasRequestedIp.current) return;
    hasRequestedIp.current = true;

    (async () => {
      try {
        const res = await fetch('/api/geo/ip');
        if (res.ok) {
          const data = await res.json();
          if (data.lat && data.lng) {
            logger.log('🌐 IP-geo location obtained:', data);
            setUserLocation({ lat: data.lat, lng: data.lng, source: 'ip' });
          }
        }
      } catch {
        // Silently ignore — IP-geo is best-effort
      }
    })();
  }, []);

  // 2. Probe the permission state on mount (no prompt triggered)
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    if (!navigator.permissions) return;

    navigator.permissions.query({ name: 'geolocation' }).then((status) => {
      setPermissionState(status.state);
      logger.log('📍 Geolocation permission state:', status.state);

      // If already granted, fetch precise location immediately (no prompt)
      if (status.state === 'granted' && !hasRequestedBrowser.current) {
        hasRequestedBrowser.current = true;
        fetchBrowserLocation();
      }

      // Listen for changes (user might grant/deny while on the page)
      status.addEventListener('change', () => {
        setPermissionState(status.state);
        if (status.state === 'granted' && !hasRequestedBrowser.current) {
          hasRequestedBrowser.current = true;
          fetchBrowserLocation();
        }
      });
    }).catch(() => {
      // Permissions API not supported — will rely on IP-geo
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBrowserLocation = useCallback(async () => {
    setIsResolving(true);
    try {
      const loc = await getCurrentLocation();
      logger.log('📍 Browser geolocation obtained:', loc);
      setUserLocation({ lat: loc.lat, lng: loc.lng, source: 'browser' });
    } catch (err) {
      logger.warn('📍 Browser geolocation failed:', err);
      // Keep whatever we already have (IP-geo or null)
    } finally {
      setIsResolving(false);
    }
  }, []);

  // 3. Explicit request for precise location (triggers browser prompt if needed)
  const requestPreciseLocation = useCallback(() => {
    if (hasRequestedBrowser.current) return;
    if (userLocation?.source === 'browser') return; // Already have precise
    hasRequestedBrowser.current = true;
    fetchBrowserLocation();
  }, [fetchBrowserLocation, userLocation]);

  return {
    userLocation,
    permissionState,
    requestPreciseLocation,
    isResolving,
  };
}
