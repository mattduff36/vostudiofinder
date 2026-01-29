'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { BuildInfoFloatingBadge } from '@/components/profile/BuildInfoFloatingBadge';

function isAdminSession(session: any): boolean {
  const u = session?.user;
  if (!u) return false;
  return u.role === 'ADMIN' || u.email === 'admin@mpdee.co.uk' || u.username === 'VoiceoverGuy';
}

export function AdminBuildInfoBadge() {
  const { data: session, status } = useSession();

  const show = useMemo(() => {
    if (status !== 'authenticated') return false;
    if (!session?.user?.id) return false;
    return isAdminSession(session);
  }, [session, status]);

  if (!show) return null;
  return <BuildInfoFloatingBadge />;
}

