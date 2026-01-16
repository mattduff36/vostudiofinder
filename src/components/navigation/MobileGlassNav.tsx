/**
 * MobileGlassNav - Production Mobile Bottom Navigation
 * 
 * Uses AdaptiveGlassBubblesNav for consistent bubble styling with demo.
 * NO backdrop-filter on container - only on individual bubbles.
 */
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, UserPlus, User, X, UserCircle, Settings, HelpCircle, LogOut } from 'lucide-react';
import { Session } from 'next-auth';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { AdaptiveGlassBubblesNav, DEFAULT_CONFIG, type NavItem } from './AdaptiveGlassBubblesNav';

interface MobileGlassNavProps {
  session: Session | null;
}

export function MobileGlassNav({ session }: MobileGlassNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 5 });
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkBackground, setIsDarkBackground] = useState(false);
  const [tappedButton, setTappedButton] = useState<string | null>(null);

  // Monitor fullscreen state
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

  // Hide on specific pages
  if (pathname === '/auth/membership/success' || pathname === '/glass-nav-test') {
    return null;
  }

  // Build navigation items
  const signupPath = '/auth/signup';
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
        className={`fixed bottom-0 left-0 right-0 md:hidden z-50 transition-all duration-300 ${
          scrollDirection === 'down' && !isAtTop ? 'translate-y-full' : 'translate-y-0'
        } ${isMapFullscreen ? 'hidden' : ''} [.admin-modal-open_&]:hidden [.image-modal-open_&]:hidden`}
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
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className={`glass-menu absolute bottom-20 right-4 w-64 ${isDarkBackground ? 'dark-bg' : 'light-bg'}`}
            style={{
              backdropFilter: `blur(${DEFAULT_CONFIG.blur}px) saturate(${DEFAULT_CONFIG.saturation}%) brightness(${isDarkBackground ? DEFAULT_CONFIG.darkBrightness : DEFAULT_CONFIG.lightBrightness}) contrast(${DEFAULT_CONFIG.contrast})`,
              WebkitBackdropFilter: `blur(${DEFAULT_CONFIG.blur}px) saturate(${DEFAULT_CONFIG.saturation}%) brightness(${isDarkBackground ? DEFAULT_CONFIG.darkBrightness : DEFAULT_CONFIG.lightBrightness}) contrast(${DEFAULT_CONFIG.contrast})`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 space-y-1">
              {session ? (
                <>
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
                      router.push('/dashboard/settings');
                    }}
                    className="menu-item w-full"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push('/about');
                    }}
                    className="menu-item w-full"
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>About & Help</span>
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
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push('/auth/signin');
                    }}
                    className="menu-item w-full"
                  >
                    <User className="w-5 h-5" />
                    <span>Sign In</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push('/auth/signup');
                    }}
                    className="menu-item w-full"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Sign Up</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push('/about');
                    }}
                    className="menu-item w-full"
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>About & Help</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <style jsx global>{`
            .glass-menu {
              border-radius: 16px;
              background: rgba(128, 128, 128, ${DEFAULT_CONFIG.backgroundOpacity * 3});
              border: ${DEFAULT_CONFIG.borderWidth}px solid ${isDarkBackground ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'};
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
              animation: slideUp 0.2s ease-out;
            }

            .glass-menu.dark-bg {
              background: rgba(255, 255, 255, ${DEFAULT_CONFIG.backgroundOpacity * 3.5});
              color: #ffffff;
            }

            .glass-menu.light-bg {
              background: rgba(0, 0, 0, ${DEFAULT_CONFIG.backgroundOpacity * 2.5});
              color: #000000;
            }

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

            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
