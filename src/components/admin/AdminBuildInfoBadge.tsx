'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import { useAdminSandbox, updateAdminSandbox } from '@/lib/admin/sandbox-store';
import { showError } from '@/lib/toast';
import { BuildInfoFloatingBadge } from '@/components/profile/BuildInfoFloatingBadge';

function isAdminSession(session: Session | null): boolean {
  const u = session?.user;
  if (!u) return false;
  return u.role === 'ADMIN';
}

export function AdminBuildInfoBadge() {
  const { data: session, status } = useSession();
  const sandbox = useAdminSandbox();
  const sandboxActive = sandbox.enabled;
  const [confirmDisable, setConfirmDisable] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useMemo(() => {
    if (status !== 'authenticated') return false;
    if (!session?.user?.id) return false;
    return isAdminSession(session);
  }, [session, status]);

  // Clean up confirm timer on unmount
  useEffect(() => {
    return () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); };
  }, []);

  const handleBadgeClick = useCallback(() => {
    if (!confirmDisable) {
      // First click — enter confirmation state
      setConfirmDisable(true);
      confirmTimer.current = setTimeout(() => {
        setConfirmDisable(false);
      }, 3000);
    } else {
      // Second click within 3s — disable sandbox
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      setConfirmDisable(false);
      if (!updateAdminSandbox({ enabled: false })) showError('Sandbox could not be disabled. The previous settings remain active.');
    }
  }, [confirmDisable]);

  if (!show) return null;

  return (
    <>
      {/* Sandbox Active badge – sits directly above the build-info badge */}
      {sandboxActive && (
        <button
          type="button"
          onClick={handleBadgeClick}
          className={`hidden md:flex fixed bottom-10 left-4 z-50 items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[11px] font-semibold shadow-lg select-none cursor-pointer transition-colors duration-200 ${
            confirmDisable ? 'bg-red-600' : 'bg-amber-500'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full bg-white ${confirmDisable ? '' : 'animate-pulse'}`} />
          {confirmDisable ? 'Disable Sandbox?' : 'Sandbox Active'}
        </button>
      )}
      <BuildInfoFloatingBadge />
    </>
  );
}

