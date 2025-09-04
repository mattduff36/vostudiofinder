'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';

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
          ? 'bg-white shadow-lg border-b border-gray-200' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className={`text-2xl font-bold transition-colors ${
              isScrolled || !isHomePage 
                ? 'text-primary-800 hover:text-primary-600' 
                : 'text-white hover:text-primary-200'
            }`}
          >
            VoiceoverStudioFinder
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/studios" 
              className={`transition-colors ${
                isScrolled || !isHomePage 
                  ? 'text-gray-700 hover:text-primary-600' 
                  : 'text-white hover:text-primary-200'
              } ${pathname === '/studios' ? 'font-semibold' : ''}`}
            >
              Browse Studios
            </Link>
            <Link 
              href="/about" 
              className={`transition-colors ${
                isScrolled || !isHomePage 
                  ? 'text-gray-700 hover:text-primary-600' 
                  : 'text-white hover:text-primary-200'
              } ${pathname === '/about' ? 'font-semibold' : ''}`}
            >
              About
            </Link>
            <Link 
              href="/contact" 
              className={`transition-colors ${
                isScrolled || !isHomePage 
                  ? 'text-gray-700 hover:text-primary-600' 
                  : 'text-white hover:text-primary-200'
              } ${pathname === '/contact' ? 'font-semibold' : ''}`}
            >
              Contact
            </Link>
            {session && (
              <Link 
                href="/help" 
                className={`transition-colors ${
                  isScrolled || !isHomePage 
                    ? 'text-gray-700 hover:text-primary-600' 
                    : 'text-white hover:text-primary-200'
                } ${pathname === '/help' ? 'font-semibold' : ''}`}
              >
                Help
              </Link>
            )}
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
                <Button
                  onClick={() => router.push('/auth/signin')}
                  variant="ghost"
                  className={
                    isScrolled || !isHomePage 
                      ? 'text-gray-700 hover:bg-gray-100' 
                      : 'text-white hover:bg-primary-700'
                  }
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => router.push('/auth/signup')}
                  variant={isScrolled || !isHomePage ? 'primary' : 'outline'}
                  className={
                    isScrolled || !isHomePage 
                      ? 'bg-primary-600 text-white hover:bg-primary-700' 
                      : 'text-white border-white hover:bg-white hover:text-primary-800'
                  }
                >
                  List Your Studio
                </Button>
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
              {session && (
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
              )}
              
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
