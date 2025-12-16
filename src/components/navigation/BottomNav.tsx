/**
 * BottomNav - Mobile Bottom Navigation Bar
 * 
 * Fixed bottom navigation with 4 primary actions:
 * - Home
 * - Search
 * - Dashboard/More
 * - Menu
 * 
 * Only visible on mobile (< 768px), hidden on desktop.
 */
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Search, LayoutDashboard, Menu } from 'lucide-react';
import { Session } from 'next-auth';
import { zIndex } from '@/lib/theme';

interface BottomNavProps {
  session: Session | null;
  onMenuClick: () => void;
}

export function BottomNav({ onMenuClick }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Home',
      icon: Home,
      href: '/',
      active: pathname === '/',
    },
    {
      label: 'Studios',
      icon: Search,
      href: '/studios',
      active: pathname === '/studios',
    },
    {
      label: 'About',
      icon: LayoutDashboard,
      href: '/about',
      active: pathname === '/about',
    },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom md:hidden z-[${zIndex.bottomNav}]`}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                item.active
                  ? 'text-[#d42027]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-label={item.label}
              aria-current={item.active ? 'page' : undefined}
            >
              <Icon className="w-6 h-6" aria-hidden="true" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Menu button */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Open menu"
          aria-expanded="false"
        >
          <Menu className="w-6 h-6" aria-hidden="true" />
          <span className="text-xs font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}
