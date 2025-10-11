'use client';

import { useState } from 'react';
import { DashboardTabs, DashboardTab } from './DashboardTabs';
import { UserDashboard } from './UserDashboard';
import { ProfileEditForm } from './ProfileEditForm';

interface DashboardContentProps {
  dashboardData: any;
  profileData?: any;
}

export function DashboardContent({ dashboardData, profileData }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <UserDashboard data={dashboardData} />;
      
      case 'edit-profile':
        return <ProfileEditForm userId={dashboardData.user.id} />;
      
      case 'images':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Manage Images</h2>
            <p className="text-gray-600">Image gallery manager will go here.</p>
            {/* ImageGalleryManager will be added here */}
          </div>
        );
      
      case 'settings':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
            <p className="text-gray-600">Settings panel will go here.</p>
            {/* Settings panel will be added here */}
          </div>
        );
      
      default:
        return <UserDashboard data={dashboardData} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
}

