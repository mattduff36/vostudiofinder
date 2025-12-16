/**
 * StatsGridMobile - Mobile Stats Grid (2x2)
 * 
 * Compact 2x2 grid layout vs desktop's 4-column layout
 * Simplified stat cards with icons and counts
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 4.
 */
'use client';

import { Building2, MessageCircle, Users, Star } from 'lucide-react';
import { isMobileFeatureEnabled } from '@/lib/feature-flags';

interface StatsGridMobileProps {
  studiosOwned: number;
  reviewsWritten: number;
  totalConnections: number;
  unreadMessages: number;
}

export function StatsGridMobile({
  studiosOwned,
  reviewsWritten,
  totalConnections,
  unreadMessages,
}: StatsGridMobileProps) {
  // Phase 4 feature gate
  if (!isMobileFeatureEnabled(4)) {
    return null;
  }

  const stats = [
    {
      label: 'Studios',
      value: studiosOwned,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Messages',
      value: unreadMessages,
      icon: MessageCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      badge: unreadMessages > 0,
    },
    {
      label: 'Connections',
      value: totalConnections,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Reviews',
      value: reviewsWritten,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  return (
    <div className="md:hidden grid grid-cols-2 gap-3 p-4 bg-white border-b border-gray-200">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="relative bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            {/* Badge for unread messages */}
            {stat.badge && stat.value > 0 && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{stat.value}</span>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <div className={`flex-shrink-0 p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 truncate">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
