'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Home, Edit, Image, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DashboardDropdownMenuProps {
  username: string;
  isScrolled: boolean;
  isHomePage: boolean;
}

export function DashboardDropdownMenu({ 
  username, 
  isScrolled, 
  isHomePage 
}: DashboardDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState('');
  const [pendingDashboardHash, setPendingDashboardHash] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Track hash changes (only when on dashboard page)
  useEffect(() => {
    const updateHash = () => {
      // Only track hash if we're on the dashboard page
      if (pathname === '/dashboard') {
        setCurrentHash(window.location.hash);
      } else {
        setCurrentHash('');
      }
    };
    
    // Set initial hash based on current pathname
    updateHash();
    
    // Listen for hash changes
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // If a user clicks a dashboard hash link from a non-dashboard page, we first route to /dashboard,
  // then set window.location.hash once we're there (to ensure DashboardContent's hashchange listener runs).
  useEffect(() => {
    if (pathname !== '/dashboard') return;
    if (!pendingDashboardHash) return;

    window.location.hash = pendingDashboardHash;
    setPendingDashboardHash(null);
  }, [pathname, pendingDashboardHash]);

  const handleNavigation = (path: string) => {
    setIsOpen(false);

    // Dashboard routes are hash-driven by DashboardContent.
    // Using Next's router.push with a hash doesn't reliably fire `hashchange`, so we set `window.location.hash` explicitly.
    if (path === '/dashboard') {
      if (pathname === '/dashboard') {
        if (window.location.hash) window.location.hash = '';
        return;
      }
      router.push('/dashboard');
      return;
    }

    if (path.startsWith('/dashboard#')) {
      const hash = path.slice('/dashboard'.length); // e.g. "#images"
      if (pathname === '/dashboard') {
        window.location.hash = hash;
        return;
      }
      setPendingDashboardHash(hash);
      router.push('/dashboard');
      return;
    }

    router.push(path);
  };

  const menuItems = [
    { 
      icon: Home, 
      label: 'Overview', 
      path: '/dashboard',
      active: pathname === '/dashboard' && !currentHash
    },
    { 
      icon: Edit, 
      label: 'Edit Profile', 
      path: '/dashboard#edit-profile',
      active: currentHash === '#edit-profile'
    },
    { 
      icon: Image, 
      label: 'Images', 
      path: '/dashboard#images',
      active: currentHash === '#images'
    },
    { 
      icon: Settings, 
      label: 'Settings', 
      path: '/dashboard#settings',
      active: currentHash === '#settings'
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        variant={isScrolled || !isHomePage ? 'outline' : 'outline'}
        className={`${
          isScrolled || !isHomePage 
            ? 'border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white' 
            : 'text-white border-white hover:bg-white hover:text-primary-800'
        } flex items-center justify-center p-2`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Dashboard menu"
      >
        <Menu 
          className="w-5 h-5"
          aria-hidden="true"
        />
      </Button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-lg rounded-lg shadow-lg border border-gray-200 py-2 z-[110]"
          role="menu"
          aria-orientation="vertical"
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  item.active
                    ? 'bg-red-50 text-red-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                role="menuitem"
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}

          {/* Separator */}
          <div className="my-2 border-t border-gray-200" role="separator" />

          {/* My Profile */}
          <button
            type="button"
            onClick={() => handleNavigation(`/${username}`)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
              pathname === `/${username}`
                ? 'bg-red-50 text-red-600 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            role="menuitem"
          >
            <User className="w-4 h-4" aria-hidden="true" />
            My Profile
          </button>
        </div>
      )}
    </div>
  );
}
