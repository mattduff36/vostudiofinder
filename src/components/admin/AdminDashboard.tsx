'use client';

import { useState } from 'react';
import { 
  Users, 
  Building, 
  Star, 
  AlertCircle, 
  Activity,
  Crown,
  TrendingUp,
  Settings,
  Shield,
  MessageSquare
} from 'lucide-react';

interface AdminDashboardProps {
  stats: {
    totalUsers: number;
    totalStudios: number;
    totalReviews: number;
    pendingReviews: number;
    activeUsers: number;
    premiumStudios: number;
  };
  recentActivity: {
    users: Array<{
      id: string;
      displayName: string;
      email: string;
      role: string;
      createdAt: Date;
    }>;
    studios: Array<{
      id: string;
      name: string;
      studioType: string;
      createdAt: Date;
      owner: {
        displayName: string;
      };
    }>;
    reviews: Array<{
      id: string;
      rating: number;
      status: string;
      createdAt: Date;
      reviewer: {
        displayName: string;
      };
      studio: {
        name: string;
      };
    }>;
  };
}

export function AdminDashboard({ stats, recentActivity }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'studios' | 'reviews' | 'settings'>('overview');

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      title: 'Active Studios',
      value: stats.totalStudios.toLocaleString(),
      icon: Building,
      color: 'bg-green-500',
      change: '+8%',
    },
    {
      title: 'Total Reviews',
      value: stats.totalReviews.toLocaleString(),
      icon: Star,
      color: 'bg-yellow-500',
      change: '+15%',
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingReviews.toLocaleString(),
      icon: AlertCircle,
      color: 'bg-red-500',
      urgent: stats.pendingReviews > 0,
    },
    {
      title: 'Active Users (30d)',
      value: stats.activeUsers.toLocaleString(),
      icon: Activity,
      color: 'bg-purple-500',
      change: '+5%',
    },
    {
      title: 'Premium Studios',
      value: stats.premiumStudios.toLocaleString(),
      icon: Crown,
      color: 'bg-amber-500',
      change: '+3%',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary flex items-center">
                <Shield className="w-8 h-8 mr-3 text-primary-600" />
                Admin Dashboard
              </h1>
              <p className="mt-2 text-text-secondary">
                Manage your VoiceoverStudioFinder platform
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'studios', label: 'Studios', icon: Building },
              { id: 'reviews', label: 'Reviews', icon: Star },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {statCards.map((stat, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-lg border border-gray-200 p-6 ${
                    stat.urgent ? 'ring-2 ring-red-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-secondary">{stat.title}</p>
                      <p className="text-3xl font-bold text-text-primary">{stat.value}</p>
                      {stat.change && (
                        <p className="text-sm text-green-600 mt-1">
                          <TrendingUp className="w-4 h-4 inline mr-1" />
                          {stat.change}
                        </p>
                      )}
                    </div>
                    <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Users */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-text-primary">Recent Users</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {recentActivity.users.map((user) => (
                    <div key={user.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text-primary">{user.displayName}</p>
                          <p className="text-sm text-text-secondary">{user.email}</p>
                          <p className="text-xs text-text-secondary mt-1">
                            {user.role} • {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Studios */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-text-primary">Recent Studios</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {recentActivity.studios.map((studio) => (
                    <div key={studio.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text-primary">{studio.name}</p>
                          <p className="text-sm text-text-secondary">by {studio.owner.displayName}</p>
                          <p className="text-xs text-text-secondary mt-1">
                            {studio.studioType} • {new Date(studio.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Reviews */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-text-primary">Recent Reviews</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {recentActivity.reviews.map((review) => (
                    <div key={review.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3 h-3 ${
                                    star <= review.rating
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              review.status === 'PENDING' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : review.status === 'APPROVED'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {review.status}
                            </span>
                          </div>
                          <p className="text-sm text-text-primary">{review.studio.name}</p>
                          <p className="text-xs text-text-secondary">
                            by {review.reviewer.displayName} • {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs would be implemented here */}
        {activeTab !== 'overview' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management
            </h3>
            <p className="text-text-secondary">
              This section is under development. Advanced admin features for managing {activeTab} will be available soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
