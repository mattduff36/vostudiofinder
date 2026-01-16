'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, User } from 'lucide-react';
import { Session } from 'next-auth';

interface AceternityGlassNavProps {
  mode: 'static' | 'auto-hide' | 'minimal';
  session: Session | null;
  onMenuClick: () => void;
}

export function AceternityGlassNav({ mode, session, onMenuClick }: AceternityGlassNavProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [_mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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

  useEffect(() => {
    const activeIdx = navItems.findIndex((item) => item.active);
    if (activeIdx !== -1) setActiveIndex(activeIdx);
  }, [pathname]);

  const handleMouseMove = (e: React.MouseEvent, _index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  if (mode === 'minimal') {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="relative">
          {/* Floating menu */}
          {isExpanded && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 mb-4">
              <div className="aceternity-minimal-container">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="aceternity-minimal-item"
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      <div className={`aceternity-minimal-icon ${item.active ? 'active' : ''}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="aceternity-minimal-label">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="aceternity-toggle"
          >
            <div className={`aceternity-toggle-icon ${isExpanded ? 'expanded' : ''}`}>
              <Menu className="w-6 h-6" />
            </div>
            <div className="aceternity-toggle-glow" />
          </button>
        </div>

        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .aceternity-minimal-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
            animation: fadeInUp 0.3s ease-out;
          }

          .aceternity-minimal-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.95) 0%,
              rgba(255, 255, 255, 0.85) 100%
            );
            backdrop-filter: blur(24px) saturate(200%);
            -webkit-backdrop-filter: blur(24px) saturate(200%);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.5);
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.1),
              0 4px 16px rgba(0, 0, 0, 0.05),
              inset 0 1px 1px rgba(255, 255, 255, 0.9),
              inset 0 -1px 1px rgba(0, 0, 0, 0.02);
            color: #1f2937;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            animation: fadeInUp 0.4s ease-out backwards;
          }

          .aceternity-minimal-item::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(
              135deg,
              rgba(212, 32, 39, 0) 0%,
              rgba(212, 32, 39, 0.05) 100%
            );
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .aceternity-minimal-item:hover {
            transform: translateX(-8px) scale(1.02);
            box-shadow: 
              0 12px 48px rgba(0, 0, 0, 0.15),
              0 6px 24px rgba(0, 0, 0, 0.08),
              inset 0 1px 1px rgba(255, 255, 255, 1);
          }

          .aceternity-minimal-item:hover::before {
            opacity: 1;
          }

          .aceternity-minimal-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: rgba(0, 0, 0, 0.03);
            transition: all 0.3s ease;
          }

          .aceternity-minimal-icon.active {
            background: linear-gradient(135deg, rgba(212, 32, 39, 0.15), rgba(212, 32, 39, 0.1));
            color: #d42027;
            box-shadow: inset 0 2px 8px rgba(212, 32, 39, 0.1);
          }

          .aceternity-minimal-label {
            font-size: 14px;
            font-weight: 600;
            letter-spacing: -0.01em;
          }

          .aceternity-toggle {
            position: relative;
            width: 68px;
            height: 68px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.98) 0%,
              rgba(255, 255, 255, 0.9) 100%
            );
            backdrop-filter: blur(24px) saturate(200%);
            -webkit-backdrop-filter: blur(24px) saturate(200%);
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.6);
            box-shadow: 
              0 16px 56px rgba(0, 0, 0, 0.15),
              0 6px 24px rgba(0, 0, 0, 0.1),
              inset 0 1px 2px rgba(255, 255, 255, 1),
              inset 0 -1px 2px rgba(0, 0, 0, 0.03);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .aceternity-toggle:hover {
            transform: scale(1.08);
            box-shadow: 
              0 20px 72px rgba(0, 0, 0, 0.2),
              0 8px 32px rgba(0, 0, 0, 0.12),
              inset 0 1px 2px rgba(255, 255, 255, 1);
          }

          .aceternity-toggle:active {
            transform: scale(0.96);
          }

          .aceternity-toggle-icon {
            position: relative;
            z-index: 2;
            color: #1f2937;
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .aceternity-toggle-icon.expanded {
            transform: rotate(180deg);
          }

          .aceternity-toggle-glow {
            position: absolute;
            inset: -20px;
            background: radial-gradient(
              circle,
              rgba(212, 32, 39, 0.15) 0%,
              transparent 70%
            );
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .aceternity-toggle:hover .aceternity-toggle-glow {
            opacity: 1;
          }
        `}</style>
      </div>
    );
  }

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
      style={{
        padding: '0 max(env(safe-area-inset-left), 1rem) calc(env(safe-area-inset-bottom) + 1rem) max(env(safe-area-inset-right), 1rem)',
      }}
    >
      <div className="mx-auto max-w-2xl">
        <div className="aceternity-glass-nav">
          {/* Animated background gradient */}
          <div className="aceternity-bg-gradient" />
          
          {/* Active indicator slider */}
          <div
            className="aceternity-active-slider"
            style={{
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />

          <div className="flex items-center relative z-10">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseMove={(e) => handleMouseMove(e, index)}
                  onClick={() => setActiveIndex(index)}
                  className="aceternity-nav-item"
                >
                  <div className={`aceternity-item-content ${item.active ? 'active' : ''}`}>
                    <div className="aceternity-icon-ring">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="aceternity-label">{item.label}</span>
                  </div>

                  {/* Hover spotlight effect */}
                  <div className="aceternity-spotlight" />
                </Link>
              );
            })}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onMenuClick();
              }}
              onMouseMove={(e) => handleMouseMove(e, 4)}
              className="aceternity-nav-item"
            >
              <div className="aceternity-item-content">
                <div className="aceternity-icon-ring">
                  <Menu className="w-6 h-6" />
                </div>
                <span className="aceternity-label">Menu</span>
              </div>
              <div className="aceternity-spotlight" />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .aceternity-glass-nav {
          position: relative;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(255, 255, 255, 0.88) 50%,
            rgba(255, 255, 255, 0.95) 100%
          );
          backdrop-filter: blur(28px) saturate(200%);
          -webkit-backdrop-filter: blur(28px) saturate(200%);
          border-radius: 32px;
          border: 1.5px solid rgba(255, 255, 255, 0.5);
          padding: 12px 8px;
          box-shadow: 
            0 20px 60px -12px rgba(0, 0, 0, 0.15),
            0 8px 32px -8px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(0, 0, 0, 0.02),
            inset 0 1px 2px rgba(255, 255, 255, 0.9),
            inset 0 -1px 2px rgba(0, 0, 0, 0.02);
          overflow: hidden;
        }

        .aceternity-bg-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 50% 100%,
            rgba(212, 32, 39, 0.04) 0%,
            transparent 60%
          );
          animation: pulse 4s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .aceternity-active-slider {
          position: absolute;
          top: 12px;
          left: 8px;
          width: calc(20% - 8px);
          height: calc(100% - 24px);
          background: linear-gradient(
            135deg,
            rgba(212, 32, 39, 0.12) 0%,
            rgba(212, 32, 39, 0.08) 100%
          );
          border-radius: 24px;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: inset 0 2px 12px rgba(212, 32, 39, 0.1);
        }

        .aceternity-nav-item {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 8px;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .aceternity-nav-item:hover {
          transform: translateY(-2px);
        }

        .aceternity-item-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: #4b5563;
          transition: all 0.3s ease;
        }

        .aceternity-item-content.active {
          color: #d42027;
        }

        .aceternity-icon-ring {
          display: flex;
          align-items: center;
          justify-center: center;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .aceternity-item-content.active .aceternity-icon-ring {
          background: rgba(255, 255, 255, 0.9);
          border-color: rgba(212, 32, 39, 0.2);
          box-shadow: 
            0 4px 16px rgba(212, 32, 39, 0.15),
            inset 0 1px 2px rgba(255, 255, 255, 1);
        }

        .aceternity-nav-item:hover .aceternity-icon-ring {
          transform: scale(1.08) rotate(5deg);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        }

        .aceternity-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          transition: all 0.3s ease;
        }

        .aceternity-item-content.active .aceternity-label {
          font-weight: 700;
        }

        .aceternity-spotlight {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at center,
            rgba(212, 32, 39, 0.05) 0%,
            transparent 70%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .aceternity-nav-item:hover .aceternity-spotlight {
          opacity: 1;
        }
      `}</style>
    </nav>
  );
}
