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
import { Home, Search, LayoutDashboard, Menu, User, X } from 'lucide-react';
import { Session } from 'next-auth';
import { AdaptiveGlassBubblesNav, DEFAULT_CONFIG, type NavItem } from './AdaptiveGlassBubblesNav';
import { AdaptiveGlassMenu } from './AdaptiveGlassMenu';
import { getMobileMenuItems, BOTTOM_NAV_BUTTON_IDS } from '@/config/navigation';
import { useScrollVisibility } from '@/hooks/useScrollVisibility';
import { useLoading } from '@/providers/LoadingProvider';

interface MobileGlassNavProps {
  session: Session | null;
}

export function MobileGlassNav({ session }: MobileGlassNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [showAdminEditButton, setShowAdminEditButton] = useState(false);
  const { isInitialLoad } = useLoading();
  
  // Two-phase scroll visibility: position at 150ms (invisible), show at 500ms
  const { isPositioned, isVisible: isScrollVisible } = useScrollVisibility({ 
    showDelay: 500,
    positionDelay: 150 
  });

  // Close menu when scrolling starts (buttons hide)
  useEffect(() => {
    if (!isScrollVisible && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isScrollVisible, isMenuOpen]);

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

  // Toggle class on html element to conditionally remove main bottom padding when nav is hidden
  // This prevents the white gap that appears on iOS Safari when the toolbar and nav both hide
  useEffect(() => {
    const shouldHidePadding = !isScrollVisible && !isMenuOpen && !isMapFullscreen;
    
    if (shouldHidePadding) {
      document.documentElement.classList.add('vsf-mobile-nav-hidden');
    } else {
      document.documentElement.classList.remove('vsf-mobile-nav-hidden');
    }
    
    // Cleanup on unmount
    return () => {
      document.documentElement.classList.remove('vsf-mobile-nav-hidden');
    };
  }, [isScrollVisible, isMenuOpen, isMapFullscreen]);

  // Hide on specific pages
  // Hide on payment success page to maintain focused onboarding flow.
  if (pathname === '/auth/membership/success') {
    return null;
  }

  // Build navigation items with stable ids for reveal animation
  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      href: '/',
      active: pathname === '/',
    },
    {
      id: 'studios',
      label: 'Browse Studios',
      icon: Search,
      href: '/studios',
      active: pathname === '/studios',
      showLabel: !session, // Show text label when logged out
    },
  ];

  if (session) {
    const username = session.user.username;
    navItems.push({
      id: 'myProfile',
      label: 'Profile',
      icon: User,
      href: `/${username}`,
      active: pathname === `/${username}`,
    });
    navItems.push({
      id: 'overview',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      active: pathname.startsWith('/dashboard'),
    });
  }

  // Add menu button (always last, always visible)
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
    } else if (action === 'resetCookies') {
      // Delete the consent cookie to show the banner again
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
    showEditButton: showAdminEditButton,
    username: session?.user?.username,
    pathname,
    bottomNavIds,
  });

  // Hide during initial page load for graceful loading
  if (isInitialLoad) {
    return null;
  }

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
          opacity: 1,
          animation: 'fadeIn 0.3s ease-in',
        }}
      >
        <div className="mx-auto max-w-lg mb-[84px]">
          <AdaptiveGlassBubblesNav
            items={navItems}
            config={DEFAULT_CONFIG}
            debugSensors={false}
            isPositioned={isPositioned}
            isVisible={isScrollVisible}
            revealExpanded={session ? isMenuOpen : undefined}
            revealMenuId="menu"
            revealStaggerMs={60}
          />
        </div>
      </nav>

      {/* Expanding Menu with Backdrop Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-[200] md:hidden pointer-events-auto bg-black/30"
          onClick={() => setIsMenuOpen(false)}
          style={{ touchAction: 'none' }}
        >
          <AdaptiveGlassMenu
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+168px)] right-4 w-64 max-h-[70vh] overflow-y-auto pointer-events-auto"
            config={DEFAULT_CONFIG}
            debugSensors={false}
            isVisible={isScrollVisible}
            onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div className="p-2 space-y-1">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isAdminItem = item.section === 'admin';
                const isWelcomeItem = item.id === 'welcome-guest' || item.id === 'welcome-user';
                const isLogoutItem = item.id === 'logout';
                const isSignupItem = item.id === 'signup'; // "List Your Studio" in red
                
                // Determine if we need a divider before this item
                const showDividerBefore = (
                  // Divider before Edit Profile (after username) - signed in
                  (session && index === 1) ||
                  // Divider before About Us (after Settings) - signed in
                  (session && index === 4) ||
                  // Divider before Admin section (after Cookie Settings) - signed in
                  (session && isAdminItem && index > 0 && menuItems[index - 1]?.section !== 'admin') ||
                  // Divider before Logout - signed in
                  (session && isLogoutItem) ||
                  // Divider before About Us (after Welcome) - signed out
                  (!session && index === 1) ||
                  // Divider before Help Centre (after List Your Studio) - signed out
                  (!session && index === 3)
                );

                return (
                  <div key={item.id}>
                    {showDividerBefore && (
                      <div className="my-2 border-t border-black/10 dark:border-white/10" />
                    )}
                    <button
                      onClick={() => {
                        // Don't navigate for welcome messages
                        if (isWelcomeItem) {
                          return;
                        }
                        
                        if (item.type === 'link' && item.href) {
                          setIsMenuOpen(false);
                          router.push(item.href);
                        } else if (item.type === 'action' && item.action) {
                          handleAction(item.action);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-[15px] font-medium transition-all ${
                        isAdminItem || isLogoutItem || isSignupItem
                          ? 'text-red-600 hover:bg-red-50 active:scale-95 active:bg-red-100'
                          : isWelcomeItem
                          ? 'font-semibold text-inherit hover:bg-black/5'
                          : 'text-inherit hover:bg-black/5 active:scale-95 active:bg-black/10'
                      }`}
                    >
                      {Icon && <Icon className="w-5 h-5" />}
                      <span className={isWelcomeItem ? 'flex-1' : ''}>{item.label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </AdaptiveGlassMenu>
        </div>
      )}

    </>
  );
}
