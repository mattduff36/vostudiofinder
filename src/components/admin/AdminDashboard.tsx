'use client';

import { 
  Users, 
  Building2, 
  CheckCircle,
  Sparkles,
  Crown,
  Activity,
  Clock
} from 'lucide-react';
import { AdminTabs } from './AdminTabs';

interface ActivityItem {
  id: string;
  type: 'user' | 'studio';
  action: string;
  description: string;
  timestamp: Date;
  metadata?: {
    username?: string;
    studioName?: string;
    status?: string;
    isVerified?: boolean;
  };
}

interface AdminDashboardProps {
  stats: {
    totalUsers: number;
    usersWithStudios: number;
    totalStudios: number;
    activeStudios: number;
    verifiedStudios: number;
    featuredStudios: number;
    premiumStudios: number;
    activeUsers30d: number;
  };
  recentActivity: ActivityItem[];
}

export function AdminDashboard({ stats, recentActivity }: AdminDashboardProps) {
  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      subtitle: `${stats.usersWithStudios} have studios`,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Studios',
      value: stats.activeStudios.toLocaleString(),
      subtitle: `${stats.totalStudios} total`,
      icon: Building2,
      color: 'bg-green-500',
    },
    {
      title: 'Verified Studios',
      value: stats.verifiedStudios.toLocaleString(),
      subtitle: `${Math.round((stats.verifiedStudios / stats.totalStudios) * 100)}% of total`,
      icon: CheckCircle,
      color: 'bg-purple-500',
    },
    {
      title: 'Featured Studios',
      value: stats.featuredStudios.toLocaleString(),
      subtitle: 'Homepage highlights',
      icon: Sparkles,
      color: 'bg-yellow-500',
    },
    {
      title: 'Premium Studios',
      value: stats.premiumStudios.toLocaleString(),
      subtitle: 'Paid subscriptions',
      icon: Crown,
      color: 'bg-amber-500',
    },
    {
      title: 'Active Users (30d)',
      value: stats.activeUsers30d.toLocaleString(),
      subtitle: `${Math.round((stats.activeUsers30d / stats.totalUsers) * 100)}% of total`,
      icon: Activity,
      color: 'bg-teal-500',
    },
  ];

  function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  return (
    <>
      <AdminTabs activeTab="overview" />

      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Overview of platform statistics and recent activity
            </p>
          </div>

          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {statCards.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 ${stat.color} rounded-lg`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    {stat.subtitle && (
                      <p className="text-sm text-gray-500 mt-2">{stat.subtitle}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-700" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                    <p className="text-sm text-gray-600 mt-1">Latest changes across the platform</p>
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {recentActivity.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No recent activity to display
                  </div>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${
                            activity.type === 'user' 
                              ? 'bg-blue-100' 
                              : 'bg-green-100'
                          }`}>
                            {activity.type === 'user' ? (
                              <Users className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Building2 className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900">
                                {activity.action}
                              </span>
                              {activity.metadata?.isVerified && (
                                <CheckCircle className="w-4 h-4 text-blue-600" />
                              )}
                              {activity.metadata?.status && (
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  activity.metadata.status === 'ACTIVE' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {activity.metadata.status}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          </div>
                        </div>
                        
                        <time className="text-xs text-gray-500 whitespace-nowrap">
                          {getRelativeTime(activity.timestamp)}
                        </time>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
