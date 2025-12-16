/**
 * ContactBar - Sticky Bottom Contact Bar
 * 
 * Fixed bottom bar with primary CTAs (Message, Call, More)
 * Hides when bottom nav is visible
 * Slides up on scroll down, slides down on scroll up
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 3.
 */
'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Phone, MoreHorizontal, Mail, Globe } from 'lucide-react';

interface ContactBarProps {
  phone?: string | undefined;
  email?: string | undefined;
  websiteUrl?: string | undefined;
  showPhone?: boolean | undefined;
  showEmail?: boolean | undefined;
  onMessageClick: () => void;
}

export function ContactBar({
  phone,
  email,
  websiteUrl,
  showPhone = true,
  showEmail = true,
  onMessageClick,
}: ContactBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  // Phase 3 feature gate

  // Hide/show bar based on scroll direction
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 50) {
        // Always show at top
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down - hide
        setIsVisible(false);
        setShowMenu(false);
      } else {
        // Scrolling up - show
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handlePhoneClick = () => {
    if (phone && showPhone) {
      window.location.href = `tel:${phone}`;
    }
  };

  return (
    <>
      {/* Backdrop for menu */}
      {showMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] md:hidden transition-opacity"
          onClick={() => setShowMenu(false)}
          aria-hidden="true"
        />
      )}

      {/* More Options Menu */}
      {showMenu && (
        <div className="fixed bottom-20 left-4 right-4 bg-white rounded-lg shadow-2xl z-[70] md:hidden">
          <div className="p-2 space-y-1">
            {showEmail && email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Mail className="w-5 h-5 text-gray-600" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-xs text-gray-500 truncate">{email}</p>
                </div>
              </a>
            )}

            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Globe className="w-5 h-5 text-gray-600" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Website</p>
                  <p className="text-xs text-gray-500 truncate">{websiteUrl}</p>
                </div>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Contact Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-50 transition-transform duration-300 safe-area-bottom ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        role="toolbar"
        aria-label="Contact actions"
      >
        <div className="flex items-center h-16 px-4 space-x-2">
          {/* Message Button */}
          <button
            onClick={onMessageClick}
            className="flex-1 flex items-center justify-center space-x-2 h-12 bg-[#d42027] text-white rounded-lg hover:bg-[#a1181d] transition-colors font-medium"
            aria-label="Send message"
          >
            <MessageCircle className="w-5 h-5" aria-hidden="true" />
            <span>Message</span>
          </button>

          {/* Call Button */}
          {showPhone && phone && (
            <button
              onClick={handlePhoneClick}
              className="flex items-center justify-center w-12 h-12 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="Call studio"
            >
              <Phone className="w-5 h-5" aria-hidden="true" />
            </button>
          )}

          {/* More Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center justify-center w-12 h-12 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            aria-label="More options"
            aria-expanded={showMenu}
          >
            <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}
