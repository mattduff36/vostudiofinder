/**
 * MobileShell - Client Component Wrapper for Mobile Navigation
 * 
 * Wraps mobile glass navigation with integrated expanding menu.
 * Uses adaptive glass effect that changes based on background.
 */
'use client';

import { Session } from 'next-auth';
import { MobileGlassNav } from './MobileGlassNav';

interface MobileShellProps {
  session: Session | null;
}

export function MobileShell({ session }: MobileShellProps) {
  return <MobileGlassNav session={session} />;
}
