'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, User } from 'lucide-react';
import { Session } from 'next-auth';

interface IOSGlassNavProps {
  mode: 'static' | 'auto-hide' | 'minimal';
  session: Session | null;
  onMenuClick: () => void;
}

export function IOSGlassNav({ mode, session, onMenuClick }: IOSGlassNavProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Handle scroll for auto-hide mode
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

  const handleItemClick = (index: number) => {
    setActiveIndex(index);
    setTimeout(() => setActiveIndex(null), 300);
  };

  if (mode === 'minimal') {
    return (
      <div className="fixed bottom-6 left-0 right-0 flex justify-center items-center z-50 pointer-events-none">
        <div className="pointer-events-auto">
          {/* Minimal mode - expandable from center button */}
          <div className="relative">
            {/* Expanded items */}
            {isExpanded && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-3 mb-2">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => handleItemClick(index)}
                      className="ios-glass-item group"
                      style={{
                        animation: `slideUpFade 0.3s ease-out ${index * 0.05}s both`,
                      }}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="absolute left-full ml-3 whitespace-nowrap bg-gray-900/90 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Center toggle button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`ios-glass-button ${isExpanded ? 'rotate-45' : ''}`}
            >
              <Menu className="w-7 h-7" />
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes slideUpFade {
            from {
              opacity: 0;
              transform: translateY(10px) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .ios-glass-button {
            width: 64px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.12),
              0 2px 8px rgba(0, 0, 0, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.5);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            color: #1f2937;
          }

          .ios-glass-button:hover {
            transform: scale(1.05);
            box-shadow: 
              0 12px 48px rgba(0, 0, 0, 0.15),
              0 4px 12px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.6);
          }

          .ios-glass-button:active {
            transform: scale(0.95);
          }

          .ios-glass-item {
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.12),
              0 2px 8px rgba(0, 0, 0, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.5);
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            color: #1f2937;
            position: relative;
          }

          .ios-glass-item:hover {
            transform: scale(1.1);
            background: rgba(255, 255, 255, 0.95);
          }

          .ios-glass-item:active {
            transform: scale(0.95);
          }
        `}</style>
      </div>
    );
  }

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        padding: '0 max(env(safe-area-inset-left), 1rem) env(safe-area-inset-bottom) max(env(safe-area-inset-right), 1rem)',
      }}
    >
      <div className="mx-auto max-w-lg mb-4">
        <div className="ios-glass-nav">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleItemClick(index)}
                  className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all duration-200 ${
                    activeIndex === index ? 'scale-90' : 'scale-100'
                  }`}
                >
                  <div className={`relative ${item.active ? 'text-[#d42027]' : 'text-gray-700'}`}>
                    <Icon className="w-6 h-6" />
                    {item.active && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#d42027] animate-pulse" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      item.active ? 'text-[#d42027]' : 'text-gray-700'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleItemClick(4);
                onMenuClick();
              }}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 text-gray-700 transition-all duration-200 ${
                activeIndex === 4 ? 'scale-90' : 'scale-100'
              }`}
            >
              <Menu className="w-6 h-6" />
              <span className="text-xs font-medium">Menu</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ios-glass-nav {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.1),
            0 2px 8px rgba(0, 0, 0, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.4),
            inset 0 -1px 0 rgba(0, 0, 0, 0.02);
          position: relative;
          overflow: hidden;
        }

        .ios-glass-nav::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.8) 20%,
            rgba(255, 255, 255, 0.8) 80%,
            transparent
          );
        }
      `}</style>
    </nav>
  );
}
