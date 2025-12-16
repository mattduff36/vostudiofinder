/**
 * MobileShell - Client Component Wrapper for Mobile Navigation
 * 
 * Wraps bottom navigation and mobile menu drawer to isolate client-side
 * logic from the server-side layout.tsx.
 * 
 * Feature gated by Phase 1 flag.
 */
'use client';

import { useState } from 'react';
import { Session } from 'next-auth';
import { isMobileFeatureEnabled } from '@/lib/feature-flags';
import { BottomNav } from './BottomNav';
import { MobileMenu } from './MobileMenu';

interface MobileShellProps {
  session: Session | null;
}

export function MobileShell({ session }: MobileShellProps) {
  // Phase 1 feature gate
  if (!isMobileFeatureEnabled(1)) {
    return null;
  }

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <BottomNav session={session} onMenuClick={() => setMenuOpen(true)} />
      <MobileMenu 
        isOpen={menuOpen} 
        onClose={() => setMenuOpen(false)} 
        session={session} 
      />
    </>
  );
}
