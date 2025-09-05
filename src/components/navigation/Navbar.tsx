'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { colors } from '../home/HomePage';

interface NavbarProps {
  session: Session | null;
}

export function Navbar({ session }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const isHomePage = pathname === '/';

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || !isHomePage 
          ? 'bg-white shadow-lg' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
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
              width={300}
              height={60}
              priority
              className="h-12 w-auto"
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
              About
            </Link>
            <Link 
              href="/contact" 
              className={`transition-colors ${pathname === '/contact' ? 'font-semibold' : ''}`}
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
              Contact
            </Link>
            <Link 
              href="/help" 
              className={`transition-colors ${pathname === '/help' ? 'font-semibold' : ''}`}
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
              Help
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
            className={`md:hidden p-2 rounded-md ${
              isScrolled || !isHomePage 
                ? 'text-gray-700 hover:bg-gray-100' 
                : 'text-white hover:bg-primary-700'
            }`}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className={`md:hidden mt-4 py-4 border-t ${
            isScrolled || !isHomePage 
              ? 'border-gray-200 bg-white' 
              : 'border-white/20 bg-primary-800/90'
          }`}>
            <div className="space-y-4">
              <Link 
                href="/studios" 
                className={`block py-2 transition-colors ${
                  isScrolled || !isHomePage 
                    ? 'text-gray-700 hover:text-primary-600' 
                    : 'text-white hover:text-primary-200'
                } ${pathname === '/studios' ? 'font-semibold' : ''}`}
              >
                Browse Studios
              </Link>
              <Link 
                href="/about" 
                className={`block py-2 transition-colors ${
                  isScrolled || !isHomePage 
                    ? 'text-gray-700 hover:text-primary-600' 
                    : 'text-white hover:text-primary-200'
                } ${pathname === '/about' ? 'font-semibold' : ''}`}
              >
                About
              </Link>
              <Link 
                href="/contact" 
                className={`block py-2 transition-colors ${
                  isScrolled || !isHomePage 
                    ? 'text-gray-700 hover:text-primary-600' 
                    : 'text-white hover:text-primary-200'
                } ${pathname === '/contact' ? 'font-semibold' : ''}`}
              >
                Contact
              </Link>
              <Link 
                href="/help" 
                className={`block py-2 transition-colors ${
                  isScrolled || !isHomePage 
                    ? 'text-gray-700 hover:text-primary-600' 
                    : 'text-white hover:text-primary-200'
                } ${pathname === '/help' ? 'font-semibold' : ''}`}
              >
                Help
              </Link>
              
              <div className="pt-4 space-y-3">
                {session ? (
                  <>
                    <div className={`text-sm ${
                      isScrolled || !isHomePage ? 'text-gray-600' : 'text-white/80'
                    }`}>
                      Welcome, {session.user.displayName}
                    </div>
                    <Button
                      onClick={() => router.push('/dashboard')}
                      variant={isScrolled || !isHomePage ? 'outline' : 'outline'}
                      className={`w-full ${
                        isScrolled || !isHomePage 
                          ? 'border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white' 
                          : 'text-white border-white hover:bg-white hover:text-primary-800'
                      }`}
                    >
                      Dashboard
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => router.push('/auth/signin')}
                      variant="ghost"
                      className={`w-full ${
                        isScrolled || !isHomePage 
                          ? 'text-gray-700 hover:bg-gray-100' 
                          : 'text-white hover:bg-primary-700'
                      }`}
                    >
                      Sign In
                    </Button>
                    <Button
                      onClick={() => router.push('/auth/signup')}
                      variant={isScrolled || !isHomePage ? 'primary' : 'outline'}
                      className={`w-full ${
                        isScrolled || !isHomePage 
                          ? 'bg-primary-600 text-white hover:bg-primary-700' 
                          : 'text-white border-white hover:bg-white hover:text-primary-800'
                      }`}
                    >
                      List Your Studio
                    </Button>
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
