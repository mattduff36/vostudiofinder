'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, User } from 'lucide-react';
import { Session } from 'next-auth';
import { LiquidGlass } from '@specy/liquid-glass-react';

interface VisionOSGlassNavProps {
  mode: 'static' | 'auto-hide' | 'minimal';
  session: Session | null;
  onMenuClick: () => void;
}

export function VisionOSGlassNav({ mode, session, onMenuClick }: VisionOSGlassNavProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  if (mode === 'minimal') {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="relative">
          {isExpanded && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-max">
              <LiquidGlass 
                glassStyle={{
                  intensity: 1.4,
                  blur: 36,
                  saturation: 2.2,
                }}
                style="visionos-expanded-container"
              >
                <div className="flex gap-3 p-3">
                  {navItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className="visionos-expanded-item"
                          style={{
                            animation: `visionosFadeIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.08}s both`,
                          }}
                        >
                          <div className={`visionos-exp-icon ${item.active ? 'active' : ''}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <span className="visionos-exp-label">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </LiquidGlass>
            </div>
          )}

          <button onClick={() => setIsExpanded(!isExpanded)}>
            <LiquidGlass 
              glassStyle={{
                intensity: 1.5,
                blur: 40,
                saturation: 2.3,
              }}
              style="visionos-orb"
            >
              <div className="visionos-orb-inner">
                <Menu className={`w-7 h-7 z-10 relative transition-all duration-500 ${isExpanded ? 'rotate-180 scale-90' : ''}`} />
                <div className="visionos-orb-shine" />
                <div className="visionos-orb-pulse" />
              </div>
            </LiquidGlass>
          </button>
        </div>

        <style jsx global>{`
          @keyframes visionosFadeIn {
            from {
              opacity: 0;
              transform: scale(0.8) translateY(20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          @keyframes visionosPulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.5;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.8;
            }
          }

          .visionos-expanded-container {
            border-radius: 32px;
            background: rgba(255, 255, 255, 0.88);
            border: 2px solid rgba(255, 255, 255, 0.7);
            box-shadow: 
              0 28px 88px rgba(0, 0, 0, 0.2),
              0 10px 40px rgba(0, 0, 0, 0.15),
              inset 0 2px 6px rgba(255, 255, 255, 1),
              inset 0 0 60px rgba(255, 255, 255, 0.3);
            position: relative;
            overflow: hidden;
          }

          .visionos-expanded-container::before {
            content: '';
            position: absolute;
            inset: -50%;
            background: radial-gradient(circle, rgba(212, 32, 39, 0.08), transparent 70%);
            animation: visionosPulse 3s ease-in-out infinite;
          }

          .visionos-expanded-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 12px;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            cursor: pointer;
          }

          .visionos-expanded-item:hover {
            transform: translateY(-4px);
          }

          .visionos-exp-icon {
            width: 58px;
            height: 58px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 18px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.5));
            border: 1.5px solid rgba(255, 255, 255, 0.8);
            box-shadow: 
              0 8px 28px rgba(0, 0, 0, 0.12),
              inset 0 1px 3px rgba(255, 255, 255, 1);
            color: #1f2937;
            transition: all 0.3s ease;
          }

          .visionos-exp-icon.active {
            background: linear-gradient(135deg, rgba(212, 32, 39, 0.2), rgba(212, 32, 39, 0.15));
            border-color: rgba(212, 32, 39, 0.3);
            color: #d42027;
            box-shadow: 
              0 8px 28px rgba(212, 32, 39, 0.2),
              inset 0 1px 3px rgba(255, 255, 255, 1),
              inset 0 0 20px rgba(212, 32, 39, 0.1);
          }

          .visionos-exp-icon:hover {
            transform: scale(1.1) rotate(5deg);
            box-shadow: 
              0 12px 40px rgba(0, 0, 0, 0.18),
              inset 0 1px 3px rgba(255, 255, 255, 1);
          }

          .visionos-exp-label {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #1f2937;
          }

          .visionos-orb {
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.85));
            border: 3px solid rgba(255, 255, 255, 0.8);
            box-shadow: 
              0 24px 88px rgba(0, 0, 0, 0.22),
              0 10px 40px rgba(0, 0, 0, 0.16),
              inset 0 2px 6px rgba(255, 255, 255, 1),
              inset 0 0 80px rgba(255, 255, 255, 0.4);
            transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            color: #1f2937;
            position: relative;
            overflow: visible;
          }

          .visionos-orb:hover {
            transform: scale(1.15);
            box-shadow: 
              0 32px 112px rgba(0, 0, 0, 0.28),
              0 14px 56px rgba(0, 0, 0, 0.20),
              inset 0 2px 6px rgba(255, 255, 255, 1),
              inset 0 0 100px rgba(255, 255, 255, 0.5);
          }

          .visionos-orb:active {
            transform: scale(1.05);
          }

          .visionos-orb-inner {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .visionos-orb-shine {
            position: absolute;
            top: -20%;
            left: -20%;
            right: -20%;
            height: 60%;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.6), transparent);
            border-radius: 50%;
            filter: blur(10px);
            pointer-events: none;
          }

          .visionos-orb-pulse {
            position: absolute;
            inset: -60px;
            background: radial-gradient(circle, rgba(212, 32, 39, 0.15), transparent 60%);
            opacity: 0;
            animation: visionosPulse 3s ease-in-out infinite;
            pointer-events: none;
          }
        `}</style>
      </div>
    );
  }

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 flex justify-center transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
      }}
      onMouseMove={handleMouseMove}
    >
      <LiquidGlass 
        glassStyle={{
          intensity: 1.3,
          blur: 36,
          saturation: 2.1,
        }}
        style="visionos-nav-container"
      >
        <div
          className="visionos-specular"
          style={{
            background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.4), transparent 40%)`,
          }}
        />

        <div className="flex items-center gap-2 px-4 py-3 relative z-10">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="visionos-nav-item">
                <div className={`visionos-item-glass ${item.active ? 'active' : ''}`}>
                  <div className="visionos-icon-sphere">
                    <Icon className="w-6 h-6" />
                    {item.active && <div className="visionos-active-glow" />}
                  </div>
                  <span className="visionos-item-label">{item.label}</span>
                </div>
              </Link>
            );
          })}

          <div className="visionos-separator" />

          <button onClick={onMenuClick} className="visionos-nav-item">
            <div className="visionos-item-glass">
              <div className="visionos-icon-sphere">
                <Menu className="w-6 h-6" />
              </div>
              <span className="visionos-item-label">Menu</span>
            </div>
          </button>
        </div>
      </LiquidGlass>

      <style jsx global>{`
        .visionos-nav-container {
          border-radius: 40px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.82) 100%);
          border: 2.5px solid rgba(255, 255, 255, 0.7);
          box-shadow: 
            0 32px 96px rgba(0, 0, 0, 0.18),
            0 12px 48px rgba(0, 0, 0, 0.12),
            inset 0 3px 8px rgba(255, 255, 255, 1),
            inset 0 0 80px rgba(255, 255, 255, 0.3),
            inset 0 -2px 4px rgba(0, 0, 0, 0.02);
          position: relative;
          overflow: hidden;
        }

        .visionos-nav-container::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.5), transparent 60%);
          pointer-events: none;
        }

        .visionos-specular {
          position: absolute;
          inset: 0;
          pointer-events: none;
          transition: background 0.1s ease;
        }

        .visionos-nav-item {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .visionos-item-glass {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 14px 18px;
          border-radius: 28px;
          background: transparent;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
        }

        .visionos-item-glass::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.4));
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .visionos-nav-item:hover .visionos-item-glass {
          transform: translateY(-6px);
        }

        .visionos-nav-item:hover .visionos-item-glass::before {
          opacity: 1;
        }

        .visionos-item-glass.active {
          background: linear-gradient(135deg, rgba(212, 32, 39, 0.18), rgba(212, 32, 39, 0.12));
          box-shadow: 
            inset 0 2px 16px rgba(212, 32, 39, 0.15),
            0 0 0 1.5px rgba(212, 32, 39, 0.2),
            0 8px 28px rgba(212, 32, 39, 0.15);
        }

        .visionos-icon-sphere {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.6));
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.08),
            inset 0 2px 4px rgba(255, 255, 255, 1),
            inset 0 0 40px rgba(255, 255, 255, 0.4);
          color: #374151;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: visible;
        }

        .visionos-icon-sphere::before {
          content: '';
          position: absolute;
          top: -30%;
          left: -30%;
          right: -30%;
          height: 80%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.8), transparent);
          border-radius: 50%;
          filter: blur(8px);
          pointer-events: none;
        }

        .visionos-item-glass.active .visionos-icon-sphere {
          background: linear-gradient(135deg, rgba(212, 32, 39, 0.25), rgba(212, 32, 39, 0.18));
          border-color: rgba(212, 32, 39, 0.4);
          color: #d42027;
          box-shadow: 
            0 8px 32px rgba(212, 32, 39, 0.2),
            inset 0 2px 4px rgba(255, 255, 255, 1),
            inset 0 0 40px rgba(212, 32, 39, 0.15);
        }

        .visionos-nav-item:hover .visionos-icon-sphere {
          transform: scale(1.12) rotate(8deg);
          box-shadow: 
            0 12px 48px rgba(0, 0, 0, 0.14),
            inset 0 2px 4px rgba(255, 255, 255, 1),
            inset 0 0 40px rgba(255, 255, 255, 0.5);
        }

        .visionos-active-glow {
          position: absolute;
          inset: -20px;
          background: radial-gradient(circle, rgba(212, 32, 39, 0.3), transparent 60%);
          animation: visionosPulse 2s ease-in-out infinite;
          pointer-events: none;
        }

        .visionos-item-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: #374151;
          transition: all 0.3s ease;
        }

        .visionos-item-glass.active .visionos-item-label {
          color: #d42027;
        }

        .visionos-separator {
          width: 2px;
          height: 48px;
          background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.12) 30%, rgba(0, 0, 0, 0.12) 70%, transparent);
          margin: 0 6px;
        }
      `}</style>
    </nav>
  );
}
