'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Building, 
  Activity, 
  Globe, 
  Search, 
  FileText, 
  MessageSquare 
} from 'lucide-react';

export type AdminTab = 'overview' | 'studios' | 'analytics' | 'network' | 'query' | 'schema' | 'faq';

interface AdminTabsProps {
  activeTab: AdminTab;
}

interface TabConfig {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const tabs: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: TrendingUp, href: '/admin' },
  { id: 'studios', label: 'Studios', icon: Building, href: '/admin/studios' },
  { id: 'analytics', label: 'Analytics', icon: Activity, href: '/admin/analytics' },
  { id: 'network', label: 'Network', icon: Globe, href: '/admin/network' },
  { id: 'query', label: 'Query', icon: Search, href: '/admin/query' },
  { id: 'schema', label: 'Schema', icon: FileText, href: '/admin/schema' },
  { id: 'faq', label: 'FAQ', icon: MessageSquare, href: '/admin/faq' },
];

export function AdminTabs({ activeTab }: AdminTabsProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      {/* Desktop Tabs */}
      <div className="hidden md:block bg-white border-b border-gray-200">
        <nav className="flex justify-center space-x-8 px-6" aria-label="Admin tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => router.push(tab.href)}
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
                    router.push(tab.href);
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

