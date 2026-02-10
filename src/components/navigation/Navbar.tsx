'use client';

import { useState, useEffect, useRef } from 'react';
import { Session } from 'next-auth';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { colors } from '../home/HomePage';
import { SITE_NAME } from '@/lib/seo/site';
import { FreeBadge } from '@/components/ui/FreeBadge';
import { DashboardDropdownMenu } from './DashboardDropdownMenu';
import { DesktopBurgerMenu } from './DesktopBurgerMenu';
import { useScrollDrivenNav } from '@/hooks/useScrollDrivenNav';
import { CategoryFilterBar } from '@/components/category/CategoryFilterBar';

interface NavbarProps {
  session: Session | null;
}

export function Navbar({ session }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLogoLoading, setIsLogoLoading] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopBurgerOpen, setIsDesktopBurgerOpen] = useState(false);
  const [isBrowseDropdownOpen, setIsBrowseDropdownOpen] = useState(false);
  const [browseDropdownTop, setBrowseDropdownTop] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopBurgerRef = useRef<HTMLDivElement>(null);
  const desktopBurgerBtnRef = useRef<HTMLButtonElement>(null);
  const browseDropdownRef = useRef<HTMLDivElement>(null);
  const browseDropdownPanelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [heroHeight, setHeroHeight] = useState<number | null>(null);
  const lastWidthRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);
  
  // Track client-side mounting to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if we're on mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lock hero height on mount and update on width changes (matches HeroSection behavior)
  useEffect(() => {
    const updateHeight = () => {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      
      // Only update if:
      // 1. Initial mount (not yet initialized)
      // 2. Width changed (rotation/resize), but NOT just height change (browser UI)
      if (!hasInitializedRef.current || (lastWidthRef.current !== null && currentWidth !== lastWidthRef.current)) {
        setHeroHeight(currentHeight);
        lastWidthRef.current = currentWidth;
        hasInitializedRef.current = true;
      }
    };

    updateHeight();
    
    // Listen for resize events
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Mobile-only: Smooth scroll-driven animation for top navbar
  const { translateY: navTranslateY } = useScrollDrivenNav({ 
    navHeight: 56, // Mobile navbar height (matches top-14 = 3.5rem = 56px)
    scrollThreshold: 3,
    enabled: isMobile // Only enable on mobile
  });

  // Monitor fullscreen state for hiding nav on mobile
  useEffect(() => {
    const checkFullscreen = () => {
      setIsMapFullscreen(document.documentElement.hasAttribute('data-map-fullscreen'));
    };

    // Check initially
    checkFullscreen();

    // Create observer for attribute changes
    const observer = new MutationObserver(checkFullscreen);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-map-fullscreen']
    });

    return () => observer.disconnect();
  }, []);

  // Close desktop burger menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Don't close if clicking the button or inside the menu
      if (
        desktopBurgerRef.current && 
        !desktopBurgerRef.current.contains(target) &&
        desktopBurgerBtnRef.current &&
        !desktopBurgerBtnRef.current.contains(target)
      ) {
        setIsDesktopBurgerOpen(false);
      }
    };

    if (isDesktopBurgerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDesktopBurgerOpen]);

  // Close desktop burger menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDesktopBurgerOpen(false);
      }
    };

    if (isDesktopBurgerOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDesktopBurgerOpen]);

  // Close browse dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = !!(browseDropdownRef.current && browseDropdownRef.current.contains(target));
      const inPanel = !!(browseDropdownPanelRef.current && browseDropdownPanelRef.current.contains(target));
      if (!inTrigger && !inPanel) {
        setIsBrowseDropdownOpen(false);
      }
    };

    if (isBrowseDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBrowseDropdownOpen]);

  // Close browse dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsBrowseDropdownOpen(false);
      }
    };

    if (isBrowseDropdownOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isBrowseDropdownOpen]);

  // Cleanup close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  // Keep dropdown positioned under navbar (portal-mounted)
  useEffect(() => {
    if (!isBrowseDropdownOpen) return;

    const updateTop = () => {
      const navEl = navContainerRef.current?.closest('nav');
      if (!navEl) return;
      const rect = navEl.getBoundingClientRect();
      setBrowseDropdownTop(rect.bottom);
    };

    updateTop();
    window.addEventListener('scroll', updateTop, { passive: true });
    window.addEventListener('resize', updateTop);
    return () => {
      window.removeEventListener('scroll', updateTop);
      window.removeEventListener('resize', updateTop);
    };
  }, [isBrowseDropdownOpen]);

  // Handle scroll effect - use hero height as threshold
  useEffect(() => {
    // Don't set up scroll listeners until we have the hero height
    if (heroHeight === null) return;

    // Function to get scroll position from any scrollable element
    const getScrollPosition = () => {
      return window.scrollY || 
             document.documentElement.scrollTop || 
             document.body.scrollTop || 
             0;
    };
    
    // Set initial scroll state - use hero height as threshold
    setIsScrolled(getScrollPosition() > heroHeight);
    
    const handleScroll = () => {
      const scrollPos = getScrollPosition();
      setIsScrolled(scrollPos > heroHeight);
    };

    // Listen to scroll on multiple targets to ensure we catch it
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    
    // Also check periodically as a fallback (in case scroll events don't fire)
    const checkScrollInterval = setInterval(() => {
      const scrollPos = getScrollPosition();
      const shouldBeScrolled = scrollPos > heroHeight;
      // React will only re-render if the state actually changes
      setIsScrolled(shouldBeScrolled);
    }, 100);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      clearInterval(checkScrollInterval);
    };
  }, [heroHeight]);



  // Handle logo loading animation - stop loading when navigation completes
  useEffect(() => {
    if (isLogoLoading) {
      // Stop loading after a minimum of 300ms (smooth animation) + when pathname changes
      const timer = setTimeout(() => {
        setIsLogoLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [pathname, isLogoLoading]);

  // Handle logo click with loading animation
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLogoLoading(true);
    router.push('/');
  };

  // Browse dropdown handlers
  const openBrowseDropdown = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsBrowseDropdownOpen(true);
  };

  const closeBrowseDropdownDelayed = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    closeTimerRef.current = setTimeout(() => {
      setIsBrowseDropdownOpen(false);
    }, 1000);
  };

  const cancelCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const toggleBrowseDropdown = () => {
    if (isBrowseDropdownOpen) {
      setIsBrowseDropdownOpen(false);
    } else {
      openBrowseDropdown();
    }
  };


  const isHomePage = pathname === '/' || pathname === '/studios';

  return (
    <>
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] w-full max-w-full [.admin-modal-open_&]:hidden [.image-modal-open_&]:hidden ${
        isScrolled || !isHomePage
          ? 'bg-white/70 md:bg-white backdrop-blur-lg shadow-lg'
          : 'bg-black/30 backdrop-blur-md'
      } ${isMapFullscreen ? 'md:block hidden' : ''}`}
      style={isMobile ? {
        transform: `translateY(-${navTranslateY}px)`,
        transition: 'none', // No CSS transitions - let scroll drive the animation
      } : undefined}
    >
      <div ref={navContainerRef} className="max-w-7xl mx-auto px-6 py-4 w-full">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            onClick={handleLogoClick}
            className="relative cursor-pointer flex-shrink-0"
          >
            <div className={`relative transition-all duration-200 ${
              isLogoLoading ? 'md:scale-100 scale-95' : 'scale-100'
            }`}>
              <Image
                src={isScrolled || !isHomePage 
                  ? "/images/voiceover-studio-finder-logo-black-BIG 1.png" 
                  : "/images/voiceover-studio-finder-logo-WHITE-BIG 1.png"
                }
                alt={SITE_NAME}
                width={384}
                height={60}
                priority
                className={`transition-all duration-300 hover:opacity-80 w-[234px] sm:w-[286px] md:w-[364px] h-auto ${
                  isLogoLoading ? 'md:opacity-100 opacity-60' : 'opacity-100'
                }`}
              />
            </div>
          </Link>
          
          {/* Desktop Navigation - Flex centered - Hidden on tablet, shown on desktop */}
          <div className="hidden lg:flex items-center space-x-8 flex-1 justify-center">
            {/* Browse Studios with dropdown */}
            <div
              ref={browseDropdownRef}
              className="relative"
              onMouseEnter={() => {
                cancelCloseTimer();
                openBrowseDropdown();
              }}
              onMouseLeave={closeBrowseDropdownDelayed}
            >
              {/* Trigger: Link + Chevron button */}
              <div className="flex items-center gap-1">
                <Link 
                  href="/studios" 
                  onClick={() => setIsBrowseDropdownOpen(false)}
                  className={`transition-colors ${pathname === '/studios' ? 'font-semibold' : ''}`}
                  style={{ 
                    color: isScrolled || !isHomePage ? colors.textSecondary : '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = isScrolled || !isHomePage ? colors.primary : 'rgba(255, 255, 255, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isScrolled || !isHomePage ? colors.textSecondary : '#ffffff';
                  }}
                >
                  Browse Studios
                </Link>
                <button
                  type="button"
                  onClick={toggleBrowseDropdown}
                  className="p-0.5 rounded transition-colors"
                  style={{
                    color: isScrolled || !isHomePage ? colors.textSecondary : '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = isScrolled || !isHomePage ? colors.primary : 'rgba(255, 255, 255, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isScrolled || !isHomePage ? colors.textSecondary : '#ffffff';
                  }}
                  aria-label="Toggle studio categories"
                  aria-expanded={isBrowseDropdownOpen}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isBrowseDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Tablet/Desktop Burger Menu for Public Users - Only shown when NOT logged in */}
          {!session && (
            <div className="hidden md:flex lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`flex items-center justify-center p-2 rounded-lg border-2 transition-all duration-300 aspect-square w-10 h-10 ${
                  isScrolled || !isHomePage
                    ? 'border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white'
                    : 'text-white border-white hover:bg-white hover:text-primary-800'
                }`}
                aria-label="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-4 flex-shrink-0">
            {session ? (
              <>
                <span className={`text-sm ${
                  isScrolled || !isHomePage ? 'text-gray-600' : 'text-white'
                }`}>
                  Welcome, {session.user.display_name}
                </span>
                <button
                  ref={desktopBurgerBtnRef}
                  onClick={() => setIsDesktopBurgerOpen(!isDesktopBurgerOpen)}
                  className="flex items-center justify-center p-2 rounded-lg border-2 border-[#d42027] text-[#d42027] hover:bg-[#d42027] hover:text-white transition-all duration-300 w-10 h-10"
                  aria-label="Menu"
                >
                  {isDesktopBurgerOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/auth/signin')}
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-300"
                  style={{
                    color: isScrolled || !isHomePage ? colors.textSecondary : '#ffffff',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isScrolled || !isHomePage ? '#f3f4f6' : 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push('/auth/signup')}
                  className={`relative px-4 py-2 rounded-lg font-medium transition-all duration-300 border ${
                    isScrolled || !isHomePage 
                      ? 'text-white border-transparent hover:opacity-90' 
                      : 'text-white border-white bg-transparent hover:bg-white hover:text-red-600'
                  }`}
                  style={isScrolled || !isHomePage ? {
                    backgroundColor: colors.primary
                  } : undefined}
                >
                  List Your Studio
                  <FreeBadge small />
                </button>
              </>
            )}
          </div>

          {/* Tablet Burger Menu for Logged-In Users */}
          {session && (
            <div className="hidden md:flex lg:hidden">
              <DashboardDropdownMenu
              username={session.user.username || ''}
              isScrolled={isScrolled}
              isHomePage={isHomePage}
              session={session}
              isAdminUser={session?.user?.email === 'admin@mpdee.co.uk' || session?.user?.username === 'VoiceoverGuy' || session?.user?.role === 'ADMIN'}
              includeSiteLinks={true}
            />
            </div>
          )}

          {/* Mobile Burger Menu Button - styled like desktop, sits in navbar */}
          <button
            onClick={() => window.dispatchEvent(new Event('toggleMobileBurgerMenu'))}
            className="md:hidden flex items-center justify-center p-2 rounded-lg border-2 border-[#d42027] text-[#d42027] hover:bg-[#d42027] hover:text-white transition-all duration-300 w-10 h-10 mobile-burger-btn"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5 mobile-burger-icon" />
          </button>
        </div>
      </div>
    </nav>

    {/* Browse Studios Dropdown (portal-mounted for proper backdrop blur) */}
    {isMounted &&
      createPortal(
        <div
          ref={browseDropdownPanelRef}
          className={`fixed left-1/2 -translate-x-1/2 z-[120] rounded-b-2xl transition-all duration-200 ease-out ${
            isBrowseDropdownOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-2 pointer-events-none'
          } ${
            isScrolled || !isHomePage
              ? 'bg-white/70 md:bg-white backdrop-blur-lg shadow-lg border border-gray-200'
              : 'bg-black/30 backdrop-blur-md shadow-xl'
          }`}
          style={{ top: `${(browseDropdownTop ?? 80)}px` }}
          onMouseEnter={() => {
            cancelCloseTimer();
            openBrowseDropdown();
          }}
          onMouseLeave={closeBrowseDropdownDelayed}
          onClick={(e) => {
            const target = e.target as HTMLElement | null;
            const clickedLink = target?.closest('a');
            const clickedButton = target?.closest('button');
            if (clickedLink || clickedButton) {
              setIsBrowseDropdownOpen(false);
            }
          }}
          role="menu"
          aria-label="Browse studios by type"
        >
          <div className="px-6 py-4">
            <CategoryFilterBar
              variant="compact"
              tone={isScrolled || !isHomePage ? 'light' : 'dark'}
              labelMode="short"
              imageScale={pathname === '/' && !isScrolled ? 2 : 1}
            />
          </div>
        </div>,
        document.body,
      )}

    {/* Desktop Burger Menu for Logged-In Users */}
    {session && (
      <div ref={desktopBurgerRef} className="hidden lg:block">
        <DesktopBurgerMenu
          session={session}
          isAdminUser={session?.user?.email === 'admin@mpdee.co.uk' || session?.user?.username === 'VoiceoverGuy' || session?.user?.role === 'ADMIN'}
          isOpen={isDesktopBurgerOpen}
          onClose={() => setIsDesktopBurgerOpen(false)}
          menuRef={desktopBurgerRef}
          buttonRef={desktopBurgerBtnRef}
        />
      </div>
    )}

    {/* Public User Mobile Menu (Tablet only) */}
    {isMobileMenuOpen && !session && (
      <>
        {/* Backdrop overlay (no blur) */}
        <div 
          className="fixed inset-0 z-[99] bg-black/30 hidden md:block lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        {/* Menu Panel */}
        <div 
          ref={mobileMenuRef}
          className="fixed top-[72px] right-6 z-[110] w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 hidden md:block lg:hidden"
        >
          <Link
            href="/studios"
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Browse Studios
          </Link>
          <Link
            href="/about"
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            About Us
          </Link>
          <div className="my-2 border-t border-gray-200" />
          <Link
            href="/auth/signin"
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#d42027] hover:bg-red-50 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            List Your Studio
            <FreeBadge small />
          </Link>
        </div>
      </>
    )}
  </>
  );
}
