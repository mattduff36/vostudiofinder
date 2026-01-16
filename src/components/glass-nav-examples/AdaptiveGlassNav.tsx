'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, User } from 'lucide-react';
import { Session } from 'next-auth';
import { LiquidGlass } from '@specy/liquid-glass-react';

interface AdaptiveGlassNavProps {
  mode: 'static' | 'auto-hide' | 'minimal';
  session: Session | null;
  onMenuClick: () => void;
}

export function AdaptiveGlassNav({ mode, session, onMenuClick }: AdaptiveGlassNavProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (mode !== 'auto-hide') {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, mode]);

  const navItems = [
    { label: 'Home', icon: Home, href: '/', active: pathname === '/' },
    { label: 'Studios', icon: Search, href: '/studios', active: pathname === '/studios' },
    { label: 'Profile', icon: User, href: `/${session?.user?.username || 'user'}`, active: false },
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', active: pathname === '/dashboard' },
  ];

  if (mode === 'minimal') {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="relative">
          {isExpanded && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-2 mb-3">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className="adaptive-minimal-item"
                      style={{
                        animation: `adaptiveFadeIn 0.4s ease-out ${index * 0.05}s both`,
                      }}
                    >
                      <Icon className={`w-5 h-5 ${item.active ? 'text-[#d42027]' : ''}`} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <button onClick={() => setIsExpanded(!isExpanded)} className="adaptive-fab">
            <Menu className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        <style jsx global>{`
          @keyframes adaptiveFadeIn {
            from {
              opacity: 0;
              transform: translateY(10px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .adaptive-minimal-item {
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: color-mix(in srgb, Canvas 50%, transparent);
            backdrop-filter: blur(20px) saturate(180%) brightness(1.1) contrast(0.9);
            -webkit-backdrop-filter: blur(20px) saturate(180%) brightness(1.1) contrast(0.9);
            border: 1px solid color-mix(in srgb, Canvas 20%, transparent);
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.12),
              0 2px 8px rgba(0, 0, 0, 0.08),
              inset 0 1px 2px color-mix(in srgb, Canvas 80%, transparent);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            color: CanvasText;
          }

          .adaptive-minimal-item:hover {
            transform: scale(1.1);
            background: color-mix(in srgb, Canvas 60%, transparent);
            box-shadow: 
              0 12px 48px rgba(0, 0, 0, 0.16),
              0 4px 12px rgba(0, 0, 0, 0.12),
              inset 0 1px 2px color-mix(in srgb, Canvas 90%, transparent);
          }

          .adaptive-fab {
            width: 68px;
            height: 68px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: color-mix(in srgb, Canvas 60%, transparent);
            backdrop-filter: blur(24px) saturate(180%) brightness(1.15) contrast(0.85);
            -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.15) contrast(0.85);
            border: 1.5px solid color-mix(in srgb, Canvas 30%, transparent);
            box-shadow: 
              0 12px 48px rgba(0, 0, 0, 0.15),
              0 4px 16px rgba(0, 0, 0, 0.1),
              inset 0 1px 2px color-mix(in srgb, Canvas 90%, transparent);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            color: CanvasText;
          }

          .adaptive-fab:hover {
            transform: scale(1.08);
            background: color-mix(in srgb, Canvas 70%, transparent);
            box-shadow: 
              0 16px 64px rgba(0, 0, 0, 0.2),
              0 6px 20px rgba(0, 0, 0, 0.12),
              inset 0 1px 2px color-mix(in srgb, Canvas 95%, transparent);
          }
        `}</style>
      </div>
    );
  }

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
      style={{
        padding: '0 max(env(safe-area-inset-left), 1rem) env(safe-area-inset-bottom) max(env(safe-area-inset-right), 1rem)',
      }}
    >
      <div className="mx-auto max-w-lg mb-4">
        <div className="adaptive-glass-nav">
          <div className="adaptive-nav-inner">
            <div className="flex items-center justify-around h-20 px-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center gap-2 flex-1 group"
                  >
                    <div className={`adaptive-icon-ring ${item.active ? 'active' : ''}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`adaptive-label ${item.active ? 'active' : ''}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}

              <button onClick={onMenuClick} className="flex flex-col items-center gap-2 flex-1 group">
                <div className="adaptive-icon-ring">
                  <Menu className="w-6 h-6" />
                </div>
                <span className="adaptive-label">Menu</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* Adaptive Glass Navigation - Changes based on background */
        .adaptive-glass-nav {
          /* Use color-mix to blend with canvas (adapts to light/dark) */
          background: color-mix(in srgb, Canvas 55%, transparent);
          
          /* Advanced backdrop filters that adapt */
          backdrop-filter: blur(24px) saturate(180%) brightness(1.1) contrast(0.9);
          -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.1) contrast(0.9);
          
          border-radius: 28px;
          border: 1.5px solid color-mix(in srgb, Canvas 25%, transparent);
          
          box-shadow: 
            0 16px 56px rgba(0, 0, 0, 0.12),
            0 6px 24px rgba(0, 0, 0, 0.08),
            inset 0 1px 2px color-mix(in srgb, Canvas 80%, transparent),
            inset 0 -1px 2px rgba(0, 0, 0, 0.03);
          
          position: relative;
          overflow: hidden;
        }

        /* Adaptive shine effect */
        .adaptive-glass-nav::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 50% 0%,
            color-mix(in srgb, Canvas 40%, transparent),
            transparent 70%
          );
          pointer-events: none;
        }

        .adaptive-nav-inner {
          background: color-mix(in srgb, Canvas 15%, transparent);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 10px 4px;
        }

        .adaptive-icon-ring {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 54px;
          border-radius: 50%;
          
          /* Adaptive background */
          background: color-mix(in srgb, Canvas 35%, transparent);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          
          /* Use CanvasText for automatic light/dark text */
          color: CanvasText;
          
          border: 1px solid color-mix(in srgb, Canvas 20%, transparent);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: inset 0 1px 2px color-mix(in srgb, Canvas 50%, transparent);
        }

        .group:hover .adaptive-icon-ring {
          transform: scale(1.1) translateY(-2px);
          background: color-mix(in srgb, Canvas 50%, transparent);
          box-shadow: 
            0 6px 20px rgba(0, 0, 0, 0.1),
            inset 0 1px 2px color-mix(in srgb, Canvas 70%, transparent);
        }

        .group:active .adaptive-icon-ring {
          transform: scale(0.95);
        }

        .adaptive-icon-ring.active {
          background: rgba(212, 32, 39, 0.15);
          color: #d42027;
          border-color: rgba(212, 32, 39, 0.25);
          box-shadow: 
            inset 0 2px 12px rgba(212, 32, 39, 0.15),
            0 0 0 1px rgba(212, 32, 39, 0.1),
            0 0 20px rgba(212, 32, 39, 0.1);
        }

        .adaptive-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          /* Automatic text color adaptation */
          color: CanvasText;
          opacity: 0.8;
          transition: all 0.3s ease;
        }

        .adaptive-label.active {
          color: #d42027;
          font-weight: 700;
          opacity: 1;
        }

        .group:hover .adaptive-label {
          opacity: 1;
        }

        /* Alternative implementation using mix-blend-mode for even more adaptation */
        @supports (mix-blend-mode: difference) {
          .adaptive-glass-nav-alt {
            mix-blend-mode: luminosity;
          }
        }

        /* Dark background detection using prefers-color-scheme */
        @media (prefers-color-scheme: dark) {
          .adaptive-glass-nav {
            /* On dark backgrounds, use lighter glass */
            background: color-mix(in srgb, Canvas 40%, transparent);
            backdrop-filter: blur(24px) saturate(180%) brightness(1.2) contrast(0.85);
            -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.2) contrast(0.85);
          }
        }

        /* Light background detection */
        @media (prefers-color-scheme: light) {
          .adaptive-glass-nav {
            /* On light backgrounds, use darker glass */
            background: color-mix(in srgb, Canvas 60%, transparent);
            backdrop-filter: blur(24px) saturate(180%) brightness(1.05) contrast(0.95);
            -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.05) contrast(0.95);
          }
        }
      `}</style>
    </nav>
  );
}
