'use client';

import Link from 'next/link';
import { Mail } from 'lucide-react';
import { MobileFooter } from '@/components/footer/MobileFooter';
import { XLogo } from '@/components/icons/XLogo';
import { SITE_NAME, SUPPORT_EMAIL } from '@/lib/seo/site';

export function Footer() {
  return (
    <>
      {/* Mobile Footer - Only visible on mobile */}
      <MobileFooter />
      
      {/* Desktop Footer - Hidden on mobile */}
      <footer className="hidden md:block w-full max-w-full overflow-x-hidden" style={{ backgroundColor: '#000000', color: '#ffffff' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4" style={{ color: '#ffffff' }}>{SITE_NAME}</h3>
            <p className="mb-4 sm:mb-6 max-w-md text-sm sm:text-base" style={{ color: '#ffffff' }}>
              The world's leading platform for connecting voice artists and agencies with professional 
              recording studios locally.
            </p>
            
            <div className="space-y-2 text-sm" style={{ color: '#ffffff' }}>
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="break-all">{SUPPORT_EMAIL}</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4" style={{ color: '#ffffff' }}>Quick Links</h4>
            <ul className="space-y-2 text-sm" style={{ color: '#cccccc' }}>
              <li><Link href="/about" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>About</Link></li>
              <li><Link href="/help" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Help Centre</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4" style={{ color: '#ffffff' }}>Resources</h4>
            <ul className="space-y-2 text-sm" style={{ color: '#cccccc' }}>
              <li><Link href="/studios" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Browse Studios</Link></li>
              <li><Link href="/auth/signup" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>List Your Studio</Link></li>
              {/* Blog - Coming Soon */}
              <li>
                <span className="cursor-not-allowed opacity-50 relative group inline-block">
                  Blog
                  {/* Tooltip */}
                  <span className="absolute left-0 bottom-full mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md border border-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    Coming soon!
                    <span className="absolute left-4 top-full w-2 h-2 bg-gray-900 border-r border-b border-white rotate-45 -mt-1"></span>
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Media & Legal */}
        <div className="pt-6 sm:pt-8 mt-6 sm:mt-8" style={{ borderTop: '1px solid #444444' }}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-6 mb-2 md:mb-0">
              <a href="https://x.com/VOStudioFinder" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }} aria-label="X (formerly Twitter)">
                <XLogo className="w-5 h-5" />
              </a>
            </div>

            <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-6 text-xs sm:text-sm text-center md:text-left" style={{ color: '#cccccc' }}>
              <span className="px-2">© 2025 VoiceoverGuy & MPDEE Development. All rights reserved.</span>
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                <Link href="/privacy" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Privacy Policy</Link>
                <Link href="/terms" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Terms of Service</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
    </>
  );
}
