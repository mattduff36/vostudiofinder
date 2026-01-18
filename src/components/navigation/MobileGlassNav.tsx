/**
 * MobileGlassNav - Production Mobile Bottom Navigation
 * 
 * Uses AdaptiveGlassBubblesNav for consistent bubble styling with demo.
 * NO backdrop-filter on container - only on individual bubbles.
 */
'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Home, Search, LayoutDashboard, Menu, UserPlus, User, X } from 'lucide-react';
import { Session } from 'next-auth';
import { AdaptiveGlassBubblesNav, DEFAULT_CONFIG, type NavItem } from './AdaptiveGlassBubblesNav';
import { AdaptiveGlassMenu } from './AdaptiveGlassMenu';
import { getMobileMenuItems, BOTTOM_NAV_BUTTON_IDS } from '@/config/navigation';

interface MobileGlassNavProps {
  session: Session | null;
}

export function MobileGlassNav({ session }: MobileGlassNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [showAdminEditButton, setShowAdminEditButton] = useState(false);

  const isAdminUser =
    session?.user?.email === 'admin@mpdee.co.uk' ||
    session?.user?.username === 'VoiceoverGuy' ||
    session?.user?.role === 'ADMIN';

  // Monitor fullscreen map state (iOS/Android map fullscreen)
  useEffect(() => {
    const checkFullscreen = () => {
      setIsMapFullscreen(document.documentElement.hasAttribute('data-map-fullscreen'));
    };
    checkFullscreen();
    const observer = new MutationObserver(checkFullscreen);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-map-fullscreen']
    });
    return () => observer.disconnect();
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Mirror the desktop "ADMIN / EDIT" buttons behavior for mobile.
  useEffect(() => {
    if (!isAdminUser) return;

    const handleEditHandlerReady = () => setShowAdminEditButton(true);
    const handleEditHandlerUnmount = () => setShowAdminEditButton(false);

    window.addEventListener('profileEditHandlerReady', handleEditHandlerReady);
    window.addEventListener('profileEditHandlerUnmount', handleEditHandlerUnmount);

    return () => {
      window.removeEventListener('profileEditHandlerReady', handleEditHandlerReady);
      window.removeEventListener('profileEditHandlerUnmount', handleEditHandlerUnmount);
    };
  }, [isAdminUser]);

  // Hide on specific pages
  // Hide on payment success page to maintain focused onboarding flow.
  if (pathname === '/auth/membership/success') {
    return null;
  }

  // Build navigation items
  const navItems: NavItem[] = [
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
  ];

  if (session) {
    const username = session.user.username;
    navItems.push({
      label: 'Profile',
      icon: User,
      href: `/${username}`,
      active: pathname === `/${username}`,
    });
  }

  navItems.push(
    session ? {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      active: pathname.startsWith('/dashboard'),
    } : {
      label: 'List Studio',
      icon: UserPlus,
      href: '/auth/signup',
      active: pathname === '/auth/signup',
    }
  );

  // Add menu button
  navItems.push({
    id: 'menu',
    label: isMenuOpen ? 'Close' : 'Menu',
    icon: isMenuOpen ? X : Menu,
    onClick: () => setIsMenuOpen(!isMenuOpen),
  });

  const handleAction = (action: string) => {
    setIsMenuOpen(false);
    if (action === 'logout') {
      signOut({ callbackUrl: '/' });
    } else if (action === 'profileEditClick') {
      window.dispatchEvent(new Event('profileEditClick'));
    }
  };

  // Get menu items from config
  const bottomNavIds = session 
    ? BOTTOM_NAV_BUTTON_IDS.SIGNED_IN 
    : BOTTOM_NAV_BUTTON_IDS.SIGNED_OUT;

  const menuItems = getMobileMenuItems({
    session,
    isAdminUser,
    showEditButton: showAdminEditButton,
    username: session?.user?.username,
    pathname,
    bottomNavIds,
  });

  return (
    <>
      <nav
        className={`fixed bottom-0 left-0 right-0 md:hidden z-50 ${
          isMapFullscreen ? 'hidden' : ''
        } [.admin-modal-open_&]:hidden [.image-modal-open_&]:hidden`}
        role="navigation"
        aria-label="Mobile navigation"
        style={{
          padding: '0 max(env(safe-area-inset-left), 1rem) env(safe-area-inset-bottom) max(env(safe-area-inset-right), 1rem)',
        }}
      >
        <div className="mx-auto max-w-lg mb-4">
          <AdaptiveGlassBubblesNav
            items={navItems}
            config={DEFAULT_CONFIG}
            debugSensors={false}
          />
        </div>
      </nav>

      {/* Expanding Menu */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-[200] md:hidden pointer-events-auto"
          onClick={() => setIsMenuOpen(false)}
          style={{ touchAction: 'none' }}
        >
          <AdaptiveGlassMenu
            className="absolute bottom-20 right-4 w-64 pointer-events-auto"
            config={DEFAULT_CONFIG}
            debugSensors={false}
            onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div className="p-2 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isAdminItem = item.section === 'admin';

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.type === 'link' && item.href) {
                        setIsMenuOpen(false);
                        router.push(item.href);
                      } else if (item.type === 'action' && item.action) {
                        handleAction(item.action);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-[15px] font-medium transition-colors ${
                      isAdminItem
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-inherit hover:bg-black/5'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </AdaptiveGlassMenu>
        </div>
      )}
    </>
  );
}
