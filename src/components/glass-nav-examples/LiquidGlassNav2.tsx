'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, User } from 'lucide-react';
import { Session } from 'next-auth';
import { LiquidGlass } from '@specy/liquid-glass-react';

interface LiquidGlassNav2Props {
  mode: 'static' | 'auto-hide' | 'minimal';
  session: Session | null;
  onMenuClick: () => void;
}

export function LiquidGlassNav2({ mode, session, onMenuClick }: LiquidGlassNav2Props) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
      <div className="fixed bottom-6 right-6 z-50">
        {isExpanded && (
          <div className="absolute bottom-20 right-0 flex flex-col gap-3 mb-3">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    style={{
                      animation: `slideInScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.06}s both`,
                    }}
                  >
                    <LiquidGlass
                      glassStyle={{
                        intensity: 1.2,
                        blur: 28,
                        saturation: 2,
                      }}
                      style="liquid-v2-minimal"
                    >
                      <span className="text-sm font-semibold mr-3">{item.label}</span>
                      <div className={`liquid-v2-icon ${item.active ? 'active' : ''}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </LiquidGlass>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <button onClick={() => setIsExpanded(!isExpanded)}>
          <LiquidGlass 
            glassStyle={{
              intensity: 1.3,
              blur: 32,
              saturation: 2.1,
            }}
            style="liquid-v2-fab"
          >
            <div className="relative">
              <Menu className={`w-6 h-6 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
              <div className="liquid-v2-glow" />
            </div>
          </LiquidGlass>
        </button>

        <style jsx global>{`
          @keyframes slideInScale {
            from {
              opacity: 0;
              transform: translateX(30px) scale(0.8);
            }
            to {
              opacity: 1;
              transform: translateX(0) scale(1);
            }
          }

          .liquid-v2-minimal {
            display: flex;
            align-items: center;
            padding: 14px 18px 14px 24px;
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.85);
            border: 1.5px solid rgba(255, 255, 255, 0.6);
            box-shadow: 
              0 10px 40px rgba(0, 0, 0, 0.14),
              0 4px 16px rgba(0, 0, 0, 0.1),
              inset 0 2px 4px rgba(255, 255, 255, 0.9);
            color: #1f2937;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            overflow: hidden;
          }

          .liquid-v2-minimal::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.5), transparent);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .liquid-v2-minimal:hover {
            transform: translateX(-8px) scale(1.05);
            box-shadow: 
              0 16px 56px rgba(0, 0, 0, 0.18),
              0 6px 24px rgba(0, 0, 0, 0.14),
              inset 0 2px 4px rgba(255, 255, 255, 1);
          }

          .liquid-v2-minimal:hover::before {
            opacity: 1;
          }

          .liquid-v2-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 42px;
            height: 42px;
            border-radius: 14px;
            background: rgba(0, 0, 0, 0.04);
            transition: all 0.3s ease;
          }

          .liquid-v2-icon.active {
            background: linear-gradient(135deg, rgba(212, 32, 39, 0.18), rgba(212, 32, 39, 0.12));
            color: #d42027;
            box-shadow: 
              inset 0 2px 10px rgba(212, 32, 39, 0.12),
              0 0 0 1px rgba(212, 32, 39, 0.1);
          }

          .liquid-v2-fab {
            width: 70px;
            height: 70px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid rgba(255, 255, 255, 0.7);
            box-shadow: 
              0 16px 64px rgba(0, 0, 0, 0.18),
              0 6px 24px rgba(0, 0, 0, 0.12),
              inset 0 2px 4px rgba(255, 255, 255, 1);
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            color: #1f2937;
            position: relative;
            overflow: visible;
          }

          .liquid-v2-fab:hover {
            transform: scale(1.12) rotate(5deg);
            box-shadow: 
              0 20px 80px rgba(0, 0, 0, 0.22),
              0 8px 32px rgba(0, 0, 0, 0.16),
              inset 0 2px 4px rgba(255, 255, 255, 1);
          }

          .liquid-v2-fab:active {
            transform: scale(1.02);
          }

          .liquid-v2-glow {
            position: absolute;
            inset: -30px;
            background: radial-gradient(circle, rgba(212, 32, 39, 0.2), transparent 60%);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
          }

          .liquid-v2-fab:hover .liquid-v2-glow {
            opacity: 1;
          }
        `}</style>
      </div>
    );
  }

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 flex justify-center transition-all duration-400 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
      }}
    >
      <LiquidGlass 
        glassStyle={{
          intensity: 1.1,
          blur: 28,
          saturation: 2,
        }}
        style="liquid-v2-container"
      >
        <div className="flex items-center gap-2 px-3 py-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="liquid-v2-item"
              >
                <div
                  className={`liquid-v2-pill ${item.active ? 'active' : ''} ${
                    hoveredIndex === index ? 'hovered' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className={`liquid-v2-text ${hoveredIndex === index || item.active ? 'show' : ''}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}

          <div className="liquid-v2-divider" />

          <button
            onClick={onMenuClick}
            onMouseEnter={() => setHoveredIndex(4)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="liquid-v2-item"
          >
            <div className={`liquid-v2-pill ${hoveredIndex === 4 ? 'hovered' : ''}`}>
              <Menu className="w-5 h-5" />
              <span className={`liquid-v2-text ${hoveredIndex === 4 ? 'show' : ''}`}>Menu</span>
            </div>
          </button>
        </div>
      </LiquidGlass>

      <style jsx global>{`
        .liquid-v2-container {
          border-radius: 36px;
          background: rgba(255, 255, 255, 0.82);
          border: 2px solid rgba(255, 255, 255, 0.6);
          box-shadow: 
            0 24px 72px rgba(0, 0, 0, 0.16),
            0 8px 32px rgba(0, 0, 0, 0.1),
            inset 0 2px 4px rgba(255, 255, 255, 1),
            inset 0 -1px 2px rgba(0, 0, 0, 0.02);
          position: relative;
          overflow: hidden;
        }

        .liquid-v2-container::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 50% 0%,
            rgba(255, 255, 255, 0.6),
            transparent 70%
          );
          pointer-events: none;
        }

        .liquid-v2-item {
          transition: all 0.3s ease;
        }

        .liquid-v2-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 24px;
          color: #374151;
          background: transparent;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }

        .liquid-v2-pill::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 24px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .liquid-v2-pill.hovered::before {
          opacity: 1;
        }

        .liquid-v2-pill.active {
          background: linear-gradient(135deg, rgba(212, 32, 39, 0.15), rgba(212, 32, 39, 0.1));
          color: #d42027;
          box-shadow: 
            inset 0 2px 12px rgba(212, 32, 39, 0.12),
            0 0 0 1px rgba(212, 32, 39, 0.15);
        }

        .liquid-v2-pill.hovered {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .liquid-v2-text {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: -0.01em;
          opacity: 0;
          max-width: 0;
          overflow: hidden;
          white-space: nowrap;
          transition: all 0.3s ease;
        }

        .liquid-v2-text.show {
          opacity: 1;
          max-width: 100px;
        }

        .liquid-v2-divider {
          width: 1.5px;
          height: 36px;
          background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.1) 30%, rgba(0, 0, 0, 0.1) 70%, transparent);
          margin: 0 4px;
        }
      `}</style>
    </nav>
  );
}
