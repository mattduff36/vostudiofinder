'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { UserDashboard } from './UserDashboard';
import { ProfileEditForm } from './ProfileEditForm';
import { Settings } from './Settings';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import type { ProfileData } from '@/types/profile';

// Dashboard tab type for navigation
export type DashboardTab = 'overview' | 'edit-profile' | 'settings';

// Phase 4: Mobile dashboard components
import { QuickActions, QuickAction } from './mobile/QuickActions';

interface DashboardContentProps {
  dashboardData: any;
  initialProfileData: ProfileData | null;
  activeTab: DashboardTab;
}

export function DashboardContent({ dashboardData, initialProfileData, activeTab }: DashboardContentProps) {
  const [isFooterExpanded, setIsFooterExpanded] = useState(false);
  const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 5 });
  const router = useRouter();

  const handleQuickAction = (action: QuickAction) => {
    const routeMap: Record<'edit-profile' | 'settings', string> = {
      'edit-profile': '/dashboard/edit-profile',
      'settings': '/dashboard/settings',
    };
    router.push(routeMap[action]);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        // Hide desktop overview on mobile
        return (
          <div className="hidden md:block">
            <UserDashboard 
              data={dashboardData} 
              initialProfileData={initialProfileData} 
            />
          </div>
        );
      
      case 'edit-profile':
        return <ProfileEditForm userId={dashboardData.user.id} />;
      
      case 'settings':
        return <Settings data={dashboardData} />;
      
      default:
        return <UserDashboard data={dashboardData} initialProfileData={initialProfileData} />;
    }
  };

  return (
    <div className="min-h-screen relative bg-gray-50 flex flex-col">
      {/* Background Image - Fixed with enhanced gradient overlay on desktop */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/background-images/21920-4.jpg"
          alt="Dashboard background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white/60 hidden md:block" />
      </div>

      {/* Mobile Back Button - Only for sub-pages - Slides up with navbar on scroll */}
      {activeTab !== 'overview' && (
        <div className={`md:hidden fixed top-16 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3 transition-transform duration-300 ease-in-out ${
          scrollDirection === 'down' && !isAtTop ? '-translate-y-16' : 'translate-y-0'
        }`}>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center space-x-2 text-[#d42027] hover:text-[#a1181d] transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-medium">Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* Content */}
      <div className={`relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 ${
        // Note: `src/app/layout.tsx` already applies `pt-16` (64px) to <main> to clear the fixed Navbar.
        // This additional `pt-20` is intentional spacing + clearance for the fixed mobile back button.
        // pb-32 on desktop to clear the fixed footer at the bottom
        activeTab === 'overview' ? 'py-0 md:py-8 md:pb-32' : 'pt-20 pb-8 md:py-8 md:pb-32'
      } ${activeTab === 'settings' ? 'space-y-6' : ''}`}>
        {activeTab === 'overview' ? (
          // Overview: Show quick actions on mobile, regular content on desktop
          <div className="md:hidden">
            <QuickActions 
              onActionClick={handleQuickAction}
              displayName={dashboardData?.user?.display_name || dashboardData?.user?.username || ''}
            />
          </div>
        ) : null}
        {renderTabContent()}
      </div>

      {/* Backdrop when footer is expanded */}
      <AnimatePresence>
        {isFooterExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="hidden md:block fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsFooterExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Collapsible Footer - Desktop only (Fixed at bottom, overlays content when expanded) */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-50 w-full" style={{ backgroundColor: '#000000', color: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Use flex-direction: column-reverse so content expands upward */}
          <div className="flex flex-col-reverse">
            {/* Bottom Bar - Always Visible */}
            <div 
              className="pt-6 sm:pt-4" 
              style={{ borderTop: '1px solid #444444' }}
            >
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 pb-6">
                <div className="flex items-center space-x-6 mb-2 md:mb-0">
                  <a href="https://x.com/VOStudioFinder" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }} aria-label="X (formerly Twitter)">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                </div>

                <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-6 text-xs sm:text-sm text-center md:text-left" style={{ color: '#cccccc' }}>
                  <span className="px-2">© 2025 VoiceoverGuy & MPDEE Development. All rights reserved.</span>
                  <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                    <a href="/privacy" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Privacy Policy</a>
                    <a href="/terms" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Terms of Service</a>
                    <button
                      onClick={() => {
                        document.cookie = 'vsf_cookie_consent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                        window.location.reload();
                      }}
                      className="transition-colors hover:text-red-500"
                      style={{ color: '#cccccc' }}
                    >
                      Cookie Settings
                    </button>
                  </div>
                </div>

                {/* Toggle Button */}
                <button
                  onClick={() => setIsFooterExpanded(!isFooterExpanded)}
                  className="flex items-center text-gray-400 hover:text-red-500 transition-colors"
                  aria-label={isFooterExpanded ? 'Collapse footer' : 'Expand footer'}
                >
                  <motion.div
                    animate={{ rotate: isFooterExpanded ? 0 : 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-6 h-6" />
                  </motion.div>
                </button>
              </div>
            </div>

            {/* Expandable Content - Expands upward due to column-reverse */}
            <AnimatePresence>
              {isFooterExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="py-6 sm:py-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
                      {/* Company Info */}
                      <div className="col-span-1 md:col-span-2">
                        <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4" style={{ color: '#ffffff' }}>Voiceover Studio Finder</h3>
                        <p className="mb-4 sm:mb-6 max-w-md text-sm sm:text-base" style={{ color: '#ffffff' }}>
                          The world's leading platform for connecting voice artists and agencies with professional 
                          recording studios locally.
                        </p>
                        
                        <div className="space-y-2 text-sm" style={{ color: '#ffffff' }}>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="break-all">support@voiceoverstudiofinder.com</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Links */}
                      <div>
                        <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4" style={{ color: '#ffffff' }}>Quick Links</h4>
                        <ul className="space-y-2 text-sm" style={{ color: '#cccccc' }}>
                          <li><a href="/about" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>About</a></li>
                          <li><a href="/help" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Help Centre</a></li>
                        </ul>
                      </div>

                      {/* Resources */}
                      <div>
                        <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4" style={{ color: '#ffffff' }}>Resources</h4>
                        <ul className="space-y-2 text-sm" style={{ color: '#cccccc' }}>
                          <li><a href="/studios" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>Browse Studios</a></li>
                          <li><a href="/auth/signup" className="transition-colors hover:text-red-500" style={{ color: '#cccccc' }}>List Your Studio</a></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

