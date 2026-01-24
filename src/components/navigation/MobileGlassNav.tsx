/**
 * MobileGlassNav - Production Mobile Bottom Navigation
 * 
 * Uses AdaptiveGlassBubblesNav for consistent bubble styling with demo.
 * NO backdrop-filter on container - only on individual bubbles.
 */
'use client';

import { useEffect, useState, useRef, useCallback, type MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Home, Search, LayoutDashboard, Menu, User, X } from 'lucide-react';
import { Session } from 'next-auth';
import { AdaptiveGlassBubblesNav, DEFAULT_CONFIG, type NavItem } from './AdaptiveGlassBubblesNav';
import { AdaptiveGlassMenu } from './AdaptiveGlassMenu';
import { getMobileMenuItems, BOTTOM_NAV_BUTTON_IDS } from '@/config/navigation';
import { useScrollVisibility } from '@/hooks/useScrollVisibility';
import { useLoading } from '@/providers/LoadingProvider';

// Smaller button config for mobile nav
const MOBILE_NAV_CONFIG = {
  ...DEFAULT_CONFIG,
  circleSize: 48,      // Smaller buttons (was 56)
  pillPaddingX: 10,    // Tighter horizontal padding (was 12)
  pillPaddingY: 5,     // Slightly tighter vertical (was 6)
};

// Menu hint constants
const MENU_ACTIVITY_KEY = 'vsf_menu_last_active';
const INACTIVITY_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const MORPH_ANIMATION_MS = 600; // Text fade (200ms) + width collapse (400ms)
const PAUSE_BEFORE_MENU_MS = 150; // Pause before menu opens
const TOTAL_MORPH_SEQUENCE_MS = MORPH_ANIMATION_MS + PAUSE_BEFORE_MENU_MS;

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
  
  // Menu hint state - shows "Open Menu" text for new/returning users
  const [showMenuHint, setShowMenuHint] = useState(false);
  const [isMorphing, setIsMorphing] = useState(false);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if menu has been opened at least once (to avoid hiding buttons on initial load)
  const [hasMenuBeenOpened, setHasMenuBeenOpened] = useState(false);
  
  // Two-phase scroll visibility: position at 150ms (invisible), show at 500ms
  const { isPositioned, isVisible: isScrollVisible } = useScrollVisibility({ 
    showDelay: 500,
    positionDelay: 150 
  });

  // Check if menu hint should be shown (first visit or 2h+ inactive)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const lastActive = localStorage.getItem(MENU_ACTIVITY_KEY);
    const now = Date.now();
    
    if (!lastActive) {
      // First visit ever
      setShowMenuHint(true);
    } else {
      const elapsed = now - parseInt(lastActive, 10);
      if (elapsed >= INACTIVITY_THRESHOLD_MS) {
        // Been inactive for 2+ hours
        setShowMenuHint(true);
      }
    }
  }, []);

  // Update activity timestamp on any user interaction (debounced)
  const updateActivity = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // Debounce updates to avoid excessive writes
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    
    activityTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(MENU_ACTIVITY_KEY, Date.now().toString());
    }, 1000); // Update at most once per second
  }, []);

  // Listen for user activity to update timestamp
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const events = ['click', 'scroll', 'keydown', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [updateActivity]);

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
  // Signed-out: Both Home and Browse Studios show text labels (smaller buttons fit both)
  // Signed-in: All buttons are icon-only circles
  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      href: '/',
      active: pathname === '/',
      showLabel: !session, // Show text when signed out
    },
    {
      id: 'studios',
      label: 'Studios',
      icon: Search,
      href: '/studios',
      active: pathname === '/studios',
      showLabel: !session, // Show text when signed out
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

  // Handle menu button click with optional morph animation
  const handleMenuClick = () => {
    if (showMenuHint && !isMorphing) {
      // First click with hint showing - start morph animation sequence
      // Sequence: text fades (200ms) -> morph (400ms) -> pause (150ms) -> menu opens
      setIsMorphing(true);
      
      // After full sequence completes, hide hint and open menu
      setTimeout(() => {
        setIsMorphing(false);
        setShowMenuHint(false);
        // Update activity timestamp since they've now used the menu
        localStorage.setItem(MENU_ACTIVITY_KEY, Date.now().toString());
        setHasMenuBeenOpened(true);
        setIsMenuOpen(true);
      }, TOTAL_MORPH_SEQUENCE_MS);
    } else {
      // Normal toggle behavior
      if (!isMenuOpen) {
        setHasMenuBeenOpened(true);
      }
      setIsMenuOpen(!isMenuOpen);
    }
  };

  // Add menu button (always last, always visible)
  // Shows "Open Menu" hint for new/returning users
  // Keep label and showLabel during morphing so text can animate out
  navItems.push({
    id: 'menu',
    label: showMenuHint ? 'Open Menu' : (isMenuOpen ? 'Close' : 'Menu'),
    icon: isMenuOpen ? X : Menu,
    showLabel: showMenuHint || isMorphing, // Keep pill shape during morph
    isMorphing: isMorphing,
    onClick: handleMenuClick,
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
        className={`fixed bottom-0 left-0 right-0 md:hidden z-[250] ${
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
            config={MOBILE_NAV_CONFIG}
            debugSensors={false}
            isPositioned={isPositioned}
            isVisible={isScrollVisible}
            revealExpanded={session && hasMenuBeenOpened ? isMenuOpen : undefined}
            revealMenuId="menu"
            revealStaggerMs={60}
            revealBaseDelayMs={200}
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
