/**
 * MobileMenu - Right-Side Drawer Menu
 * 
 * Slide-in drawer for mobile navigation with:
 * - User profile section (if logged in)
 * - Primary navigation links
 * - Studio-related actions (if studio owner)
 * - Account settings
 * - Sign in/out
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import {
  X,
  Settings,
  HelpCircle,
  LogOut,
  LogIn,
  UserPlus,
  LayoutDashboard,
  MapPin,
} from 'lucide-react';
import { getUserDisplayName, getUserAvatarUrl } from '@/lib/auth-utils';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
}

export function MobileMenu({ isOpen, onClose, session }: MobileMenuProps) {
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const displayName = session?.user ? getUserDisplayName(session.user) : '';
  const avatarUrl = session?.user ? getUserAvatarUrl(session.user) : undefined;

  // Check if admin
  const isAdmin = session?.user?.email === 'admin@mpdee.co.uk';

  const menuSections = [
    {
      title: 'Navigation',
      links: [
        { label: 'Studios', href: '/studios', icon: MapPin },
        { label: 'About', href: '/about', icon: HelpCircle },
      ],
    },
  ];

  if (session) {
    const accountLinks = [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ];

    // Add admin links if admin
    if (isAdmin) {
      accountLinks.push({ label: 'Admin Panel', href: '/admin', icon: Settings });
    }

    menuSections.push({
      title: 'My Account',
      links: accountLinks,
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 md:hidden z-[60] ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300 ease-in-out md:hidden z-[70] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto h-[calc(100%-73px)]">
          {/* User Profile Section */}
          {session && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#d42027] flex items-center justify-center text-white font-semibold">
                    {displayName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    Welcome, {displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Menu Sections */}
          <div className="py-2">
            {menuSections.map((section) => (
              <div key={section.title} className="mb-2">
                <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.title}
                </h3>
                <nav className="space-y-1 px-2">
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-red-50 text-[#d42027]'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                        <span className="text-sm font-medium">{link.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          {/* Auth Actions */}
          <div className="border-t border-gray-200 p-2 mt-4">
            {session ? (
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors w-full"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors mb-1"
                >
                  <LogIn className="w-5 h-5" aria-hidden="true" />
                  <span className="text-sm font-medium">Sign In</span>
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#d42027] text-white hover:bg-[#a1181d] transition-colors"
                >
                  <UserPlus className="w-5 h-5" aria-hidden="true" />
                  <span className="text-sm font-medium">List Your Studio</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
