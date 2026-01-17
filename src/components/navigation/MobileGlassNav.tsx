/**
 * MobileGlassNav - Production Mobile Bottom Navigation
 * 
 * Uses AdaptiveGlassBubblesNav for consistent bubble styling with demo.
 * NO backdrop-filter on container - only on individual bubbles.
 */
'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, UserPlus, User, X, UserCircle, HelpCircle, LogOut } from 'lucide-react';
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
  const signupPath = '/auth/signup';

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
        className="fixed bottom-0 left-0 right-0 md:hidden z-50"
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
          <AdaptiveGlassMenu
            className="absolute bottom-20 right-4 w-64"
            config={DEFAULT_CONFIG}
            debugSensors={false}
            onBackgroundChange={setIsDarkBackground}
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
                  {pathname !== '/auth/signin' && (
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
                  )}
                  {pathname !== '/auth/signup' && (
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
                  )}
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
