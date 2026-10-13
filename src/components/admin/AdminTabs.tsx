'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useScrollDrivenNav } from '@/hooks/useScrollDrivenNav';
import { 
  TrendingUp, 
  Building, 
  Activity, 
  MessageSquare,
  Users,
  CreditCard,
  Clock,
  AlertTriangle,
  Menu,
  X,
  Mail,
  Lightbulb,
  Sparkles,
  FileText
} from 'lucide-react';

export type AdminTab = 'overview' | 'studios' | 'analytics' | 'faq' | 'waitlist' | 'suggestions' | 'payments' | 'reservations' | 'error_log' | 'emails' | 'sandbox' | 'platform_updates' | 'message_templates';

interface AdminTabsProps {
  activeTab: AdminTab;
}

interface TabConfig {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

// Main tabs that stay visible in the navbar
const mainTabs: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: TrendingUp, href: '/admin' },
  { id: 'studios', label: 'Studios', icon: Building, href: '/admin/studios' },
  { id: 'payments', label: 'Payments', icon: CreditCard, href: '/admin/payments' },
  { id: 'reservations', label: 'Reservations', icon: Clock, href: '/admin/reservations' },
  { id: 'waitlist', label: 'Waiting List', icon: Users, href: '/admin/waitlist' },
  { id: 'suggestions', label: 'Suggestions', icon: Lightbulb, href: '/admin/suggestions' },
  { id: 'faq', label: 'FAQ', icon: MessageSquare, href: '/admin/faq' },
];

// Secondary tabs that go in the burger menu
const secondaryTabs: TabConfig[] = [
  { id: 'platform_updates', label: "What's New", icon: Sparkles, href: '/admin/platform-updates' },
  { id: 'emails', label: 'Emails', icon: Mail, href: '/admin/emails' },
  { id: 'message_templates', label: 'Msg Templates', icon: FileText, href: '/admin/message-templates' },
  { id: 'analytics', label: 'Analytics', icon: Activity, href: '/admin/analytics' },
  { id: 'error_log', label: 'Error Log', icon: AlertTriangle, href: '/admin/error-log' },
  { id: 'sandbox', label: 'Sandbox', icon: Lightbulb, href: '/admin/sandbox' },
];

// All tabs combined for mobile menu
const allTabs: TabConfig[] = [...mainTabs, ...secondaryTabs];

export function AdminTabs({ activeTab }: AdminTabsProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopBurgerOpen, setIsDesktopBurgerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuBtnRef = useRef<HTMLButtonElement>(null);
  const desktopBurgerRef = useRef<HTMLDivElement>(null);
  const desktopBurgerBtnRef = useRef<HTMLButtonElement>(null);
  
  // Check if we're on mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsDesktopBurgerOpen(false);
      else setIsMobileMenuOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Mobile-only: Smooth scroll-driven animation to sync with top navbar
  const { translateY: navTranslateY } = useScrollDrivenNav({ 
    navHeight: 72, // Mobile navbar height (4.5rem = 72px)
    scrollThreshold: 3,
    enabled: isMobile
  });

  useEffect(() => {
    if (!isDesktopBurgerOpen && !isMobileMenuOpen) return;
    const panel = isDesktopBurgerOpen ? desktopBurgerRef.current : mobileMenuRef.current;
    const trigger = isDesktopBurgerOpen ? desktopBurgerBtnRef.current : mobileMenuBtnRef.current;
    panel?.querySelector<HTMLElement>('a')?.focus();
    const close = () => { setIsDesktopBurgerOpen(false); setIsMobileMenuOpen(false); };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel?.contains(event.target) && !trigger?.contains(event.target)) close();
    };
    const key = (event: KeyboardEvent) => {
      // A dialog opened above this menu owns its own Escape key.
      if (event.key === 'Escape' && (panel?.contains(document.activeElement) || document.activeElement === trigger)) {
        event.preventDefault(); event.stopPropagation(); close(); trigger?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); };
  }, [isDesktopBurgerOpen, isMobileMenuOpen]);

  return (
    <>
      {/* Desktop Tabs - With burger menu on left */}
      <div className="hidden md:block sticky top-[72px] z-50 bg-red-600 border-b border-red-700">
        <nav className="relative flex items-center justify-center px-6" aria-label="Admin tabs">
          {/* Burger Menu Button - RIGHT side (under main navbar burger) */}
          <div className="absolute right-6 top-0 bottom-0 flex items-center">
            <button
              ref={desktopBurgerBtnRef}
              onClick={() => setIsDesktopBurgerOpen(!isDesktopBurgerOpen)}
              className="flex items-center justify-center p-2 rounded-lg border-2 border-white/30 text-white hover:bg-red-700 hover:border-white transition-all duration-300 w-10 h-10"
              aria-label="More admin pages"
              aria-expanded={isDesktopBurgerOpen}
              aria-controls="admin-desktop-menu"
              title="More options"
            >
              {isDesktopBurgerOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Main Navigation Tabs - CENTER */}
          <div className="flex max-w-full space-x-8 overflow-x-auto md:mr-14 xl:mr-0">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`
                    flex shrink-0 items-center gap-2 py-4 px-2 font-medium text-sm transition-colors
                    ${isActive
                      ? 'border-b-[6px] border-white text-white'
                      : 'border-b-4 border-transparent text-white hover:text-white hover:border-b-[5px] hover:border-red-400'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Desktop Burger Menu Dropdown */}
      {isDesktopBurgerOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="hidden md:block fixed inset-0 bg-black/30 z-[99]"
            onClick={() => setIsDesktopBurgerOpen(false)}
          />
          
          {/* Menu Panel */}
          <div 
            ref={desktopBurgerRef}
            className="hidden md:block fixed top-[136px] right-6 z-[110] w-56 max-h-[calc(100dvh-152px)] overflow-y-auto bg-red-600 rounded-lg shadow-xl border border-red-700"
            id="admin-desktop-menu"
            aria-label="More admin pages"
          >
            <div className="py-2">
              {secondaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    onNavigate={() => setIsDesktopBurgerOpen(false)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-red-700 text-white'
                        : 'text-white hover:bg-red-700 active:bg-red-800'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Mobile Tabs - Syncs with navbar scroll animation */}
      <div 
        className="md:hidden sticky top-[72px] z-50 bg-red-600 border-b border-red-700"
        style={isMobile ? {
          transform: `translateY(-${navTranslateY}px)`,
          transition: 'none', // Let scroll drive the animation
        } : undefined}
      >
        <div className="px-4 py-3">
          <button
            ref={mobileMenuBtnRef}
            aria-expanded={isMobileMenuOpen}
            aria-controls="admin-mobile-menu"
            aria-label="Admin pages"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-full flex items-center justify-between text-left font-medium text-white"
          >
            <span className="flex items-center gap-2">
              {allTabs.find(t => t.id === activeTab)?.icon && 
                (() => {
                  const Icon = allTabs.find(t => t.id === activeTab)!.icon;
                  return <Icon className="w-5 h-5" />;
                })()
              }
              {allTabs.find(t => t.id === activeTab)?.label}
            </span>
            <svg
              className={`w-5 h-5 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div ref={mobileMenuRef} id="admin-mobile-menu" aria-label="Admin pages" className="max-h-[calc(100dvh-140px)] overflow-y-auto border-t border-red-700">
            {allTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  onNavigate={() => setIsMobileMenuOpen(false)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                    ${isActive
                      ? 'bg-red-700 text-white font-medium'
                      : 'text-white hover:bg-red-700'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

