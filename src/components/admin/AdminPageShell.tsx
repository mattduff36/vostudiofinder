import { ReactNode } from 'react';

interface AdminPageShellProps {
  children: ReactNode;
  /** Max width constraint (default: 7xl) */
  maxWidth?: 'full' | '7xl' | '6xl' | '5xl' | '4xl';
  /** Custom padding override (otherwise uses responsive defaults) */
  padding?: string;
}

/**
 * Consistent layout shell for admin pages.
 * Provides responsive padding and max-width.
 */
export function AdminPageShell({
  children,
  maxWidth = '7xl',
  padding,
}: AdminPageShellProps) {
  const maxWidthClass = {
    full: 'max-w-full',
    '7xl': 'max-w-7xl',
    '6xl': 'max-w-6xl',
    '5xl': 'max-w-5xl',
    '4xl': 'max-w-4xl',
  }[maxWidth];

  const paddingClass = padding || 'px-4 py-4 md:px-8 md:py-8';

  return (
    <div className={`min-h-screen ${paddingClass}`}>
      <div className={`mx-auto ${maxWidthClass}`}>
        {children}
      </div>
    </div>
  );
}
