'use client';

import { useState, useEffect, useRef } from 'react';
import { Session } from 'next-auth';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Menu, X, LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { colors } from '../home/HomePage';

// Calculate logo dimensions with proper aspect ratio
function calculateLogoDimensions(containerWidth: number, originalWidth: number = 384, originalHeight: number = 60, maxWidth: number = 300) {
  if (!containerWidth || containerWidth === 0) {
    // Default dimensions for SSR and initial render
    const aspectRatio = originalHeight / originalWidth;
    return { width: maxWidth, height: Math.round(maxWidth * aspectRatio * 100) / 100 };
  }

  // Calculate available width (accounting for padding and other elements)
  const availableWidth = Math.min(containerWidth * 0.4, maxWidth); // Use max 40% of container width
  const aspectRatio = originalHeight / originalWidth;
  
  // Calculate new dimensions maintaining aspect ratio
  const newWidth = Math.max(Math.min(availableWidth, maxWidth), 150); // Minimum 150px width
  const newHeight = Math.round(newWidth * aspectRatio * 100) / 100; // Round to avoid floating point precision issues
  
  return { width: newWidth, height: newHeight };
}

interface NavbarProps {
  session: Session | null;
}

export function Navbar({ session }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [showEditButton, setShowEditButton] = useState(false);
  const [isLogoLoading, setIsLogoLoading] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);

  // Calculate logo dimensions
  const logoSize = calculateLogoDimensions(isClient ? containerWidth : 0, 384, 60, 300);

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const handleEditClick = () => {
    window.dispatchEvent(new Event('profileEditClick'));
  };

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track container width for dynamic logo sizing (client-side only)
  useEffect(() => {
    if (!isClient) return;

    const updateWidth = () => {
      if (navContainerRef.current) {
        setContainerWidth(navContainerRef.current.offsetWidth);
      }
    };

    // Initial measurement
    updateWidth();

    // Set up resize observer
    const resizeObserver = new ResizeObserver(updateWidth);
    if (navContainerRef.current) {
      resizeObserver.observe(navContainerRef.current);
    }

    // Also listen to window resize as fallback
    window.addEventListener('resize', updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [isClient]);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && !(event.target as Element).closest('nav')) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    
    return undefined;
  }, [isMenuOpen]);

  const isHomePage = pathname === '/' || pathname === '/studios';

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        isScrolled || !isHomePage 
          ? 'bg-white shadow-lg' 
          : 'bg-transparent'
      }`}
    >
      <div ref={navContainerRef} className="max-w-7xl mx-auto px-6 py-4">
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
                width={logoSize.width}
                height={logoSize.height}
                priority
                className={`transition-opacity duration-300 ${isLogoLoading ? 'opacity-0 md:opacity-100' : 'opacity-100'} hover:opacity-80`}
                style={{
                  width: `${logoSize.width}px`,
                  height: `${logoSize.height}px`,
                  maxWidth: '100%'
                }}
              />
              
              {/* Loading Logo - Fades in and pulses (mobile only) */}
              <Image
                src="/images/voiceover-studio-finder-logo-loading2.png"
                alt="Loading..."
                width={logoSize.width}
                height={logoSize.height}
                priority
                className={`absolute top-0 left-0 transition-opacity duration-300 md:opacity-0 ${
                  isLogoLoading ? 'opacity-100 animate-pulse' : 'opacity-0'
                }`}
                style={{
                  width: `${logoSize.width}px`,
                  height: `${logoSize.height}px`,
                  maxWidth: '100%',
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md transition-all duration-200 hover:bg-red-50"
            style={{ 
              color: colors.primary,
              border: `1px solid ${colors.primary}`
            }}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
            <div className="px-6 py-4 space-y-3">
              <Link 
                href="/studios" 
                className="block py-2 px-3 rounded-md text-sm font-medium text-gray-700 hover:text-white hover:bg-red-500 transition-colors"
              >
                Studios
              </Link>
              {/* Blog - Coming Soon */}
              <div className="relative group">
                <span 
                  className="block py-2 px-3 rounded-md text-sm font-medium text-gray-700 cursor-not-allowed"
                >
                  Blog
                  <span className="ml-2 text-xs">(Coming soon!)</span>
                </span>
              </div>
              
              <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
                {session ? (
                  <>
                    <div className="text-xs text-gray-500 px-3">
                      Welcome, {session.user.display_name}
                    </div>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="block w-full text-left py-2 px-3 rounded-md text-sm font-medium text-gray-700 hover:text-white hover:bg-red-500 transition-colors"
                    >
                      Dashboard
                    </button>
                    {session.user.email === 'admin@mpdee.co.uk' && (
                      <>
                        {showEditButton && (
                          <button
                            onClick={handleEditClick}
                            className="block w-full text-left py-2 px-3 rounded-md text-sm font-medium text-white bg-black hover:bg-gray-900 transition-colors"
                          >
                            EDIT
                          </button>
                        )}
                        <button
                          onClick={() => router.push('/admin')}
                          className="block w-full text-left py-2 px-3 rounded-md text-sm font-medium text-white bg-black hover:bg-gray-900 transition-colors"
                        >
                          ADMIN
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="block w-full text-left py-2 px-3 rounded-md text-sm font-medium text-gray-700 hover:text-white hover:bg-red-500 transition-colors"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => router.push('/auth/signin')}
                      className="block w-full text-left py-2 px-3 rounded-md text-sm font-medium text-gray-700 hover:text-white hover:bg-red-500 transition-colors"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => router.push('/auth/signup')}
                      className="block w-full text-left py-2 px-3 rounded-md text-sm font-medium text-white transition-colors"
                      style={{ backgroundColor: colors.primary }}
                    >
                      List Your Studio
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
