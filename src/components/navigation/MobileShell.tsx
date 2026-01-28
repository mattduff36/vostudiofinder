/**
 * MobileShell - Client Component Wrapper for Mobile Navigation
 * 
 * Uses a clean burger menu matching desktop styling.
 * Previously used liquid glass navigation - see /liquid-glass-nav-buttons for that code.
 */
'use client';

import { Session } from 'next-auth';
import { MobileBurgerMenu } from './MobileBurgerMenu';

interface MobileShellProps {
  session: Session | null;
}

export function MobileShell({ session }: MobileShellProps) {
  const isAdminUser =
    session?.user?.email === 'admin@mpdee.co.uk' ||
    session?.user?.username === 'VoiceoverGuy' ||
    session?.user?.role === 'ADMIN';

  return (
    <MobileBurgerMenu 
      session={session} 
      isAdminUser={isAdminUser}
    />
  );
}
