'use client';

import { useState, useEffect, useRef } from 'react';
import { Session } from 'next-auth';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Menu, X } from 'lucide-react';
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
  const navContainerRef = useRef<HTMLDivElement>(null);

  // Calculate logo dimensions
  const logoSize = calculateLogoDimensions(isClient ? containerWidth : 0, 384, 60, 300);

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
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
            className="transition-opacity hover:opacity-80"
          >
            <Image
              src={isScrolled || !isHomePage 
                ? "/images/voiceover-studio-finder-header-logo2-black.png" 
                : "/images/voiceover-studio-finder-header-logo2-white.png"
              }
              alt="VoiceoverStudioFinder"
              width={logoSize.width}
              height={logoSize.height}
              priority
              style={{
                width: `${logoSize.width}px`,
                height: `${logoSize.height}px`,
                maxWidth: '100%'
              }}
            />
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
              href="/blog" 
              className={`transition-colors ${pathname === '/blog' ? 'font-semibold' : ''}`}
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
              Blog
            </Link>
          </div>
          
          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {session ? (
              <>
                <span className={`text-sm ${
                  isScrolled || !isHomePage ? 'text-gray-600' : 'text-white'
                }`}>
                  Welcome, {session.user.displayName}
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
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-300"
                  style={{
                    backgroundColor: isScrolled || !isHomePage ? colors.primary : 'transparent',
                    color: isScrolled || !isHomePage ? '#ffffff' : '#ffffff',
                    border: isScrolled || !isHomePage ? 'none' : '1px solid #ffffff'
                  }}
                  onMouseEnter={(e) => {
                    if (isScrolled || !isHomePage) {
                      e.currentTarget.style.backgroundColor = colors.primaryHover;
                    } else {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.color = colors.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isScrolled || !isHomePage) {
                      e.currentTarget.style.backgroundColor = colors.primary;
                    } else {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
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
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
            <div className="px-6 py-4 space-y-3">
              <Link 
                href="/studios" 
                className={`block py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/studios' 
                    ? 'text-white' 
                    : 'text-gray-700 hover:text-white hover:bg-red-500'
                }`}
                style={pathname === '/studios' ? { backgroundColor: colors.primary } : {}}
              >
                Studios
              </Link>
              <Link 
                href="/blog" 
                className={`block py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/blog' 
                    ? 'text-white' 
                    : 'text-gray-700 hover:text-white hover:bg-red-500'
                }`}
                style={pathname === '/blog' ? { backgroundColor: colors.primary } : {}}
              >
                Blog
              </Link>
              
              <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
                {session ? (
                  <>
                    <div className="text-xs text-gray-500 px-3">
                      Welcome, {session.user.displayName}
                    </div>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="block w-full text-left py-2 px-3 rounded-md text-sm font-medium text-gray-700 hover:text-white hover:bg-red-500 transition-colors"
                    >
                      Dashboard
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
