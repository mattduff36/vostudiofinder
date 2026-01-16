'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, User } from 'lucide-react';
import { Session } from 'next-auth';

interface GlassUINavProps {
  mode: 'static' | 'auto-hide' | 'minimal';
  session: Session | null;
  onMenuClick: () => void;
}

export function GlassUINav({ mode, session, onMenuClick }: GlassUINavProps) {
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
      <div className="fixed bottom-6 left-6 z-50">
        {isExpanded && (
          <div className="glass-ui-minimal-menu">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="glass-ui-minimal-item"
                  style={{
                    animationDelay: `${index * 0.05}s`,
                  }}
                >
                  <div className={`glass-ui-minimal-icon ${item.active ? 'active' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        <button onClick={() => setIsExpanded(!isExpanded)} className="glass-ui-fab">
          <Menu className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-45' : ''}`} />
          <div className="glass-ui-fab-glow" />
        </button>

        <style jsx global>{`
          .glass-ui-minimal-menu {
            position: absolute;
            bottom: 80px;
            left: 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
            animation: glassUISlideUp 0.4s ease-out;
          }

          @keyframes glassUISlideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .glass-ui-minimal-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px 12px 14px;
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(16px) saturate(180%);
            -webkit-backdrop-filter: blur(16px) saturate(180%);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.18);
            box-shadow: 
              0 8px 32px 0 rgba(31, 38, 135, 0.37),
              inset 0 1px 0 rgba(255, 255, 255, 0.5);
            color: #1f2937;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            animation: glassUIFadeIn 0.5s ease-out backwards;
          }

          @keyframes glassUIFadeIn {
            from {
              opacity: 0;
              transform: translateX(-10px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .glass-ui-minimal-item:hover {
            background: rgba(255, 255, 255, 0.35);
            transform: translateX(-6px);
            box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.45);
          }

          .glass-ui-minimal-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all 0.3s ease;
          }

          .glass-ui-minimal-icon.active {
            background: rgba(212, 32, 39, 0.25);
            color: #d42027;
            box-shadow: 0 4px 16px rgba(212, 32, 39, 0.3);
          }

          .glass-ui-fab {
            width: 64px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.18);
            box-shadow: 
              0 8px 32px 0 rgba(31, 38, 135, 0.37),
              inset 0 1px 0 rgba(255, 255, 255, 0.5);
            color: #1f2937;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }

          .glass-ui-fab:hover {
            background: rgba(255, 255, 255, 0.35);
            transform: scale(1.08);
            box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.45);
          }

          .glass-ui-fab:active {
            transform: scale(0.96);
          }

          .glass-ui-fab-glow {
            position: absolute;
            inset: -40px;
            background: radial-gradient(circle, rgba(212, 32, 39, 0.2), transparent 60%);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .glass-ui-fab:hover .glass-ui-fab-glow {
            opacity: 1;
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
        padding: '0 max(env(safe-area-inset-left), 1rem) calc(env(safe-area-inset-bottom) + 1rem) max(env(safe-area-inset-right), 1rem)',
      }}
    >
      <div className="mx-auto max-w-2xl">
        <div className="glass-ui-nav">
          <div className="glass-ui-nav-inner">
            <div className="flex items-center justify-around px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="glass-ui-item">
                    <div className={`glass-ui-item-content ${item.active ? 'active' : ''}`}>
                      <div className="glass-ui-icon-wrapper">
                        <Icon className="w-6 h-6" />
                        {item.active && (
                          <>
                            <div className="glass-ui-active-ring" />
                            <div className="glass-ui-active-glow" />
                          </>
                        )}
                      </div>
                      <span className="glass-ui-label">{item.label}</span>
                    </div>
                  </Link>
                );
              })}

              <button onClick={onMenuClick} className="glass-ui-item">
                <div className="glass-ui-item-content">
                  <div className="glass-ui-icon-wrapper">
                    <Menu className="w-6 h-6" />
                  </div>
                  <span className="glass-ui-label">Menu</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .glass-ui-nav {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 
            0 8px 32px 0 rgba(31, 38, 135, 0.37),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
          padding: 8px;
          position: relative;
          overflow: hidden;
        }

        .glass-ui-nav::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.3), transparent);
          pointer-events: none;
        }

        .glass-ui-nav::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 10%;
          right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
        }

        .glass-ui-nav-inner {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 10px 4px;
        }

        .glass-ui-item {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          transition: all 0.3s ease;
        }

        .glass-ui-item-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: #374151;
          transition: all 0.3s ease;
        }

        .glass-ui-item-content.active {
          color: #d42027;
        }

        .glass-ui-icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .glass-ui-item:hover .glass-ui-icon-wrapper {
          transform: scale(1.1) translateY(-4px);
          background: rgba(255, 255, 255, 0.35);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .glass-ui-item:active .glass-ui-icon-wrapper {
          transform: scale(0.95);
        }

        .glass-ui-item-content.active .glass-ui-icon-wrapper {
          background: rgba(212, 32, 39, 0.2);
          box-shadow: 0 4px 20px rgba(212, 32, 39, 0.3);
        }

        .glass-ui-active-ring {
          position: absolute;
          inset: -4px;
          border: 2px solid rgba(212, 32, 39, 0.3);
          border-radius: 50%;
          animation: glassUIPulse 2s ease-in-out infinite;
        }

        @keyframes glassUIPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }

        .glass-ui-active-glow {
          position: absolute;
          inset: -20px;
          background: radial-gradient(circle, rgba(212, 32, 39, 0.25), transparent 60%);
          animation: glassUIGlow 2s ease-in-out infinite;
        }

        @keyframes glassUIGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }

        .glass-ui-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          transition: all 0.3s ease;
        }

        .glass-ui-item-content.active .glass-ui-label {
          font-weight: 700;
        }
      `}</style>
    </nav>
  );
}
