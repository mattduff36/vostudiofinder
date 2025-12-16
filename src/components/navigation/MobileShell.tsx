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
  const [menuOpen, setMenuOpen] = useState(false);

  // Phase 1 feature gate
  if (!isMobileFeatureEnabled(1)) {
    return null;
  }

  const handleMenuClick = () => {
    console.log('🔵 Menu button clicked, setting menuOpen to true');
    setMenuOpen(true);
    console.log('🔵 menuOpen state updated');
  };

  console.log('🔵 MobileShell render, menuOpen:', menuOpen);

  return (
    <>
      <BottomNav onMenuClick={handleMenuClick} />
      <MobileMenu 
        isOpen={menuOpen} 
        onClose={() => {
          console.log('🔵 Closing menu, setting menuOpen to false');
          setMenuOpen(false);
        }} 
        session={session} 
      />
    </>
  );
}
