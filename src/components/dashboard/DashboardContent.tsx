'use client';

import { useState } from 'react';
import Image from 'next/image';
import { DashboardTabs, DashboardTab } from './DashboardTabs';
import { UserDashboard } from './UserDashboard';
import { ProfileEditForm } from './ProfileEditForm';
import { ImageGalleryManager } from './ImageGalleryManager';

interface DashboardContentProps {
  dashboardData: any;
}

export function DashboardContent({ dashboardData }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
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
      <div className="fixed inset-0 z-0">
        <Image
          src="/background-images/21920-4.jpg"
          alt="Dashboard background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      {/* Tabs with proper z-index */}
      <div className="relative z-20">
        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
}

