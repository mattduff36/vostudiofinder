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
        {/* Floating buttons without container */}
        <div className="flex items-center justify-around gap-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="adaptive-floating-button group"
              >
                <div className={`adaptive-button-glass ${item.active ? 'active' : ''}`}>
                  <div className="adaptive-icon-wrapper">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`adaptive-button-label ${item.active ? 'active' : ''}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}

          <button onClick={onMenuClick} className="adaptive-floating-button group">
            <div className="adaptive-button-glass">
              <div className="adaptive-icon-wrapper">
                <Menu className="w-6 h-6" />
              </div>
              <span className="adaptive-button-label">Menu</span>
            </div>
          </button>
        </div>
      </div>

      <style jsx global>{`
        /* Floating Button Container */
        .adaptive-floating-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Individual Glass Button - Enhanced blur */
        .adaptive-button-glass {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 16px;
          
          /* Enhanced adaptive glass effect */
          background: color-mix(in srgb, Canvas 45%, transparent);
          
          /* INCREASED blur and saturation for stronger liquid glass effect */
          backdrop-filter: blur(40px) saturate(200%) brightness(1.15) contrast(0.85);
          -webkit-backdrop-filter: blur(40px) saturate(200%) brightness(1.15) contrast(0.85);
          
          border-radius: 24px;
          
          /* NO outer border - buttons float freely */
          border: none;
          
          /* Enhanced shadow for depth without border */
          box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.15),
            0 4px 16px rgba(0, 0, 0, 0.1),
            inset 0 1px 3px color-mix(in srgb, Canvas 90%, transparent),
            inset 0 0 60px color-mix(in srgb, Canvas 30%, transparent);
          
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }

        /* Floating effect on hover */
        .adaptive-floating-button:hover .adaptive-button-glass {
          transform: translateY(-6px) scale(1.05);
          background: color-mix(in srgb, Canvas 55%, transparent);
          backdrop-filter: blur(48px) saturate(220%) brightness(1.2) contrast(0.8);
          -webkit-backdrop-filter: blur(48px) saturate(220%) brightness(1.2) contrast(0.8);
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.2),
            0 8px 24px rgba(0, 0, 0, 0.15),
            inset 0 1px 3px color-mix(in srgb, Canvas 95%, transparent),
            inset 0 0 80px color-mix(in srgb, Canvas 40%, transparent);
        }

        .adaptive-floating-button:active .adaptive-button-glass {
          transform: translateY(-2px) scale(0.98);
        }

        /* Active state with red accent */
        .adaptive-button-glass.active {
          background: color-mix(in srgb, rgba(212, 32, 39, 0.25) 60%, Canvas 40%);
          backdrop-filter: blur(40px) saturate(220%) brightness(1.1);
          -webkit-backdrop-filter: blur(40px) saturate(220%) brightness(1.1);
          box-shadow: 
            0 12px 40px rgba(212, 32, 39, 0.25),
            0 4px 16px rgba(212, 32, 39, 0.15),
            inset 0 1px 3px rgba(255, 255, 255, 0.3),
            inset 0 0 60px rgba(212, 32, 39, 0.15),
            0 0 0 2px rgba(212, 32, 39, 0.2);
        }

        /* Shimmer effect inside button */
        .adaptive-button-glass::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 50% 0%,
            color-mix(in srgb, Canvas 50%, transparent),
            transparent 70%
          );
          pointer-events: none;
          opacity: 0.6;
        }

        /* Icon wrapper with enhanced glass */
        .adaptive-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 18px;
          
          /* Enhanced inner glass effect */
          background: color-mix(in srgb, Canvas 30%, transparent);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          
          /* Use CanvasText for automatic light/dark text */
          color: CanvasText;
          
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 
            inset 0 2px 6px color-mix(in srgb, Canvas 60%, transparent),
            inset 0 0 30px color-mix(in srgb, Canvas 20%, transparent);
        }

        .adaptive-floating-button:hover .adaptive-icon-wrapper {
          transform: scale(1.1) rotate(5deg);
          background: color-mix(in srgb, Canvas 40%, transparent);
          box-shadow: 
            inset 0 2px 8px color-mix(in srgb, Canvas 70%, transparent),
            inset 0 0 40px color-mix(in srgb, Canvas 30%, transparent),
            0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .adaptive-button-glass.active .adaptive-icon-wrapper {
          background: rgba(212, 32, 39, 0.2);
          color: #d42027;
          box-shadow: 
            inset 0 2px 12px rgba(212, 32, 39, 0.2),
            inset 0 0 40px rgba(212, 32, 39, 0.1),
            0 0 20px rgba(212, 32, 39, 0.15);
        }

        /* Label styling */
        .adaptive-button-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          /* Automatic text color adaptation */
          color: CanvasText;
          opacity: 0.85;
          transition: all 0.3s ease;
          position: relative;
          z-index: 10;
        }

        .adaptive-button-label.active {
          color: #d42027;
          font-weight: 700;
          opacity: 1;
        }

        .adaptive-floating-button:hover .adaptive-button-label {
          opacity: 1;
          transform: scale(1.05);
        }

        /* Dark background detection - Enhanced glass */
        @media (prefers-color-scheme: dark) {
          .adaptive-button-glass {
            background: color-mix(in srgb, Canvas 35%, transparent);
            backdrop-filter: blur(44px) saturate(200%) brightness(1.25) contrast(0.8);
            -webkit-backdrop-filter: blur(44px) saturate(200%) brightness(1.25) contrast(0.8);
          }
          
          .adaptive-floating-button:hover .adaptive-button-glass {
            backdrop-filter: blur(52px) saturate(220%) brightness(1.3) contrast(0.75);
            -webkit-backdrop-filter: blur(52px) saturate(220%) brightness(1.3) contrast(0.75);
          }
        }

        /* Light background detection - Enhanced glass */
        @media (prefers-color-scheme: light) {
          .adaptive-button-glass {
            background: color-mix(in srgb, Canvas 50%, transparent);
            backdrop-filter: blur(38px) saturate(200%) brightness(1.08) contrast(0.9);
            -webkit-backdrop-filter: blur(38px) saturate(200%) brightness(1.08) contrast(0.9);
          }
          
          .adaptive-floating-button:hover .adaptive-button-glass {
            backdrop-filter: blur(46px) saturate(220%) brightness(1.12) contrast(0.85);
            -webkit-backdrop-filter: blur(46px) saturate(220%) brightness(1.12) contrast(0.85);
          }
        }
      `}</style>
    </nav>
  );
}
