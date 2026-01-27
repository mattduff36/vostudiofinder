/**
 * DesktopBurgerMenu - Desktop burger menu using mobile styling
 * 
 * Uses the same clean, dropdown style as the mobile menu.
 * Shows menu items from Overview downwards, excluding About Us (which is in the desktop nav bar).
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, User, Loader2 } from 'lucide-react';
import { Session } from 'next-auth';
import { getMobileMenuItems, BOTTOM_NAV_BUTTON_IDS } from '@/config/navigation';

interface DesktopBurgerMenuProps {
  session: Session | null;
  isAdminUser: boolean;
  showEditButton: boolean;
  isOpen: boolean;
  onClose: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

export function DesktopBurgerMenu({ 
  session, 
  isAdminUser, 
  showEditButton,
  isOpen,
  onClose,
  menuRef
}: DesktopBurgerMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [loadingVisibility, setLoadingVisibility] = useState(true);
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
    onClose();
    router.push(path);
  };

  const handleAction = (action: string) => {
    onClose();
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

  // Profile nav items (Overview, My Profile)
  const profileNavItems = session ? [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard', active: pathname.startsWith('/dashboard') },
    { id: 'myProfile', label: 'My Profile', icon: User, href: `/${session.user.username}`, active: pathname === `/${session.user.username}` },
  ] : [];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-[99]"
        onClick={onClose}
      />
      
      {/* Menu Panel - Positioned below navbar */}
      <div 
        ref={menuRef}
        className="absolute top-[72px] right-6 z-[110] w-56 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[80vh] overflow-y-auto"
        role="menu"
        aria-orientation="vertical"
      >
        {/* All Menu Items in one container */}
        <div className="py-2">
          {/* Profile Nav Items (Overview, My Profile) */}
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
          
          {/* Rest of Menu Items - Exclude About Us */}
          {(() => {
            let items = menuItems
              // Skip welcome-user (shown at top now)
              .filter(item => !(session && item.id === 'welcome-user'))
              // Skip About Us (already in desktop nav bar)
              .filter(item => item.id !== 'about');
            
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
              // Divider before Help Center (after Settings)
              (session && item.id === 'help') ||
              // Divider before Admin section
              (session && isAdminItem && index > 0 && filteredItems[index - 1]?.section !== 'admin') ||
              // Divider before Logout
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
                ) : isLogoutItem ? (
                  // Logout as centered button with outline styling
                  <div className="px-4 py-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleAction(item.action!)}
                      className="w-[200px] px-4 py-2.5 rounded-lg border-2 border-[#d42027] text-[#d42027] bg-transparent hover:bg-red-50 active:bg-red-100 text-sm font-medium transition-all"
                      role="menuitem"
                    >
                      {item.label}
                    </button>
                  </div>
                ) : item.type === 'action' && item.action ? (
                  <button
                    type="button"
                    onClick={() => handleAction(item.action!)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                      isAdminItem
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
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
