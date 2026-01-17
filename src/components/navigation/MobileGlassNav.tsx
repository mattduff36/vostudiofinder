/**
 * MobileGlassNav - Production Mobile Bottom Navigation
 * 
 * Uses AdaptiveGlassBubblesNav for consistent bubble styling with demo.
 * NO backdrop-filter on container - only on individual bubbles.
 */
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, UserPlus, User, X, UserCircle, HelpCircle, LogOut, Shield, Pencil } from 'lucide-react';
import { Session } from 'next-auth';
import { AdaptiveGlassBubblesNav, DEFAULT_CONFIG, type NavItem } from './AdaptiveGlassBubblesNav';
import { AdaptiveGlassMenu } from './AdaptiveGlassMenu';

interface MobileGlassNavProps {
  session: Session | null;
}

export function MobileGlassNav({ session }: MobileGlassNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkBackground, setIsDarkBackground] = useState(false);
  const [tappedButton, setTappedButton] = useState<string | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const signinPath = '/auth/signin';
  const signupPath = '/auth/signup';
  const aboutPath = '/about';
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
  // Keep hidden on the demo page to avoid double-nav rendering.
  if (pathname === '/glass-nav-test') {
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
      href: signupPath,
      active: pathname === signupPath,
    }
  );

  // Add menu button
  navItems.push({
    id: 'menu',
    label: isMenuOpen ? 'Close' : 'Menu',
    icon: isMenuOpen ? X : Menu,
    onClick: () => {
      handleTap('menu');
      setIsMenuOpen(!isMenuOpen);
    },
  });

  const handleTap = (buttonId: string) => {
    setTappedButton(buttonId);
    setTimeout(() => setTappedButton(null), 300);
  };

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
            onBackgroundChange={setIsDarkBackground}
            tappedButtonId={tappedButton}
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
            onBackgroundChange={setIsDarkBackground}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 space-y-1">
              {session ? (
                <>
                  {isAdminUser && showAdminEditButton && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        window.dispatchEvent(new Event('profileEditClick'));
                      }}
                      className="menu-item w-full"
                    >
                      <Pencil className="w-5 h-5" />
                      <span>EDIT</span>
                    </button>
                  )}
                  {isAdminUser && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        router.push('/admin/studios');
                      }}
                      className="menu-item w-full"
                    >
                      <Shield className="w-5 h-5" />
                      <span>ADMIN</span>
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push(`/${session.user.username}`);
                    }}
                    className="menu-item w-full"
                  >
                    <UserCircle className="w-5 h-5" />
                    <span>My Profile</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push(aboutPath);
                    }}
                    className="menu-item w-full"
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>About Us</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push('/auth/signout');
                    }}
                    className="menu-item w-full"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  {pathname !== signinPath && (
                    <button 
                      onClick={() => {
                        setIsMenuOpen(false);
                        router.push(signinPath);
                      }}
                      className="menu-item w-full"
                    >
                      <User className="w-5 h-5" />
                      <span>Sign In</span>
                    </button>
                  )}
                  {pathname !== signupPath && (
                    <button 
                      onClick={() => {
                        setIsMenuOpen(false);
                        router.push(signupPath);
                      }}
                      className="menu-item w-full"
                    >
                      <UserPlus className="w-5 h-5" />
                      <span>Sign Up</span>
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push(aboutPath);
                    }}
                    className="menu-item w-full"
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>About Us</span>
                  </button>
                </>
              )}
            </div>
          </AdaptiveGlassMenu>

          <style jsx global>{`
            .menu-item {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 12px 16px;
              border-radius: 12px;
              transition: all 0.2s ease;
              font-size: 15px;
              font-weight: 500;
              color: inherit;
              text-align: left;
              cursor: pointer;
              background: none;
              border: none;
            }

            .menu-item:hover,
            .menu-item:active {
              background: ${isDarkBackground ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
              transform: translateX(4px);
            }
          `}</style>
        </div>
      )}
    </>
  );
}
