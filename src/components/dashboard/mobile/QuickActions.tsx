/**
 * QuickActions - Mobile Quick Action Cards
 * 
 * Replaces horizontal tabs with full-width action cards
 * Each card navigates to a specific dashboard section
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 4.
 */
'use client';

import { User, Image as ImageIcon, Settings, ChevronRight } from 'lucide-react';
import { isMobileFeatureEnabled } from '@/lib/feature-flags';

export type QuickAction = 'edit-profile' | 'images' | 'settings';

interface QuickActionsProps {
  onActionClick: (action: QuickAction) => void;
}

export function QuickActions({ onActionClick }: QuickActionsProps) {
  // Phase 4 feature gate
  if (!isMobileFeatureEnabled(4)) {
    return null;
  }

  const actions = [
    {
      id: 'edit-profile' as QuickAction,
      label: 'Edit Profile',
      description: 'Update your personal information',
      icon: User,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'images' as QuickAction,
      label: 'Manage Images',
      description: 'Upload and organize studio photos',
      icon: ImageIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      id: 'settings' as QuickAction,
      label: 'Settings',
      description: 'Configure your preferences',
      icon: Settings,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ];

  return (
    <div className="md:hidden bg-white border-b border-gray-200">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="space-y-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onActionClick(action.id)}
                className="w-full flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-left"
              >
                <div className={`flex-shrink-0 p-2 rounded-lg ${action.bgColor}`}>
                  <Icon className={`w-5 h-5 ${action.color}`} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{action.label}</p>
                  <p className="text-xs text-gray-500 truncate">{action.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
