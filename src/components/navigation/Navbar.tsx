'use client';

import { useState, useEffect, useRef } from 'react';
import { Session } from 'next-auth';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { colors } from '../home/HomePage';
import { SITE_NAME } from '@/lib/seo/site';
import { DashboardDropdownMenu } from './DashboardDropdownMenu';
import { useScrollDrivenNav } from '@/hooks/useScrollDrivenNav';

interface NavbarProps {
  session: Session | null;
}

export function Navbar({ session }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showEditButton, setShowEditButton] = useState(false);
  const [isLogoLoading, setIsLogoLoading] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [heroHeight, setHeroHeight] = useState<number | null>(null);
  const lastWidthRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);
  
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
    navHeight: 64, // Mobile navbar height (matches top-16 = 4rem = 64px)
    scrollThreshold: 3,
    enabled: isMobile // Only enable on mobile
  });

  // Listen for profile edit handler events
  useEffect(() => {
    const handleEditHandlerReady = () => {
      setShowEditButton(true);
    };

    const handleEditHandlerUnmount = () => {
      setShowEditButton(false);
    };

    window.addEventListener('profileEditHandlerReady', handleEditHandlerReady);
    window.addEventListener('profileEditHandlerUnmount', handleEditHandlerUnmount);

    return () => {
      window.removeEventListener('profileEditHandlerReady', handleEditHandlerReady);
      window.removeEventListener('profileEditHandlerUnmount', handleEditHandlerUnmount);
    };
  }, []);

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

  const handleEditClick = () => {
    window.dispatchEvent(new Event('profileEditClick'));
  };

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
            <Link 
              href="/studios" 
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
            <Link 
              href="/about" 
              className={`transition-colors ${pathname === '/about' ? 'font-semibold' : ''}`}
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
              About Us
            </Link>
            {/* Blog - Coming Soon */}
            <div className="relative group">
              <span 
                className="cursor-not-allowed opacity-50 transition-opacity"
                style={{ 
                  color: isScrolled || !isHomePage ? colors.textSecondary : '#ffffff'
                }}
              >
                Blog
              </span>
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Coming soon!
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-900 rotate-45"></div>
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
                <DashboardDropdownMenu
                  username={session.user.username || ''}
                  isScrolled={isScrolled}
                  isHomePage={isHomePage}
                  session={session}
                  isAdminUser={session?.user?.email === 'admin@mpdee.co.uk' || session?.user?.username === 'VoiceoverGuy' || session?.user?.role === 'ADMIN'}
                  showEditButton={showEditButton}
                  includeSiteLinks={false}
                />
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
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    isScrolled || !isHomePage 
                      ? 'text-white hover:opacity-90' 
                      : 'text-white border border-white bg-transparent hover:bg-white hover:text-red-600'
                  }`}
                  style={isScrolled || !isHomePage ? {
                    backgroundColor: colors.primary
                  } : undefined}
                >
                  List Your Studio
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
                showEditButton={showEditButton}
                includeSiteLinks={true}
              />
            </div>
          )}

          {/* Mobile Sign In/Out Button */}
          {session ? (
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className={`md:hidden p-2 rounded-lg transition-all duration-300 ${
                isScrolled || !isHomePage 
                  ? 'text-gray-600 hover:bg-gray-100' 
                  : 'text-white hover:bg-white/20'
              }`}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={20} />
            </button>
          ) : (
            <button
              onClick={() => router.push('/auth/signin')}
              className="md:hidden px-3 py-1.5 rounded-lg transition-all duration-300 bg-[#d42027] hover:bg-[#b91c23] text-white text-sm font-medium"
              aria-label="Sign in"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>

    {/* Public User Mobile Menu (Tablet only) - With backdrop blur */}
    {isMobileMenuOpen && !session && (
      <>
        {/* Backdrop with blur */}
        <div 
          className="fixed inset-0 z-[99] bg-black/50 backdrop-blur-sm md:block lg:hidden hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        {/* Menu Panel */}
        <div 
          ref={mobileMenuRef}
          className="fixed top-[72px] right-6 z-[110] w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 md:block lg:hidden hidden"
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
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#d42027] hover:bg-red-50 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            List Your Studio
          </Link>
        </div>
      </>
    )}
    
    {/* Admin Buttons - Positioned below nav bar on right side */}
    {(session?.user?.email === 'admin@mpdee.co.uk' || session?.user?.username === 'VoiceoverGuy' || session?.user?.role === 'ADMIN') && (
      <div className={`hidden md:flex fixed top-20 right-6 z-[99] items-center gap-0 bg-black rounded-md text-white text-xs font-medium shadow-lg [.admin-modal-open_&]:hidden [.image-modal-open_&]:hidden ${isMapFullscreen ? 'hidden' : ''}`}>
        {showEditButton && (
          <>
            <button
              onClick={handleEditClick}
              className="px-3 py-1.5 hover:bg-gray-800 transition-colors rounded-l-md"
            >
              EDIT
            </button>
            <div className="w-px h-4 bg-white/30"></div>
          </>
        )}
        <button
          onClick={() => router.push('/admin')}
          className={`px-3 py-1.5 hover:bg-gray-800 transition-colors ${showEditButton ? 'rounded-r-md' : 'rounded-md'}`}
        >
          ADMIN
        </button>
      </div>
    )}
  </>
  );
}
