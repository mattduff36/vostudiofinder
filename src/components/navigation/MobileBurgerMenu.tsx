/**
 * MobileBurgerMenu - Mobile burger menu matching desktop styling
 * 
 * Replaces the liquid-glass menu with a clean, desktop-style dropdown menu.
 * Shows quick nav links at the top plus all menu items from getMobileMenuItems.
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Home, Search, User, LayoutDashboard, Loader2 } from 'lucide-react';
import { Session } from 'next-auth';
import { getMobileMenuItems, BOTTOM_NAV_BUTTON_IDS } from '@/config/navigation';

interface MobileBurgerMenuProps {
  session: Session | null;
  isAdminUser: boolean;
  showEditButton: boolean;
}

export function MobileBurgerMenu({ session, isAdminUser, showEditButton }: MobileBurgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [loadingVisibility, setLoadingVisibility] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Fetch profile visibility on mount (signed-in only)
  useEffect(() => {
    if (!session) {
      setLoadingVisibility(false);
      return;
    }

    const fetchProfileVisibility = async () => {
      setLoadingVisibility(true);
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          setIsVisible(data?.data?.studio?.is_profile_visible ?? false);
        }
      } catch (error) {
        console.error('Error fetching profile visibility:', error);
      } finally {
        setLoadingVisibility(false);
      }
    };

    fetchProfileVisibility();
  }, [session]);

  // Keep in sync if another component toggles visibility
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ isVisible: boolean }>;
      if (customEvent?.detail && typeof customEvent.detail.isVisible === 'boolean') {
        setIsVisible(customEvent.detail.isVisible);
      }
    };
    window.addEventListener('profile-visibility-changed', handler as EventListener);
    return () => window.removeEventListener('profile-visibility-changed', handler as EventListener);
  }, []);

  // Prevent body scroll when menu is open
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

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Listen for toggle event from Navbar button
  useEffect(() => {
    const handleToggleMenu = () => setIsOpen(prev => !prev);
    window.addEventListener('toggleMobileBurgerMenu', handleToggleMenu);
    return () => window.removeEventListener('toggleMobileBurgerMenu', handleToggleMenu);
  }, []);

  // Update navbar button icon when menu opens/closes
  useEffect(() => {
    const btn = document.querySelector('.mobile-burger-btn');
    const icon = btn?.querySelector('.mobile-burger-icon');
    if (icon) {
      if (isOpen) {
        // Change to X icon
        icon.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
      } else {
        // Change back to hamburger icon
        icon.innerHTML = '<line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line>';
      }
    }
  }, [isOpen]);

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

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  const handleAction = (action: string) => {
    setIsOpen(false);
    if (action === 'logout') {
      signOut({ callbackUrl: '/' });
    } else if (action === 'profileEditClick') {
      window.dispatchEvent(new Event('profileEditClick'));
    } else if (action === 'resetCookies') {
      document.cookie = 'vsf_cookie_consent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.location.reload();
    }
  };

  // Get menu items from config
  const bottomNavIds = session 
    ? BOTTOM_NAV_BUTTON_IDS.SIGNED_IN 
    : BOTTOM_NAV_BUTTON_IDS.SIGNED_OUT;

  const menuItems = getMobileMenuItems({
    session,
    isAdminUser,
    showEditButton,
    username: session?.user?.username,
    pathname,
    bottomNavIds,
  });

  // Build quick nav items (just Home and Browse Studios in the grid)
  const quickNavItems = [
    { id: 'home', label: 'Home', icon: Home, href: '/', active: pathname === '/' },
    { id: 'studios', label: 'Browse Studios', icon: Search, href: '/studios', active: pathname === '/studios' },
  ];

  // Profile nav items (Overview, My Profile) - shown below Welcome for logged-in users
  const profileNavItems = session ? [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard', active: pathname.startsWith('/dashboard') },
    { id: 'myProfile', label: 'My Profile', icon: User, href: `/${session.user.username}`, active: pathname === `/${session.user.username}` },
  ] : [];

  return (
    <>
      {/* Menu Overlay - Button is now in Navbar component */}
      {isOpen && (
        <div className="fixed inset-0 z-[250] md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel - Positioned below navbar, wider for better readability */}
          <div 
            ref={menuRef}
            className="absolute top-16 right-4 w-[352px] bg-white rounded-lg shadow-xl border border-gray-200 max-h-[80vh] overflow-y-auto"
            role="menu"
            aria-orientation="vertical"
          >
            {/* Action Buttons (Signed-out only) */}
            {!session && (
              <div className="px-4 py-3 border-b border-gray-100 space-y-2">
                {/* Sign In - Outline Button */}
                <button
                  type="button"
                  onClick={() => handleNavigation('/auth/signin')}
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-[#d42027] text-[#d42027] bg-transparent hover:bg-red-50 active:bg-red-100 text-sm font-medium transition-all"
                  role="menuitem"
                >
                  Sign In
                </button>
                {/* List Your Studio - Filled Red Button */}
                <button
                  type="button"
                  onClick={() => handleNavigation('/register')}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#d42027] text-white hover:bg-[#b91c23] active:bg-[#a01820] text-sm font-medium transition-all"
                  role="menuitem"
                >
                  List Your Studio
                </button>
              </div>
            )}

            {/* Quick Nav Grid (Home, Browse Studios) */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="grid grid-cols-2 gap-2">
                {quickNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigation(item.href)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        item.active
                          ? 'bg-red-50 text-red-600'
                          : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                      role="menuitem"
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Welcome Section */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">
                {session 
                  ? `Welcome, ${session.user.display_name || session.user.username || 'User'}`
                  : 'Welcome!'
                }
              </p>
            </div>

            {/* All Menu Items in one container */}
            <div className="py-2">
              {/* Profile Nav Items (Overview, My Profile) - for logged-in users */}
              {profileNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                      item.active
                        ? 'bg-red-50 text-red-600'
                        : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                    role="menuitem"
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
              
              {/* Rest of Menu Items */}
              {(() => {
                let items = menuItems
                  // Skip welcome-user for logged-in users (shown at top now)
                  .filter(item => !(session && item.id === 'welcome-user'))
                  // Skip welcome-guest for logged-out users
                  .filter(item => !(!session && item.id === 'welcome-guest'))
                  // Skip signup for signed-out users (now at top)
                  .filter(item => !(!session && item.id === 'signup'));
                
                if (!session) {
                  // For signed-out: About, Help, Privacy, Cookies only (Sign In and List Your Studio are at top)
                  const about = items.find(i => i.id === 'about');
                  const help = items.find(i => i.id === 'help');
                  const privacy = items.find(i => i.id === 'privacy');
                  const cookies = items.find(i => i.id === 'cookies');
                  items = [about, help, privacy, cookies].filter(Boolean) as typeof items;
                }
                
                return items;
              })()
              .map((item, index, filteredItems) => {
                const Icon = item.icon;
                const isActive = item.href === pathname;
                const isAdminItem = item.section === 'admin';
                const isLogoutItem = item.id === 'logout';
                const isVisibilityToggle = item.type === 'visibility-toggle';
                
                // Determine if we need a divider before this item
                const showDividerBefore = (
                  // Divider before About Us (after Settings) - signed in
                  (session && item.id === 'about') ||
                  // Divider before Admin section (after Cookie Settings) - signed in
                  (session && isAdminItem && index > 0 && filteredItems[index - 1]?.section !== 'admin') ||
                  // Divider before Logout - signed in
                  (session && isLogoutItem)
                );
                const needsSeparatorBefore = showDividerBefore;

                return (
                  <div key={item.id}>
                    {needsSeparatorBefore && (
                      <div className="my-2 mx-4 border-t border-gray-100" role="separator" />
                    )}
                    
                    {isVisibilityToggle ? (
                      <button
                        type="button"
                        onClick={handleToggleVisibility}
                        disabled={togglingVisibility || loadingVisibility}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                          togglingVisibility || loadingVisibility
                            ? 'opacity-50 cursor-not-allowed'
                            : isVisible
                            ? 'text-green-700 hover:bg-green-50'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        role="menuitem"
                      >
                        {togglingVisibility || loadingVisibility ? (
                          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                        ) : Icon ? (
                          <Icon className={`w-5 h-5 ${isVisible ? 'text-green-600' : 'text-gray-500'}`} aria-hidden="true" />
                        ) : null}
                        <span>{loadingVisibility ? 'Checking...' : isVisible ? 'Hide Profile' : 'Make Profile Visible'}</span>
                      </button>
                    ) : item.type === 'action' && item.action ? (
                      <button
                        type="button"
                        onClick={() => handleAction(item.action!)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                          isAdminItem || isLogoutItem
                            ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }`}
                        role="menuitem"
                      >
                        {Icon && <Icon className="w-5 h-5" aria-hidden="true" />}
                        <span>{item.label}</span>
                      </button>
                    ) : item.href ? (
                      <button
                        type="button"
                        onClick={() => handleNavigation(item.href!)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-red-50 text-red-600'
                            : isAdminItem
                            ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }`}
                        role="menuitem"
                      >
                        {Icon && <Icon className="w-5 h-5" aria-hidden="true" />}
                        <span>{item.label}</span>
                      </button>
                    ) : (
                      // Non-clickable items (like welcome messages)
                      <div className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {Icon && <Icon className="w-5 h-5 inline-block mr-3" aria-hidden="true" />}
                        <span>{item.label}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
