'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, User } from 'lucide-react';
import { Session } from 'next-auth';

interface YouTubeGlassNavProps {
  mode: 'static' | 'auto-hide' | 'minimal';
  session: Session | null;
  onMenuClick: () => void;
}

export function YouTubeGlassNav({ mode, session, onMenuClick }: YouTubeGlassNavProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

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

  const handlePress = (index: number) => {
    setPressedIndex(index);
    setTimeout(() => setPressedIndex(null), 150);
  };

  if (mode === 'minimal') {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Expanded menu items */}
          {isExpanded && (
            <div className="absolute bottom-20 right-0 flex flex-col gap-2 mb-2">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => handlePress(index)}
                    className="youtube-glass-minimal-item group"
                    style={{
                      animation: `slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.05}s both`,
                    }}
                  >
                    <span className="mr-3 text-sm font-medium whitespace-nowrap">{item.label}</span>
                    <div className={`flex-shrink-0 ${item.active ? 'text-[#d42027]' : ''}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Floating action button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`youtube-glass-fab ${isExpanded ? 'rotate-45' : ''}`}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <style jsx>{`
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .youtube-glass-fab {
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(18, 18, 18, 0.85);
            backdrop-filter: blur(24px) saturate(160%);
            -webkit-backdrop-filter: blur(24px) saturate(160%);
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 
              0 12px 40px rgba(0, 0, 0, 0.4),
              0 4px 12px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              inset 0 -1px 0 rgba(0, 0, 0, 0.5);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            color: #ffffff;
          }

          .youtube-glass-fab:hover {
            transform: scale(1.1);
            background: rgba(25, 25, 25, 0.9);
            box-shadow: 
              0 16px 56px rgba(0, 0, 0, 0.5),
              0 6px 16px rgba(0, 0, 0, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.15);
          }

          .youtube-glass-fab:active {
            transform: scale(0.95);
          }

          .youtube-glass-minimal-item {
            display: flex;
            align-items: center;
            padding: 12px 20px;
            background: rgba(18, 18, 18, 0.85);
            backdrop-filter: blur(24px) saturate(160%);
            -webkit-backdrop-filter: blur(24px) saturate(160%);
            border-radius: 28px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.4),
              0 2px 8px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            color: #ffffff;
          }

          .youtube-glass-minimal-item:hover {
            transform: translateX(-4px) scale(1.05);
            background: rgba(25, 25, 25, 0.9);
          }

          .youtube-glass-minimal-item:active {
            transform: scale(0.98);
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
        padding: '0 max(env(safe-area-inset-left), 0.75rem) env(safe-area-inset-bottom) max(env(safe-area-inset-right), 0.75rem)',
      }}
    >
      <div className="mx-auto max-w-lg mb-3">
        <div className="youtube-glass-nav">
          <div className="flex items-center justify-around h-20 px-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseDown={() => handlePress(index)}
                  onTouchStart={() => handlePress(index)}
                  className="youtube-nav-item group"
                >
                  <div
                    className={`youtube-icon-wrapper ${
                      item.active ? 'active' : ''
                    } ${pressedIndex === index ? 'pressed' : ''}`}
                  >
                    <Icon className="w-6 h-6" />
                    {item.active && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                        <div className="w-8 h-0.5 bg-[#d42027] rounded-full shadow-[0_0_8px_rgba(212,32,39,0.5)]" />
                      </div>
                    )}
                  </div>
                  <span className={`youtube-label ${item.active ? 'active' : ''}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}

            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePress(4);
                onMenuClick();
              }}
              onMouseDown={() => handlePress(4)}
              onTouchStart={() => handlePress(4)}
              className="youtube-nav-item group"
            >
              <div className={`youtube-icon-wrapper ${pressedIndex === 4 ? 'pressed' : ''}`}>
                <Menu className="w-6 h-6" />
              </div>
              <span className="youtube-label">Menu</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .youtube-glass-nav {
          background: rgba(18, 18, 18, 0.8);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.5),
            0 4px 16px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -1px 0 rgba(0, 0, 0, 0.5);
          position: relative;
          overflow: hidden;
        }

        .youtube-glass-nav::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.15) 30%,
            rgba(255, 255, 255, 0.15) 70%,
            transparent
          );
        }

        .youtube-glass-nav::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.03), transparent 70%);
          pointer-events: none;
        }

        .youtube-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex: 1;
          color: #e0e0e0;
          transition: color 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .youtube-icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .youtube-icon-wrapper.active {
          color: #d42027;
          background: rgba(212, 32, 39, 0.1);
        }

        .youtube-icon-wrapper.pressed {
          transform: scale(0.85);
          background: rgba(255, 255, 255, 0.05);
        }

        .youtube-icon-wrapper:not(.pressed):hover {
          transform: scale(1.1);
          background: rgba(255, 255, 255, 0.08);
        }

        .youtube-label {
          font-size: 11px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .youtube-label.active {
          color: #d42027;
          font-weight: 600;
        }
      `}</style>
    </nav>
  );
}
