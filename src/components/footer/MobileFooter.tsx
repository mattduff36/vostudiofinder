/**
 * MobileFooter - Collapsed Accordion Footer for Mobile
 * 
 * Compact footer that starts collapsed (~100px) and expands to show
 * full content when tapped. Only visible on mobile (< 768px).
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function MobileFooter() {
  const [isExpanded, setIsExpanded] = useState(false);

  const footerSections = [
    {
      title: 'For Studios',
      links: [
        { label: 'List Your Studio', href: '/auth/signup' },
        { label: 'Pricing', href: '/upgrade' },
        { label: 'Studio Dashboard', href: '/dashboard' },
      ],
    },
    {
      title: 'For Clients',
      links: [
        { label: 'Browse Studios', href: '/studios' },
        { label: 'How It Works', href: '/about' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/about#contact' },
      ],
    },
  ];

  return (
    <footer className="bg-gray-900 text-white md:hidden">
      {/* Collapsed Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-6 flex items-center justify-between"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse footer' : 'Expand footer'}
      >
        <div className="text-left">
          <h2 className="text-lg font-bold text-white mb-1">
            VOStudioFinder
          </h2>
          <p className="text-sm text-gray-400">
            Find the perfect voiceover studio
          </p>
        </div>
        <div className="flex-shrink-0 ml-4">
          {isExpanded ? (
            <ChevronUp className="w-6 h-6 text-gray-400" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-400" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Expandable Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-6 space-y-6">
          {/* Footer Sections */}
          <div className="grid grid-cols-2 gap-6">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-white mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Social Link - Text only, no icon */}
          <div className="pt-4 border-t border-gray-800">
            <a
              href="https://x.com/VOStudioFinder"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white transition-colors inline-block"
            >
              Follow us on X/Twitter
            </a>
          </div>

          {/* Legal Links */}
          <div className="pt-4 border-t border-gray-800">
            <div className="flex flex-wrap gap-4 text-xs">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} VOStudioFinder. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Mini Copyright - Always Visible When Collapsed */}
      {!isExpanded && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} VOStudioFinder
          </p>
        </div>
      )}
    </footer>
  );
}
