/**
 * MobileMenu - Bottom-Right Popup Menu
 * 
 * Compact popup menu that appears from bottom-right:
 * - User profile section (if logged in)
 * - Quick links (Dashboard, Admin)
 * - Sign in/out actions
 * - Modern card-based design
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import {
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  LayoutDashboard,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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

  return (
    <>
      {/* Semi-transparent backdrop for outside clicks */}
      {isOpen && (
        <div
          className="fixed inset-0 md:hidden z-[60]"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-hidden="true"
        />
      )}

      {/* Compact Bottom-Right Popup */}
      <div
        className={`fixed bottom-20 right-4 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 transform transition-all duration-300 ease-out md:hidden z-[70] ${
          isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95 pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
      >
        {/* User Profile Section (if logged in) */}
        {session && (
          <div className="p-4 bg-gradient-to-br from-red-50 to-white border-b border-gray-100">
            <div className="flex items-center space-x-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#d42027] flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {displayName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="py-2 px-3 max-h-64 overflow-y-auto">
          {session ? (
            <>
              {/* Dashboard Link */}
              <Link
                href="/dashboard"
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors mb-1 ${
                  pathname === '/dashboard' || pathname.startsWith('/dashboard/')
                    ? 'bg-red-50 text-[#d42027]'
                    : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">Dashboard</span>
              </Link>

              {/* Admin Link (if admin) */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors mb-1 ${
                    pathname === '/admin' || pathname.startsWith('/admin/')
                      ? 'bg-red-50 text-[#d42027]'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <Settings className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium">Admin Panel</span>
                </Link>
              )}

              {/* Divider */}
              <div className="my-2 border-t border-gray-100" />

              {/* Sign Out */}
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors w-full"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              {/* Sign In */}
              <Link
                href="/auth/signin"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors mb-1"
              >
                <LogIn className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">Sign In</span>
              </Link>

              {/* List Your Studio (Primary CTA) */}
              <Link
                href="/auth/signup"
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-[#d42027] text-white hover:bg-[#a1181d] active:bg-[#8a1419] transition-colors shadow-sm"
              >
                <UserPlus className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold">List Your Studio</span>
              </Link>
            </>
          )}
        </div>

        {/* Arrow pointing to Menu button */}
        <div className="absolute bottom-[-8px] right-6 w-4 h-4 bg-white border-r border-b border-gray-200 transform rotate-45" />
      </div>
    </>
  );
}
