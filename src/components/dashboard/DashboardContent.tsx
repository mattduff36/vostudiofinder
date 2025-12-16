'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { DashboardTabs, DashboardTab } from './DashboardTabs';
import { UserDashboard } from './UserDashboard';
import { ProfileEditForm } from './ProfileEditForm';
import { ImageGalleryManager } from './ImageGalleryManager';
import { Footer } from '@/components/home/Footer';
import { logger } from '@/lib/logger';

// Phase 4: Mobile dashboard components
import { QuickActions, QuickAction } from './mobile/QuickActions';
import { isMobileFeatureEnabled } from '@/lib/feature-flags';

interface DashboardContentProps {
  dashboardData: any;
}

export function DashboardContent({ dashboardData }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [isProfileVisible, setIsProfileVisible] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch profile visibility state
  useEffect(() => {
    const fetchVisibility = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const result = await response.json();
          if (result.data.studio) {
            const visible = result.data.studio.is_profile_visible !== false;
            setIsProfileVisible(visible);
          }
        }
      } catch (err) {
        logger.error('Failed to fetch profile visibility:', err);
      }
    };
    fetchVisibility();
  }, []);

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

  // Handle profile visibility toggle
  const handleVisibilityToggle = async (visible: boolean) => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studio: {
            is_profile_visible: visible
          }
        }),
      });

      if (response.ok) {
        setIsProfileVisible(visible);
        logger.log('✅ Profile visibility updated successfully to:', visible);
      } else {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to update profile visibility:', errorData);
        alert('Failed to update profile visibility. Please try again.');
        setIsProfileVisible(!visible);
      }
    } catch (err) {
      logger.error('Error updating profile visibility:', err);
      alert('Error updating profile visibility. Please try again.');
      setIsProfileVisible(!visible);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setActiveTab(action);
    window.location.hash = action;
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
              <QuickActions 
                onActionClick={handleQuickAction}
                displayName={dashboardData?.user?.display_name || dashboardData?.user?.username || ''}
                isProfileVisible={isProfileVisible}
                onVisibilityToggle={handleVisibilityToggle}
                saving={saving}
              />
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

      {/* Footer - Desktop only */}
      <div className="hidden md:block relative z-10">
        <Footer />
      </div>
    </div>
  );
}

