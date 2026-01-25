/**
 * MobileShell - Client Component Wrapper for Mobile Navigation
 * 
 * Uses a clean burger menu matching desktop styling.
 * Previously used liquid glass navigation - see /liquid-glass-nav-buttons for that code.
 */
'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { MobileBurgerMenu } from './MobileBurgerMenu';

interface MobileShellProps {
  session: Session | null;
}

export function MobileShell({ session }: MobileShellProps) {
  const [showEditButton, setShowEditButton] = useState(false);

  const isAdminUser =
    session?.user?.email === 'admin@mpdee.co.uk' ||
    session?.user?.username === 'VoiceoverGuy' ||
    session?.user?.role === 'ADMIN';

  // Mirror the desktop "ADMIN / EDIT" buttons behavior for mobile
  useEffect(() => {
    if (!isAdminUser) return;

    const handleEditHandlerReady = () => setShowEditButton(true);
    const handleEditHandlerUnmount = () => setShowEditButton(false);

    window.addEventListener('profileEditHandlerReady', handleEditHandlerReady);
    window.addEventListener('profileEditHandlerUnmount', handleEditHandlerUnmount);

    return () => {
      window.removeEventListener('profileEditHandlerReady', handleEditHandlerReady);
      window.removeEventListener('profileEditHandlerUnmount', handleEditHandlerUnmount);
    };
  }, [isAdminUser]);

  return (
    <MobileBurgerMenu 
      session={session} 
      isAdminUser={isAdminUser}
      showEditButton={showEditButton}
    />
  );
}
