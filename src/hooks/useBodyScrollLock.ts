'use client';
import { useEffect } from 'react';
import { acquireBodyScrollLock } from '@/lib/ui/overlay-manager';
export function useBodyScrollLock(active: boolean) {
  useEffect(() => { if (active) return acquireBodyScrollLock(); return undefined; }, [active]);
}
