'use client';

import { useState, useEffect, useRef } from 'react';
import { Session } from 'next-auth';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { colors } from '../home/HomePage';

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
  const navContainerRef = useRef<HTMLDivElement>(null);

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

  // Handle scroll effect
  useEffect(() => {
    // Function to get scroll position from any scrollable element
    const getScrollPosition = () => {
      return window.scrollY || 
             document.documentElement.scrollTop || 
             document.body.scrollTop || 
             0;
    };
    
    // Set initial scroll state
    setIsScrolled(getScrollPosition() > 10);
    
    const handleScroll = () => {
      const scrollPos = getScrollPosition();
      setIsScrolled(scrollPos > 10);
    };

    // Listen to scroll on multiple targets to ensure we catch it
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    
    // Also check periodically as a fallback (in case scroll events don't fire)
    const checkScrollInterval = setInterval(() => {
      const scrollPos = getScrollPosition();
      const shouldBeScrolled = scrollPos > 10;
      // React will only re-render if the state actually changes
      setIsScrolled(shouldBeScrolled);
    }, 100);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      clearInterval(checkScrollInterval);
    };
  }, []);



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
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 w-full max-w-full ${
        isScrolled || !isHomePage
          ? 'bg-white/70 md:bg-white backdrop-blur-lg shadow-lg'
          : 'bg-transparent'
      } ${isMapFullscreen ? 'md:block hidden' : ''}`}
    >
      <div ref={navContainerRef} className="max-w-7xl mx-auto px-6 py-4 w-full">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            onClick={handleLogoClick}
            className="relative cursor-pointer"
          >
            <div className="relative">
              {/* Normal Logo */}
              <Image
                src={isScrolled || !isHomePage 
                  ? "/images/voiceover-studio-finder-header-logo2-black.png" 
                  : "/images/voiceover-studio-finder-header-logo2-white.png"
                }
                alt="VoiceoverStudioFinder"
                width={384}
                height={60}
                priority
                className={`transition-opacity duration-300 ${isLogoLoading ? 'opacity-0 md:opacity-100' : 'opacity-100'} hover:opacity-80 w-[180px] sm:w-[220px] md:w-[280px] h-auto`}
              />
              
              {/* Loading Logo - Fades in and pulses (mobile only) */}
              <Image
                src="/images/voiceover-studio-finder-logo-loading2.png"
                alt="Loading..."
                width={384}
                height={60}
                priority
                className={`absolute top-0 left-0 transition-opacity duration-300 md:opacity-0 ${
                  isLogoLoading ? 'opacity-100 animate-pulse' : 'opacity-0'
                } w-[180px] sm:w-[220px] md:w-[280px] h-auto`}
                style={{
                  pointerEvents: 'none'
                }}
              />
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
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
              Studios
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
              About
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
          
          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {session ? (
              <>
                <span className={`text-sm ${
                  isScrolled || !isHomePage ? 'text-gray-600' : 'text-white'
                }`}>
                  Welcome, {session.user.display_name}
                </span>
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant={isScrolled || !isHomePage ? 'outline' : 'outline'}
                  className={
                    isScrolled || !isHomePage 
                      ? 'border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white' 
                      : 'text-white border-white hover:bg-white hover:text-primary-800'
                  }
                >
                  Dashboard
                </Button>
                {session.user.email === 'admin@mpdee.co.uk' && (
                  <>
                    {showEditButton && (
                      <button
                        onClick={handleEditClick}
                        className="bg-black hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
                      >
                        EDIT
                      </button>
                    )}
                    <button
                      onClick={() => router.push('/admin')}
                      className="bg-black hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
                    >
                      ADMIN
                    </button>
                  </>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    isScrolled || !isHomePage 
                      ? 'text-gray-600 hover:bg-gray-100' 
                      : 'text-white hover:bg-white/20'
                  }`}
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut size={20} />
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
  );
}
