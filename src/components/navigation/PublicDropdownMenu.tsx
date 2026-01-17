'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Home, Search, Info, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PublicDropdownMenuProps {
  isScrolled: boolean;
  isHomePage: boolean;
}

export function PublicDropdownMenu({ isScrolled, isHomePage }: PublicDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

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

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  const items = [
    { icon: Home, label: 'Home', path: '/', active: pathname === '/' },
    { icon: Search, label: 'Browse Studios', path: '/studios', active: pathname === '/studios' },
    { icon: Info, label: 'About Us', path: '/about', active: pathname === '/about' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className={`${
          isScrolled || !isHomePage
            ? 'border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white'
            : 'text-white border-white hover:bg-white hover:text-primary-800'
        } flex items-center justify-center p-2 aspect-square w-10 h-10`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Site menu"
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[110]"
          role="menu"
          aria-orientation="vertical"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  item.active ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
                role="menuitem"
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}

          <div className="my-2 border-t border-gray-200" role="separator" />

          <button
            type="button"
            onClick={() => handleNavigation('/auth/signin')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors text-gray-700 hover:bg-gray-50"
            role="menuitem"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            Sign In
          </button>

          <button
            type="button"
            onClick={() => handleNavigation('/auth/signup')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors text-gray-700 hover:bg-gray-50"
            role="menuitem"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            List Your Studio
          </button>
        </div>
      )}
    </div>
  );
}

