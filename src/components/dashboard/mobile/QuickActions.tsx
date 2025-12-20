/**
 * QuickActions - Mobile Dashboard Accordion
 * 
 * Accordion-style dashboard sections matching edit-profile design
 * Includes Profile Visibility toggle and navigation cards
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 4.
 */
'use client';

import { User, Image as ImageIcon, Settings, Eye, EyeOff } from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';

export type QuickAction = 'edit-profile' | 'images' | 'settings';

interface QuickActionsProps {
  onActionClick: (action: QuickAction) => void;
  displayName?: string;
  isProfileVisible?: boolean;
  onVisibilityToggle?: (visible: boolean) => void;
  saving?: boolean;
}

export function QuickActions({ 
  onActionClick, 
  displayName,
  isProfileVisible = true,
  onVisibilityToggle,
  saving = false
}: QuickActionsProps) {
  // Phase 4 feature gate

  const actions = [
    {
      id: 'edit-profile' as QuickAction,
      label: 'Edit Profile',
      description: 'Update your personal information',
      icon: User,
    },
    {
      id: 'images' as QuickAction,
      label: 'Manage Images',
      description: 'Upload and organise studio photos',
      icon: ImageIcon,
    },
    {
      id: 'settings' as QuickAction,
      label: 'Settings',
      description: 'Configure your preferences',
      icon: Settings,
    },
  ];

  return (
    <div className="md:hidden py-6 space-y-3">
      {/* Welcome Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back{displayName ? `, ${displayName}` : ''}!
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Choose an option to manage your profile
        </p>
      </div>

      {/* Profile Visibility Toggle Card */}
      <div className="!bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              {isProfileVisible ? (
                <Eye className="w-5 h-5 text-[#d42027]" />
              ) : (
                <EyeOff className="w-5 h-5 text-[#d42027]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-base">
                Profile Visibility
              </p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {isProfileVisible ? 'Visible in search results' : 'Hidden from search'}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 ml-3">
            <Toggle
              checked={isProfileVisible}
              onChange={onVisibilityToggle || (() => {})}
              disabled={saving}
              aria-label="Toggle profile visibility"
            />
          </div>
        </div>
      </div>

      {/* Accordion Cards */}
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <div
            key={action.id}
            className="!bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
          >
            {/* Action Button */}
            <button
              onClick={() => onActionClick(action.id)}
              className="w-full flex items-center space-x-3 p-4 text-left hover:bg-gray-50 transition-colors active:bg-gray-100"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#d42027]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-base">
                  {action.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {action.description}
                </p>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
