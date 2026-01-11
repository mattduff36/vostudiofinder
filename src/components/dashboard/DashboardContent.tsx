'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardTabs, DashboardTab } from './DashboardTabs';
import { UserDashboard } from './UserDashboard';
import { ProfileEditForm } from './ProfileEditForm';
import { ImageGalleryManager } from './ImageGalleryManager';
import { Settings } from './Settings';
import { Footer } from '@/components/home/Footer';
import { useScrollDirection } from '@/hooks/useScrollDirection';

// Phase 4: Mobile dashboard components
import { QuickActions, QuickAction } from './mobile/QuickActions';

interface DashboardContentProps {
  dashboardData: any;
}

export function DashboardContent({ dashboardData }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 5 });

  // Listen to URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove '#'
      if (hash && ['edit-profile', 'images', 'settings'].includes(hash)) {
        setActiveTab(hash as DashboardTab);
      } else {
        setActiveTab('overview');
      }
    };

    // Set initial tab from hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleQuickAction = (action: QuickAction) => {
    setActiveTab(action);
    window.location.hash = action;
  };

  const renderTabContent = () => {
    const content = (() => {
      switch (activeTab) {
        case 'overview':
          // Hide desktop overview on mobile
          return (
            <div className="hidden md:block">
              <UserDashboard data={dashboardData} />
            </div>
          );
        
        case 'edit-profile':
          return <ProfileEditForm userId={dashboardData.user.id} />;
        
        case 'images':
          return <ImageGalleryManager />;
        
        case 'settings':
          return <Settings data={dashboardData} />;
        
        default:
          return <UserDashboard data={dashboardData} />;
      }
    })();

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    );
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

      {/* Tabs with proper z-index (Desktop only) */}
      <div className="relative z-20 hidden md:block">
        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Mobile Back Button - Only for sub-pages - Sticky with show/hide on scroll */}
      {activeTab !== 'overview' && (
        <div className={`md:hidden fixed top-16 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3 transition-transform duration-300 ${
          scrollDirection === 'down' && !isAtTop ? '-translate-y-full' : 'translate-y-0'
        }`}>
          <button
            onClick={() => setActiveTab('overview')}
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
        activeTab === 'overview' ? 'py-0 md:py-8' : 'pt-20 pb-8 md:py-8'
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

      {/* Footer - Desktop only */}
      <div className="hidden md:block relative z-10">
        <Footer />
      </div>
    </div>
  );
}

