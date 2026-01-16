'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, User } from 'lucide-react';
import { Session } from 'next-auth';

interface FloatingPillGlassNavProps {
  mode: 'static' | 'auto-hide' | 'minimal';
  session: Session | null;
  onMenuClick: () => void;
}

export function FloatingPillGlassNav({ mode, session, onMenuClick }: FloatingPillGlassNavProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activePress, setActivePress] = useState<number | null>(null);

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
    setActivePress(index);
    setTimeout(() => setActivePress(null), 200);
  };

  if (mode === 'minimal') {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="relative flex items-center gap-2">
          {/* Expandable items */}
          <div
            className={`flex gap-2 transition-all duration-500 ease-out ${
              isExpanded
                ? 'opacity-100 scale-100 translate-x-0'
                : 'opacity-0 scale-75 translate-x-8 pointer-events-none'
            }`}
          >
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handlePress(index)}
                  className="pill-minimal-item"
                  style={{
                    transitionDelay: isExpanded ? `${index * 50}ms` : '0ms',
                  }}
                >
                  <Icon className={`w-5 h-5 ${item.active ? 'text-[#d42027]' : 'text-gray-700'}`} />
                </Link>
              );
            })}
          </div>

          {/* Toggle button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`pill-toggle-button ${isExpanded ? 'expanded' : ''}`}
          >
            <Menu className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
            {!isExpanded && <span className="ml-2 text-sm font-medium">Menu</span>}
          </button>
        </div>

        <style jsx>{`
          .pill-minimal-item {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(16px) saturate(180%);
            -webkit-backdrop-filter: blur(16px) saturate(180%);
            border-radius: 24px;
            border: 1.5px solid rgba(255, 255, 255, 0.4);
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.08),
              0 4px 16px rgba(0, 0, 0, 0.04),
              0 0 0 1px rgba(0, 0, 0, 0.02),
              inset 0 1px 0 rgba(255, 255, 255, 0.8);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .pill-minimal-item:hover {
            transform: translateY(-4px) scale(1.1);
            box-shadow: 
              0 16px 48px rgba(0, 0, 0, 0.12),
              0 8px 24px rgba(0, 0, 0, 0.08),
              0 0 0 1px rgba(0, 0, 0, 0.02),
              inset 0 1px 0 rgba(255, 255, 255, 0.9);
          }

          .pill-minimal-item:active {
            transform: translateY(-2px) scale(0.95);
          }

          .pill-toggle-button {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 20px;
            height: 48px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
            backdrop-filter: blur(16px) saturate(180%);
            -webkit-backdrop-filter: blur(16px) saturate(180%);
            border-radius: 24px;
            border: 1.5px solid rgba(255, 255, 255, 0.4);
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.12),
              0 4px 16px rgba(0, 0, 0, 0.06),
              0 0 0 1px rgba(0, 0, 0, 0.03),
              inset 0 1px 0 rgba(255, 255, 255, 0.8);
            color: #1f2937;
            font-weight: 500;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            min-width: 48px;
          }

          .pill-toggle-button.expanded {
            padding: 0;
            width: 48px;
          }

          .pill-toggle-button:hover {
            transform: translateY(-4px);
            box-shadow: 
              0 16px 48px rgba(0, 0, 0, 0.15),
              0 8px 24px rgba(0, 0, 0, 0.1),
              0 0 0 1px rgba(0, 0, 0, 0.03),
              inset 0 1px 0 rgba(255, 255, 255, 0.9);
          }

          .pill-toggle-button:active {
            transform: translateY(-2px) scale(0.95);
          }
        `}</style>
      </div>
    );
  }

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 flex justify-center transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
      }}
    >
      <div className="pill-nav-container">
        <div className="pill-glass-nav">
          <div className="flex items-center gap-1 px-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onMouseDown={() => handlePress(index)}
                  onTouchStart={() => handlePress(index)}
                  className="pill-nav-item"
                >
                  <div
                    className={`pill-icon-container ${
                      item.active ? 'active' : ''
                    } ${hoveredIndex === index ? 'hovered' : ''} ${
                      activePress === index ? 'pressed' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`pill-label ${item.active ? 'active' : ''} ${
                      hoveredIndex === index ? 'show' : ''
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}

            <div className="pill-divider" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePress(4);
                onMenuClick();
              }}
              onMouseEnter={() => setHoveredIndex(4)}
              onMouseLeave={() => setHoveredIndex(null)}
              onMouseDown={() => handlePress(4)}
              onTouchStart={() => handlePress(4)}
              className="pill-nav-item"
            >
              <div
                className={`pill-icon-container ${hoveredIndex === 4 ? 'hovered' : ''} ${
                  activePress === 4 ? 'pressed' : ''
                }`}
              >
                <Menu className="w-5 h-5" />
              </div>
              <span className={`pill-label ${hoveredIndex === 4 ? 'show' : ''}`}>Menu</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pill-nav-container {
          position: relative;
          padding: 12px;
        }

        .pill-glass-nav {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(255, 255, 255, 0.85) 100%
          );
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-radius: 32px;
          border: 1.5px solid rgba(255, 255, 255, 0.4);
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.15),
            0 8px 24px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(0, 0, 0, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            inset 0 -1px 0 rgba(0, 0, 0, 0.02);
          position: relative;
          overflow: hidden;
          padding: 8px;
        }

        .pill-glass-nav::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 50% 0%,
            rgba(255, 255, 255, 0.4),
            transparent 60%
          );
          pointer-events: none;
        }

        .pill-glass-nav::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.2) 0%,
            transparent 50%,
            rgba(0, 0, 0, 0.02) 100%
          );
          pointer-events: none;
        }

        .pill-nav-item {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          color: #1f2937;
          -webkit-tap-highlight-color: transparent;
          transition: all 0.2s ease;
        }

        .pill-icon-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 22px;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          background: transparent;
        }

        .pill-icon-container.active {
          background: rgba(212, 32, 39, 0.12);
          color: #d42027;
          box-shadow: 
            inset 0 2px 8px rgba(212, 32, 39, 0.1),
            0 0 0 1px rgba(212, 32, 39, 0.1);
        }

        .pill-icon-container.hovered:not(.active) {
          background: rgba(0, 0, 0, 0.04);
          transform: scale(1.1);
        }

        .pill-icon-container.pressed {
          transform: scale(0.9);
          background: rgba(0, 0, 0, 0.08);
        }

        .pill-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.02em;
          transition: all 0.2s ease;
          opacity: 0;
          transform: translateY(-4px);
          max-height: 0;
        }

        .pill-label.show {
          opacity: 1;
          transform: translateY(0);
          max-height: 20px;
        }

        .pill-label.active {
          color: #d42027;
          opacity: 1;
          transform: translateY(0);
          max-height: 20px;
        }

        .pill-divider {
          width: 1px;
          height: 32px;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(0, 0, 0, 0.1) 30%,
            rgba(0, 0, 0, 0.1) 70%,
            transparent
          );
          margin: 0 4px;
        }
      `}</style>
    </nav>
  );
}
