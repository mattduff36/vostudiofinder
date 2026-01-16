'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, User } from 'lucide-react';
import { Session } from 'next-auth';

interface MinimalGlassNavProps {
  mode: 'static' | 'auto-hide' | 'minimal';
  session: Session | null;
  onMenuClick: () => void;
}

export function MinimalGlassNav({ mode, session, onMenuClick }: MinimalGlassNavProps) {
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
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Expanded nav items */}
        <div
          className={`flex flex-col gap-2 transition-all duration-300 ${
            isExpanded
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="minimal-glass-item group"
                style={{
                  transitionDelay: isExpanded ? `${index * 30}ms` : '0ms',
                }}
              >
                <span className="text-sm font-medium mr-3">{item.label}</span>
                <div className={`minimal-icon ${item.active ? 'active' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`minimal-fab ${isExpanded ? 'expanded' : ''}`}
        >
          <Menu className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
        </button>

        <style jsx>{`
          .minimal-glass-item {
            display: flex;
            align-items: center;
            padding: 12px 16px 12px 20px;
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
            color: #1f2937;
            transition: all 0.2s ease;
          }

          .minimal-glass-item:hover {
            background: rgba(255, 255, 255, 0.85);
            transform: translateX(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          }

          .minimal-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: rgba(0, 0, 0, 0.04);
            transition: all 0.2s ease;
          }

          .minimal-icon.active {
            background: rgba(212, 32, 39, 0.12);
            color: #d42027;
          }

          .minimal-fab {
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
            color: #1f2937;
            transition: all 0.3s ease;
          }

          .minimal-fab:hover {
            background: rgba(255, 255, 255, 0.95);
            transform: scale(1.05);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
          }

          .minimal-fab:active {
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
      <div className="mx-auto max-w-lg pb-4">
        <div className="minimal-glass-nav">
          <div className="flex items-stretch h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="minimal-nav-item"
                >
                  <div className={`minimal-nav-content ${item.active ? 'active' : ''}`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium mt-1">{item.label}</span>
                    {item.active && <div className="minimal-active-dot" />}
                  </div>
                </Link>
              );
            })}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onMenuClick();
              }}
              className="minimal-nav-item"
            >
              <div className="minimal-nav-content">
                <Menu className="w-5 h-5" />
                <span className="text-xs font-medium mt-1">Menu</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .minimal-glass-nav {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          position: relative;
        }

        .minimal-glass-nav::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.3) 0%,
            transparent 100%
          );
          pointer-events: none;
        }

        .minimal-nav-item {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: background 0.2s ease;
        }

        .minimal-nav-item:hover {
          background: rgba(0, 0, 0, 0.02);
        }

        .minimal-nav-item:active {
          background: rgba(0, 0, 0, 0.04);
        }

        .minimal-nav-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #6b7280;
          transition: all 0.2s ease;
          position: relative;
        }

        .minimal-nav-content.active {
          color: #d42027;
        }

        .minimal-active-dot {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #d42027;
        }
      `}</style>
    </nav>
  );
}
