/**
 * MobileMenu - Bottom-Right Popup Menu
 * 
 * Compact popup menu that appears from bottom-right:
 * - User profile section (if logged in)
 * - Quick links (About, Blog, Admin, Edit)
 * - Modern card-based design
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Session } from 'next-auth';
import {
  Settings,
  Info,
  FileText,
  Edit,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { getUserDisplayName, getUserAvatarUrl } from '@/lib/auth-utils';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
}

export function MobileMenu({ isOpen, onClose, session }: MobileMenuProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [loadingVisibility, setLoadingVisibility] = useState(true);

  // Close menu on route change
  useEffect(() => {
    onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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

  // Fetch profile visibility when menu opens and user is logged in
  useEffect(() => {
    if (isOpen && session?.user?.id) {
      fetchProfileVisibility();
    }
  }, [isOpen, session?.user?.id]);

  const fetchProfileVisibility = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setIsVisible(data.studio?.is_profile_visible ?? false);
      }
    } catch (error) {
      console.error('Error fetching profile visibility:', error);
    } finally {
      setLoadingVisibility(false);
    }
  };

  const handleToggleVisibility = async () => {
    setTogglingVisibility(true);
    try {
      const response = await fetch('/api/user/profile/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !isVisible }),
      });

      if (response.ok) {
        const newVisibility = !isVisible;
        setIsVisible(newVisibility);
        // Broadcast visibility change to other components
        window.dispatchEvent(new CustomEvent('profile-visibility-changed', { 
          detail: { isVisible: newVisibility } 
        }));
      } else {
        console.error('Failed to update visibility');
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
    } finally {
      setTogglingVisibility(false);
    }
  };

  const displayName = session?.user ? getUserDisplayName(session.user) : '';
  const avatarUrl = session?.user ? getUserAvatarUrl(session.user) : undefined;

  // Check if admin
  const isAdmin = session?.user?.email === 'admin@mpdee.co.uk' || session?.user?.username === 'VoiceoverGuy' || session?.user?.role === 'ADMIN';
  
  // Check if on profile page (for Edit button)
  const isOnProfilePage = pathname !== '/' && 
                          pathname !== '/studios' && 
                          pathname !== '/about' && 
                          pathname !== '/dashboard' &&
                          pathname !== '/admin' &&
                          !pathname.startsWith('/auth/') &&
                          !pathname.startsWith('/help') &&
                          !pathname.startsWith('/terms') &&
                          !pathname.startsWith('/privacy');

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
        <div className="py-2 px-3 max-h-80 overflow-y-auto">
          {/* About Us */}
          <Link
            href="/about"
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors mb-1 ${
              pathname === '/about'
                ? 'bg-red-50 text-[#d42027]'
                : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            <Info className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">About Us</span>
          </Link>

          {/* Blog (Coming Soon) */}
          <div className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 cursor-not-allowed mb-1">
            <FileText className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">Blog</span>
            <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
              Coming soon
            </span>
          </div>

          {/* Membership (logged in users only) */}
          {session && (
            <Link
              href="/dashboard#settings"
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors mb-1 ${
                pathname === '/dashboard' && typeof window !== 'undefined' && window.location.hash === '#settings'
                  ? 'bg-red-50 text-[#d42027]'
                  : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
              }`}
            >
              <CreditCard className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium">Membership</span>
            </Link>
          )}

          {/* Profile Visibility Toggle (logged in users only) */}
          {session && (
            <button
              onClick={handleToggleVisibility}
              disabled={togglingVisibility || loadingVisibility}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors mb-1 w-full ${
                togglingVisibility || loadingVisibility
                  ? 'opacity-50 cursor-not-allowed'
                  : isVisible
                  ? 'text-green-700 hover:bg-green-50 active:bg-green-100'
                  : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
              }`}
            >
              {togglingVisibility || loadingVisibility ? (
                <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" aria-hidden="true" />
              ) : isVisible ? (
                <Eye className="w-5 h-5 flex-shrink-0 text-green-600" aria-hidden="true" />
              ) : (
                <EyeOff className="w-5 h-5 flex-shrink-0 text-gray-600" aria-hidden="true" />
              )}
              <span className={`text-sm font-medium flex-1 text-left ${isVisible ? 'text-green-700' : 'text-gray-700'}`}>
                {isVisible ? 'Hide Profile' : 'Make Profile Visible'}
              </span>
            </button>
          )}

          {/* Admin Panel (admin only) */}
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

          {/* Edit (admin only, when on profile page) */}
          {isAdmin && isOnProfilePage && (
            <button
              onClick={(e) => {
                e.preventDefault();
                // Update the hash
                window.location.hash = 'edit';
                // Manually trigger hashchange event
                window.dispatchEvent(new HashChangeEvent('hashchange'));
                // Close the menu
                onClose();
              }}
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors mb-1 w-full"
            >
              <Edit className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium">Edit Profile</span>
            </button>
          )}
        </div>

        {/* Arrow pointing to Menu button */}
        <div className="absolute bottom-[-8px] right-6 w-4 h-4 bg-white border-r border-b border-gray-200 transform rotate-45" />
      </div>
    </>
  );
}
