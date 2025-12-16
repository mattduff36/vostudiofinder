/**
 * MobileShell - Client Component Wrapper for Mobile Navigation
 * 
 * Wraps bottom navigation and mobile menu drawer to isolate client-side
 * logic from the server-side layout.tsx.
 */
'use client';

import { useState } from 'react';
import { Session } from 'next-auth';
import { BottomNav } from './BottomNav';
import { MobileMenu } from './MobileMenu';

interface MobileShellProps {
  session: Session | null;
}

export function MobileShell({ session }: MobileShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <BottomNav 
        onMenuClick={() => setMenuOpen(true)} 
        session={session}
      />
      <MobileMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        session={session}
      />
    </>
  );
}
