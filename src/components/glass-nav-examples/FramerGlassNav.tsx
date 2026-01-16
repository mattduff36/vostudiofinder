'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, LayoutDashboard, Menu, User } from 'lucide-react';
import { Session } from 'next-auth';
import { motion, AnimatePresence } from 'framer-motion';

interface FramerGlassNavProps {
  mode: 'static' | 'auto-hide' | 'minimal';
  session: Session | null;
  onMenuClick: () => void;
}

export function FramerGlassNav({ mode, session, onMenuClick }: FramerGlassNavProps) {
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

  const springConfig = {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
  };

  const softSpring = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 25,
  };

  if (mode === 'minimal') {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="relative flex items-center justify-center">
          {/* Expanded nav items in a circle */}
          <AnimatePresence>
            {isExpanded && (
              <>
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const angle = (index * 360) / navItems.length - 90;
                  const radius = 90;
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;

                  return (
                    <motion.div
                      key={item.href}
                      initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                      animate={{ scale: 1, x, y, opacity: 1 }}
                      exit={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                      transition={{
                        ...springConfig,
                        delay: index * 0.05,
                      }}
                      className="absolute"
                    >
                      <Link href={item.href}>
                        <motion.div
                          whileHover={{ scale: 1.15, rotate: 5 }}
                          whileTap={{ scale: 0.9, rotate: -5 }}
                          className="framer-minimal-item"
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              item.active ? 'text-[#d42027]' : 'text-gray-700'
                            }`}
                          />
                        </motion.div>
                      </Link>
                    </motion.div>
                  );
                })}
              </>
            )}
          </AnimatePresence>

          {/* Center button */}
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{ rotate: isExpanded ? 135 : 0 }}
            transition={springConfig}
            className="framer-center-button"
          >
            <Menu className="w-6 h-6" />
          </motion.button>
        </div>

        <style jsx>{`
          .framer-minimal-item {
            width: 54px;
            height: 54px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.4);
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.12),
              0 2px 8px rgba(0, 0, 0, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.6);
          }

          .framer-center-button {
            width: 64px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.5);
            box-shadow: 
              0 12px 40px rgba(0, 0, 0, 0.15),
              0 4px 12px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.8);
            color: #1f2937;
            position: relative;
            z-index: 10;
          }
        `}</style>
      </div>
    );
  }

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: isVisible ? 0 : 100 }}
      transition={softSpring}
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        padding: '0 max(env(safe-area-inset-left), 1rem) env(safe-area-inset-bottom) max(env(safe-area-inset-right), 1rem)',
      }}
    >
      <div className="mx-auto max-w-lg mb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={softSpring}
          className="framer-glass-nav"
        >
          <div className="flex items-center justify-around h-20 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex-1">
                  <motion.div
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.92, y: 0 }}
                    transition={springConfig}
                    className="flex flex-col items-center gap-2"
                  >
                    <motion.div
                      className="relative"
                      animate={
                        item.active
                          ? {
                              scale: [1, 1.1, 1],
                              transition: { repeat: Infinity, duration: 2 },
                            }
                          : {}
                      }
                    >
                      <motion.div
                        className={`framer-icon-wrapper ${item.active ? 'active' : ''}`}
                        whileHover={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.4 }}
                      >
                        <Icon className="w-6 h-6" />
                      </motion.div>

                      {/* Active indicator with animation */}
                      <AnimatePresence>
                        {item.active && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={springConfig}
                            className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                          >
                            <motion.div
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 2,
                              }}
                              className="w-10 h-1 bg-[#d42027] rounded-full"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    <motion.span
                      className={`text-xs font-medium ${
                        item.active ? 'text-[#d42027]' : 'text-gray-700'
                      }`}
                      animate={item.active ? { fontWeight: 700 } : { fontWeight: 500 }}
                    >
                      {item.label}
                    </motion.span>
                  </motion.div>
                </Link>
              );
            })}

            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onMenuClick();
              }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.92, y: 0 }}
              transition={springConfig}
              className="flex-1"
            >
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  className="framer-icon-wrapper"
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  <Menu className="w-6 h-6" />
                </motion.div>
                <span className="text-xs font-medium text-gray-700">Menu</span>
              </div>
            </motion.button>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        .framer-glass-nav {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(255, 255, 255, 0.88) 100%
          );
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-radius: 28px;
          border: 1.5px solid rgba(255, 255, 255, 0.3);
          box-shadow: 
            0 16px 48px rgba(0, 0, 0, 0.12),
            0 6px 20px rgba(0, 0, 0, 0.08),
            0 0 0 1px rgba(0, 0, 0, 0.02),
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            inset 0 -1px 0 rgba(0, 0, 0, 0.03);
          position: relative;
          overflow: hidden;
        }

        .framer-glass-nav::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 50% 0%,
            rgba(255, 255, 255, 0.5),
            transparent 70%
          );
          pointer-events: none;
        }

        .framer-glass-nav::after {
          content: '';
          position: absolute;
          top: 0;
          left: 10%;
          right: 10%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.8) 50%,
            transparent
          );
        }

        .framer-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          color: #1f2937;
          transition: all 0.3s ease;
        }

        .framer-icon-wrapper.active {
          background: rgba(212, 32, 39, 0.1);
          color: #d42027;
          box-shadow: 
            inset 0 2px 12px rgba(212, 32, 39, 0.12),
            0 0 0 1px rgba(212, 32, 39, 0.08);
        }
      `}</style>
    </motion.nav>
  );
}
