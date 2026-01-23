'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Menu, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getDesktopBurgerMenuItems } from '@/config/navigation';

interface DashboardDropdownMenuProps {
  username: string;
  isScrolled: boolean;
  isHomePage: boolean;
  includeSiteLinks?: boolean;
  session?: any;
  isAdminUser?: boolean;
  showEditButton?: boolean;
}

export function DashboardDropdownMenu({ 
  username, 
  isScrolled, 
  isHomePage,
  includeSiteLinks = false,
  session,
  isAdminUser = false,
  showEditButton = false,
}: DashboardDropdownMenuProps) {
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024;
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [loadingVisibility, setLoadingVisibility] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Fetch profile visibility immediately on mount (single source of truth from database)
  useEffect(() => {
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
  }, []);

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


  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
      // Delete the consent cookie to show the banner again
      document.cookie = 'vsf_cookie_consent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.location.reload();
    }
  };

  // Get menu items from config
  const menuItems = getDesktopBurgerMenuItems({
    session: session || { user: { username } },
    isAdminUser,
    showEditButton,
    username,
    includeSiteLinks,
  });

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <Button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
          }}
          variant={isScrolled || !isHomePage ? 'outline' : 'outline'}
          className={`${
            isScrolled || !isHomePage 
              ? 'border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white' 
              : 'text-white border-white hover:bg-white hover:text-primary-800'
          } flex items-center justify-center p-2 aspect-square w-10 h-10`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="Dashboard menu"
        >
          <Menu 
            className="w-5 h-5"
            aria-hidden="true"
          />
        </Button>

        {isOpen && (
          <div 
            className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[110]"
            role="menu"
            aria-orientation="vertical"
          >
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.href === pathname;
            const needsSeparatorBefore = 
              (index > 0 && item.section !== menuItems[index - 1]?.section);

            return (
              <div key={item.id}>
                {needsSeparatorBefore && (
                  <div className="my-2 border-t border-gray-200" role="separator" />
                )}
                
                {item.type === 'visibility-toggle' ? (
                  <button
                    type="button"
                    onClick={handleToggleVisibility}
                    disabled={togglingVisibility || loadingVisibility}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      togglingVisibility || loadingVisibility
                        ? 'opacity-50 cursor-not-allowed'
                        : isVisible
                        ? 'text-green-700 hover:bg-green-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    role="menuitem"
                  >
                    {togglingVisibility || loadingVisibility ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : isVisible ? (
                      <Icon className="w-4 h-4 text-green-600" aria-hidden="true" />
                    ) : (
                      <Icon className="w-4 h-4 text-gray-600" aria-hidden="true" />
                    )}
                    {loadingVisibility ? 'Checking visibility...' : isVisible ? 'Hide Profile' : 'Make Profile Visible'}
                  </button>
                ) : item.type === 'action' ? (
                  <button
                    type="button"
                    onClick={() => handleAction(item.action!)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors text-gray-700 hover:bg-gray-50"
                    role="menuitem"
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {item.label}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleNavigation(item.href!)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      isActive
                        ? 'bg-red-50 text-red-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    role="menuitem"
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {item.label}
                  </button>
                )}
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Backdrop with blur - Outside relative container to cover entire page */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[99] bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
