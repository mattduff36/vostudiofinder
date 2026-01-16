'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, User } from 'lucide-react';
import { Session } from 'next-auth';
import clsx from 'clsx';

interface GlassCNNavProps {
  mode: 'static' | 'auto-hide' | 'minimal';
  session: Session | null;
  onMenuClick: () => void;
}

export function GlassCNNav({ mode, session, onMenuClick }: GlassCNNavProps) {
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
        {isExpanded && (
          <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'glasscn-minimal-item group',
                    item.active && 'glasscn-minimal-item-active'
                  )}
                  style={{
                    animationDelay: `${index * 40}ms`,
                  }}
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <div className={clsx('glasscn-minimal-badge', item.active && 'glasscn-badge-active')}>
                    <Icon className="w-4 h-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={clsx('glasscn-fab', isExpanded && 'glasscn-fab-active')}
        >
          <Menu className={clsx('w-5 h-5 transition-transform duration-300', isExpanded && 'rotate-90')} />
        </button>

        <style jsx global>{`
          .glasscn-minimal-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px 10px 18px;
            background: hsl(0 0% 100% / 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid hsl(0 0% 100% / 0.2);
            border-radius: 0.75rem;
            box-shadow: 
              0 4px 12px -2px hsl(0 0% 0% / 0.1),
              0 0 0 1px hsl(0 0% 0% / 0.05);
            color: hsl(0 0% 20%);
            font-weight: 500;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            animation: glasscnSlideIn 0.3s ease-out backwards;
          }

          @keyframes glasscnSlideIn {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .glasscn-minimal-item:hover {
            background: hsl(0 0% 100% / 0.85);
            transform: translateX(-4px);
            box-shadow: 
              0 8px 24px -4px hsl(0 0% 0% / 0.15),
              0 0 0 1px hsl(0 0% 0% / 0.05);
          }

          .glasscn-minimal-item-active {
            background: hsl(0 85% 55% / 0.15);
            border-color: hsl(0 85% 55% / 0.2);
            color: hsl(0 85% 45%);
          }

          .glasscn-minimal-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 0.5rem;
            background: hsl(0 0% 0% / 0.05);
            transition: all 0.2s ease;
          }

          .glasscn-badge-active {
            background: hsl(0 85% 55% / 0.2);
            color: hsl(0 85% 45%);
          }

          .glasscn-fab {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 56px;
            height: 56px;
            background: hsl(0 0% 100% / 0.8);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid hsl(0 0% 100% / 0.2);
            border-radius: 0.75rem;
            box-shadow: 
              0 4px 12px -2px hsl(0 0% 0% / 0.1),
              0 0 0 1px hsl(0 0% 0% / 0.05);
            color: hsl(0 0% 20%);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .glasscn-fab:hover {
            background: hsl(0 0% 100% / 0.95);
            transform: scale(1.05);
            box-shadow: 
              0 8px 24px -4px hsl(0 0% 0% / 0.15),
              0 0 0 1px hsl(0 0% 0% / 0.05);
          }

          .glasscn-fab:active {
            transform: scale(0.98);
          }

          .glasscn-fab-active {
            background: hsl(0 85% 55% / 0.15);
            border-color: hsl(0 85% 55% / 0.2);
            color: hsl(0 85% 45%);
          }
        `}</style>
      </div>
    );
  }

  return (
    <nav
      className={clsx(
        'fixed bottom-0 left-0 right-0 z-50 transition-all duration-300',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      )}
      style={{
        padding: '0 max(env(safe-area-inset-left), 1rem) calc(env(safe-area-inset-bottom) + 1rem) max(env(safe-area-inset-right), 1rem)',
      }}
    >
      <div className="mx-auto max-w-2xl">
        <div className="glasscn-nav">
          <div className="glasscn-nav-content">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx('glasscn-nav-item', item.active && 'glasscn-nav-item-active')}
                >
                  <div className="glasscn-icon-container">
                    <Icon className="w-5 h-5" />
                    {item.active && <div className="glasscn-active-indicator" />}
                  </div>
                  <span className="glasscn-nav-label">{item.label}</span>
                </Link>
              );
            })}

            <button onClick={onMenuClick} className="glasscn-nav-item">
              <div className="glasscn-icon-container">
                <Menu className="w-5 h-5" />
              </div>
              <span className="glasscn-nav-label">Menu</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .glasscn-nav {
          background: hsl(0 0% 100% / 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid hsl(0 0% 100% / 0.2);
          border-radius: 1.5rem;
          box-shadow: 
            0 10px 40px -10px hsl(0 0% 0% / 0.12),
            0 0 0 1px hsl(0 0% 0% / 0.05);
          padding: 0.5rem;
          position: relative;
          overflow: hidden;
        }

        .glasscn-nav::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            hsl(0 0% 100% / 0.8) 20%,
            hsl(0 0% 100% / 0.8) 80%,
            transparent
          );
        }

        .glasscn-nav::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 50% 0%,
            hsl(0 0% 100% / 0.3),
            transparent 60%
          );
          pointer-events: none;
        }

        .glasscn-nav-content {
          display: flex;
          align-items: center;
          justify-content: space-around;
          position: relative;
          z-index: 10;
        }

        .glasscn-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.375rem;
          padding: 0.75rem 1rem;
          flex: 1;
          color: hsl(0 0% 30%);
          border-radius: 1rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .glasscn-nav-item::before {
          content: '';
          position: absolute;
          inset: 0;
          background: hsl(0 0% 100% / 0.5);
          border-radius: 1rem;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .glasscn-nav-item:hover::before {
          opacity: 1;
        }

        .glasscn-nav-item:hover {
          transform: translateY(-2px);
        }

        .glasscn-nav-item:active {
          transform: translateY(0);
        }

        .glasscn-nav-item-active {
          color: hsl(0 85% 45%);
        }

        .glasscn-nav-item-active::before {
          background: hsl(0 85% 55% / 0.1);
          opacity: 1;
        }

        .glasscn-icon-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 0.75rem;
          background: hsl(0 0% 100% / 0.4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid hsl(0 0% 100% / 0.3);
          box-shadow: 0 2px 8px hsl(0 0% 0% / 0.05);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glasscn-nav-item:hover .glasscn-icon-container {
          transform: scale(1.08);
          background: hsl(0 0% 100% / 0.6);
          box-shadow: 0 4px 12px hsl(0 0% 0% / 0.1);
        }

        .glasscn-nav-item-active .glasscn-icon-container {
          background: hsl(0 85% 55% / 0.15);
          border-color: hsl(0 85% 55% / 0.2);
          box-shadow: 
            0 2px 8px hsl(0 85% 55% / 0.2),
            inset 0 0 20px hsl(0 85% 55% / 0.1);
        }

        .glasscn-active-indicator {
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 3px;
          border-radius: 999px;
          background: hsl(0 85% 55%);
          box-shadow: 0 0 8px hsl(0 85% 55% / 0.5);
        }

        .glasscn-nav-label {
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          transition: all 0.2s ease;
          position: relative;
          z-index: 10;
        }

        .glasscn-nav-item-active .glasscn-nav-label {
          font-weight: 700;
        }
      `}</style>
    </nav>
  );
}
