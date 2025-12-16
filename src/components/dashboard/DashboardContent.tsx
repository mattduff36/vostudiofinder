'use client';

import { useState } from 'react';
import Image from 'next/image';
import { DashboardTabs, DashboardTab } from './DashboardTabs';
import { UserDashboard } from './UserDashboard';
import { ProfileEditForm } from './ProfileEditForm';
import { ImageGalleryManager } from './ImageGalleryManager';
import { Footer } from '@/components/home/Footer';

// Phase 4: Mobile dashboard components
import { QuickActions, QuickAction } from './mobile/QuickActions';
import { isMobileFeatureEnabled } from '@/lib/feature-flags';

interface DashboardContentProps {
  dashboardData: any;
}

export function DashboardContent({ dashboardData }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const handleQuickAction = (action: QuickAction) => {
    setActiveTab(action);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        // Hide desktop overview on mobile when Phase 4 is enabled
        if (isMobileFeatureEnabled(4)) {
          return (
            <div className="hidden md:block">
              <UserDashboard data={dashboardData} />
            </div>
          );
        }
        return <UserDashboard data={dashboardData} />;
      
      case 'edit-profile':
        return <ProfileEditForm userId={dashboardData.user.id} />;
      
      case 'images':
        return <ImageGalleryManager />;
      
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
              <p className="text-gray-600">Settings panel will go here.</p>
              {/* Settings panel will be added here */}
            </div>
          </div>
        );
      
      default:
        return <UserDashboard data={dashboardData} />;
    }
  };

  return (
    <div className="min-h-screen relative bg-gray-50">
      {/* Background Image - Fixed */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/background-images/21920-4.jpg"
          alt="Dashboard background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      {/* Tabs with proper z-index (Desktop only) */}
      <div className={`relative z-20 ${isMobileFeatureEnabled(4) ? 'hidden md:block' : ''}`}>
        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Phase 4: Mobile Dashboard Components */}
      {isMobileFeatureEnabled(4) && (
        <>
          {activeTab === 'overview' ? (
            // Overview: Show only quick actions (stats removed per user request)
            <>
              <QuickActions onActionClick={handleQuickAction} />
            </>
          ) : (
            // Sub-pages: Show back button
            <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
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
        </>
      )}

      {/* Content */}
      <div className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${
        isMobileFeatureEnabled(4) && activeTab === 'overview' ? 'py-0 md:py-8' : 'py-8'
      }`}>
        {renderTabContent()}
      </div>

      {/* Footer */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

