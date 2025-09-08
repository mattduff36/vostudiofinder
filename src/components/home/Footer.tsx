'use client';

import Link from 'next/link';
import { Facebook, Twitter, Mail } from 'lucide-react';
import { colors } from './HomePage';

export function Footer() {
  return (
    <footer style={{ backgroundColor: '#000000', color: '#ffffff' }}>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#ffffff' }}>VoiceoverStudioFinder</h3>
            <p className="mb-6 max-w-md" style={{ color: '#ffffff' }}>
              The world's leading platform for connecting voice artists with professional 
              recording studios.
            </p>
            
            <div className="space-y-2 text-sm" style={{ color: '#ffffff' }}>
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                <span>support@voiceoverstudiofinder.com</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4" style={{ color: '#ffffff' }}>Quick Links</h4>
            <ul className="space-y-2 text-sm" style={{ color: '#cccccc' }}>
              <li><Link href="/about" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>About Us</Link></li>
              <li><Link href="/contact" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Contact</Link></li>
              <li><Link href="/help" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Help Center</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-lg font-semibold mb-4" style={{ color: '#ffffff' }}>Resources</h4>
            <ul className="space-y-2 text-sm" style={{ color: '#cccccc' }}>
              <li><Link href="/studios" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Browse Studios</Link></li>
              <li><Link href="/auth/signup" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>List Your Studio</Link></li>
              <li><a href="/blog" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Blog</a></li>
            </ul>
          </div>
        </div>

        {/* Social Media & Legal */}
        <div className="pt-8 mt-8" style={{ borderTop: '1px solid #444444' }}>
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-6 mb-4 md:mb-0">
              <a href="https://facebook.com/voiceoverstudiofinder" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/VOStudioFinder" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>
                <Twitter className="w-5 h-5" />
              </a>
            </div>

            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm" style={{ color: '#cccccc' }}>
              <span>© 2025 VoiceoverStudioFinder & MPDEE Development. All rights reserved.</span>
              <div className="flex space-x-4">
                <a href="/privacy" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Privacy Policy</a>
                <a href="/terms" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Terms of Service</a>
                <a href="/cookies" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
