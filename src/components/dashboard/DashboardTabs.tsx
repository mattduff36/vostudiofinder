'use client';

import { useState, useEffect } from 'react';
import { Home, Edit, Image, Settings } from 'lucide-react';

export type DashboardTab = 'overview' | 'edit-profile' | 'images' | 'settings';

interface DashboardTabsProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

interface TabConfig {
  id: DashboardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'edit-profile', label: 'Edit Profile', icon: Edit },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Update URL hash when tab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.hash = activeTab === 'overview' ? '' : activeTab;
    }
  }, [activeTab]);

  // Read hash on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1) as DashboardTab;
      if (hash && tabs.some(t => t.id === hash)) {
        onTabChange(hash);
      }
    }
  }, [onTabChange]);

  return (
    <>
      {/* Desktop Tabs */}
      <div className="hidden md:block bg-white border-b border-gray-200">
        <nav className="flex justify-center space-x-8 px-6" aria-label="Dashboard tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Tabs */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="px-4 py-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-full flex items-center justify-between text-left font-medium text-gray-900"
          >
            <span className="flex items-center gap-2">
              {tabs.find(t => t.id === activeTab)?.icon && 
                (() => {
                  const Icon = tabs.find(t => t.id === activeTab)!.icon;
                  return <Icon className="w-5 h-5" />;
                })()
              }
              {tabs.find(t => t.id === activeTab)?.label}
            </span>
            <svg
              className={`w-5 h-5 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                    ${isActive
                      ? 'bg-red-50 text-red-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

