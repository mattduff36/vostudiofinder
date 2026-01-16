'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, User } from 'lucide-react';
import { Session } from 'next-auth';
import { LiquidGlass } from '@specy/liquid-glass-react';

interface LiquidGlassNav1Props {
  mode: 'static' | 'auto-hide' | 'minimal';
  session: Session | null;
  onMenuClick: () => void;
}

export function LiquidGlassNav1({ mode, session, onMenuClick }: LiquidGlassNav1Props) {
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
                      style={{
                        animation: `liquidFadeIn 0.4s ease-out ${index * 0.05}s both`,
                      }}
                    >
                      <LiquidGlass
                        intensity={0.8}
                        blur={20}
                        saturation={1.8}
                        className="liquid-minimal-item"
                      >
                        <Icon className={`w-5 h-5 ${item.active ? 'text-[#d42027]' : 'text-gray-800'}`} />
                      </LiquidGlass>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <button onClick={() => setIsExpanded(!isExpanded)}>
            <LiquidGlass intensity={1} blur={24} saturation={2} className="liquid-fab">
              <Menu className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
            </LiquidGlass>
          </button>
        </div>

        <style jsx global>{`
          @keyframes liquidFadeIn {
            from {
              opacity: 0;
              transform: translateY(10px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .liquid-minimal-item {
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.4);
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.12),
              0 2px 8px rgba(0, 0, 0, 0.08),
              inset 0 1px 2px rgba(255, 255, 255, 0.8);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .liquid-minimal-item:hover {
            transform: scale(1.1);
            box-shadow: 
              0 12px 48px rgba(0, 0, 0, 0.16),
              0 4px 12px rgba(0, 0, 0, 0.12),
              inset 0 1px 2px rgba(255, 255, 255, 0.9);
          }

          .liquid-fab {
            width: 68px;
            height: 68px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.85);
            border: 1.5px solid rgba(255, 255, 255, 0.5);
            box-shadow: 
              0 12px 48px rgba(0, 0, 0, 0.15),
              0 4px 16px rgba(0, 0, 0, 0.1),
              inset 0 1px 2px rgba(255, 255, 255, 0.9);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            color: #1f2937;
          }

          .liquid-fab:hover {
            transform: scale(1.08);
            box-shadow: 
              0 16px 64px rgba(0, 0, 0, 0.2),
              0 6px 20px rgba(0, 0, 0, 0.12),
              inset 0 1px 2px rgba(255, 255, 255, 1);
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
        <LiquidGlass intensity={0.9} blur={24} saturation={1.9} className="liquid-glass-nav">
          <div className="flex items-center justify-around h-20 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-2 flex-1 group"
                >
                  <div
                    className={`liquid-icon-ring ${item.active ? 'active' : ''}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`text-xs font-semibold ${item.active ? 'text-[#d42027]' : 'text-gray-700'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}

            <button onClick={onMenuClick} className="flex flex-col items-center gap-2 flex-1 group">
              <div className="liquid-icon-ring">
                <Menu className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-gray-700">Menu</span>
            </button>
          </div>
        </LiquidGlass>
      </div>

      <style jsx global>{`
        .liquid-glass-nav {
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.75);
          border: 1.5px solid rgba(255, 255, 255, 0.4);
          box-shadow: 
            0 16px 56px rgba(0, 0, 0, 0.12),
            0 6px 24px rgba(0, 0, 0, 0.08),
            inset 0 1px 2px rgba(255, 255, 255, 0.9),
            inset 0 -1px 2px rgba(0, 0, 0, 0.03);
          position: relative;
          overflow: hidden;
        }

        .liquid-glass-nav::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.4), transparent 70%);
          pointer-events: none;
        }

        .liquid-icon-ring {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          color: #374151;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.5);
        }

        .liquid-icon-ring.active {
          background: rgba(212, 32, 39, 0.12);
          color: #d42027;
          box-shadow: 
            inset 0 2px 12px rgba(212, 32, 39, 0.15),
            0 0 0 1px rgba(212, 32, 39, 0.1);
        }

        .group:hover .liquid-icon-ring {
          transform: scale(1.1) translateY(-2px);
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 
            0 6px 20px rgba(0, 0, 0, 0.1),
            inset 0 1px 2px rgba(255, 255, 255, 0.7);
        }

        .group:active .liquid-icon-ring {
          transform: scale(0.95);
        }
      `}</style>
    </nav>
  );
}
