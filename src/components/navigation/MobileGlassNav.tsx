/**
 * MobileGlassNav - Production Mobile Bottom Navigation with Glass Effect
 * 
 * Features:
 * - Adaptive glass effect that changes based on background
 * - Tap animation on mobile (plays hover effect once when clicked)
 * - Auto-hide on scroll down, show on scroll up
 * - Expandable menu with glass styling
 * - Session-aware navigation items
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, Search, LayoutDashboard, Menu, UserPlus, User, X, UserCircle, Settings, HelpCircle, LogOut } from 'lucide-react';
import { Session } from 'next-auth';
import { useScrollDirection } from '@/hooks/useScrollDirection';

interface MobileGlassNavProps {
  session: Session | null;
}

const DEFAULT_CONFIG = {
  blur: 5,
  saturation: 100,
  brightness: 1.15,
  contrast: 1.05,
  backgroundOpacity: 0.05,
  borderWidth: 1,
  circleSize: 56,
  darkBrightness: 1.15,
  lightBrightness: 0.95,
  luminanceThreshold: 0.4,
};

export function MobileGlassNav({ session }: MobileGlassNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 5 });
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkBackground, setIsDarkBackground] = useState(false);
  const [tappedButton, setTappedButton] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

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

  // Background detection for adaptive glass
  useEffect(() => {
    if (!navRef.current) return;

    const detectBackground = () => {
      const buttons = document.querySelectorAll('.mobile-glass-button');
      if (buttons.length === 0) return;

      let totalLuminance = 0;
      let sampleCount = 0;

      buttons.forEach((button) => {
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Sample 4 points around each button
        const offsets = [
          { x: 0, y: -1 }, // top
          { x: rect.width / 2 - 1, y: 0 }, // right
          { x: 0, y: rect.height + 1 }, // bottom
          { x: -rect.width / 2 + 1, y: 0 }, // left
        ];

        offsets.forEach(offset => {
          const el = document.elementFromPoint(
            centerX + offset.x,
            centerY + offset.y
          );

          if (el && el !== button && !button.contains(el)) {
            // Walk up the DOM to find visible background
            let current: HTMLElement | null = el as HTMLElement;
            while (current && current !== document.body) {
              const styles = window.getComputedStyle(current);
              const bgColor = styles.backgroundColor;
              
              if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                const rgba = bgColor.match(/\d+\.?\d*/g);
                if (rgba && rgba.length >= 4 && parseFloat(rgba[3]) > 0.1) {
                  const r = parseInt(rgba[0]);
                  const g = parseInt(rgba[1]);
                  const b = parseInt(rgba[2]);
                  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                  totalLuminance += luminance;
                  sampleCount++;
                  break;
                }
              }
              current = current.parentElement;
            }
          }
        });
      });

      if (sampleCount > 0) {
        const avgLuminance = totalLuminance / sampleCount;
        setIsDarkBackground(avgLuminance < DEFAULT_CONFIG.luminanceThreshold);
      }
    };

    detectBackground();
    const interval = setInterval(detectBackground, 2000);
    return () => clearInterval(interval);
  }, []);

  // Hide on specific pages
  if (pathname === '/auth/membership/success' || pathname === '/glass-nav-test') {
    return null;
  }

  // Build navigation items
  const navItems = [
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

  const handleTap = (buttonId: string) => {
    setTappedButton(buttonId);
    setTimeout(() => setTappedButton(null), 300);
  };

  const config = DEFAULT_CONFIG;
  const glassStyles = {
    backdropFilter: `blur(${config.blur}px) saturate(${config.saturation}%) brightness(${isDarkBackground ? config.darkBrightness : config.lightBrightness}) contrast(${config.contrast})`,
    WebkitBackdropFilter: `blur(${config.blur}px) saturate(${config.saturation}%) brightness(${isDarkBackground ? config.darkBrightness : config.lightBrightness}) contrast(${config.contrast})`,
  };

  return (
    <>
      <nav
        ref={navRef}
        className={`fixed bottom-0 left-0 right-0 md:hidden z-50 transition-transform safe-area-bottom [.admin-modal-open_&]:hidden [.image-modal-open_&]:hidden ${
          scrollDirection === 'down' && !isAtTop ? 'translate-y-full duration-0' : 'translate-y-0 duration-300'
        } ${isMapFullscreen ? 'hidden' : ''}`}
        role="navigation"
        aria-label="Mobile navigation"
        style={glassStyles}
      >
        <div className="flex items-center justify-around px-4 py-3 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const buttonId = item.href;
            const isTapped = tappedButton === buttonId;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleTap(buttonId)}
                className="mobile-glass-button group flex-1 flex items-center justify-center touch-manipulation"
                aria-label={item.label}
                aria-current={item.active ? 'page' : undefined}
              >
                <div 
                  className={`glass-circle ${item.active ? 'active' : ''} ${isDarkBackground ? 'dark-bg' : 'light-bg'} ${isTapped ? 'tapped' : ''}`}
                  style={{
                    width: `${config.circleSize}px`,
                    height: `${config.circleSize}px`,
                    color: isDarkBackground ? '#ffffff' : '#000000',
                    borderColor: isDarkBackground ? '#ffffff' : '#000000',
                  }}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </Link>
            );
          })}

          {/* Menu button */}
          <button
            onClick={() => {
              handleTap('menu');
              setIsMenuOpen(!isMenuOpen);
            }}
            className="mobile-glass-button group flex-1 flex items-center justify-center touch-manipulation"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            <div 
              className={`glass-circle ${isDarkBackground ? 'dark-bg' : 'light-bg'} ${tappedButton === 'menu' ? 'tapped' : ''}`}
              style={{
                width: `${config.circleSize}px`,
                height: `${config.circleSize}px`,
                color: isDarkBackground ? '#ffffff' : '#000000',
                borderColor: isDarkBackground ? '#ffffff' : '#000000',
              }}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </div>
          </button>
        </div>

        <style jsx global>{`
          .glass-circle {
            display: flex;
            align-items: center;
            justify-center;
            border-radius: 50%;
            background: rgba(128, 128, 128, ${config.backgroundOpacity});
            border: ${config.borderWidth}px solid currentColor;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
          }

          .glass-circle svg {
            stroke: currentColor;
            transition: stroke 0.3s ease;
          }

          /* Tap animation - plays hover effect once */
          .glass-circle.tapped {
            transform: translateY(-4px) scale(1.08);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          }

          .glass-circle.active {
            background: rgba(212, 32, 39, 0.15);
            border-color: #d42027 !important;
          }

          .glass-circle.active svg {
            stroke: #d42027 !important;
          }

          /* Dark background styles */
          .glass-circle.dark-bg {
            background: rgba(255, 255, 255, ${config.backgroundOpacity * 2.4});
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }

          /* Light background styles */
          .glass-circle.light-bg {
            background: rgba(0, 0, 0, ${config.backgroundOpacity * 1.6});
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          }
        `}</style>
      </nav>

      {/* Expanding Menu */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className={`absolute bottom-20 right-4 w-64 glass-menu ${isDarkBackground ? 'dark-bg' : 'light-bg'}`}
            style={glassStyles}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 space-y-1">
              {session ? (
                <>
                  <Link 
                    href={`/${session.user.username}`}
                    className="menu-item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <UserCircle className="w-5 h-5" />
                    <span>My Profile</span>
                  </Link>
                  <Link 
                    href="/dashboard/settings"
                    className="menu-item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </Link>
                  <Link 
                    href="/about"
                    className="menu-item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>About & Help</span>
                  </Link>
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
                  <Link 
                    href="/auth/signin"
                    className="menu-item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    <span>Sign In</span>
                  </Link>
                  <Link 
                    href="/auth/signup"
                    className="menu-item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Sign Up</span>
                  </Link>
                  <Link 
                    href="/about"
                    className="menu-item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>About & Help</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          <style jsx>{`
            .glass-menu {
              border-radius: 16px;
              background: rgba(128, 128, 128, ${config.backgroundOpacity * 3});
              border: ${config.borderWidth}px solid ${isDarkBackground ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'};
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
              animation: slideUp 0.2s ease-out;
            }

            .glass-menu.dark-bg {
              background: rgba(255, 255, 255, ${config.backgroundOpacity * 3.5});
              color: #ffffff;
            }

            .glass-menu.light-bg {
              background: rgba(0, 0, 0, ${config.backgroundOpacity * 2.5});
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
