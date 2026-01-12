'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Building, 
  Activity, 
  MessageSquare,
  Users,
  Headphones,
  CreditCard,
  Clock,
  AlertTriangle
} from 'lucide-react';

export type AdminTab = 'overview' | 'studios' | 'analytics' | 'faq' | 'waitlist' | 'support' | 'payments' | 'reservations' | 'error_log';

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
  { id: 'payments', label: 'Payments', icon: CreditCard, href: '/admin/payments' },
  { id: 'reservations', label: 'Reservations', icon: Clock, href: '/admin/reservations' },
  { id: 'analytics', label: 'Analytics', icon: Activity, href: '/admin/analytics' },
  { id: 'waitlist', label: 'Waiting List', icon: Users, href: '/admin/waitlist' },
  { id: 'support', label: 'Support', icon: Headphones, href: '/admin/support' },
  { id: 'error_log', label: 'Error Log', icon: AlertTriangle, href: '/admin/error-log' },
  { id: 'faq', label: 'FAQ', icon: MessageSquare, href: '/admin/faq' },
];

export function AdminTabs({ activeTab }: AdminTabsProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      {/* Desktop Tabs */}
      <div className="hidden md:block sticky top-0 -mt-1 z-50 bg-red-600 border-b border-red-700">
        <nav className="flex justify-center space-x-8 px-6" aria-label="Admin tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => router.push(tab.href)}
                className={`
                  flex items-center gap-2 py-4 px-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-b-[6px] border-white text-white'
                    : 'border-b-4 border-transparent text-white hover:text-white hover:border-b-[5px] hover:border-red-400'
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
      <div className="md:hidden sticky top-0 -mt-[4px] z-50 bg-red-600 border-b border-red-700">
        <div className="px-4 py-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-full flex items-center justify-between text-left font-medium text-white"
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
          <div className="border-t border-red-700">
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
                      ? 'bg-red-700 text-white font-medium'
                      : 'text-white hover:bg-red-700'
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

