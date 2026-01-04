'use client';

import { 
  Users, 
  Building2, 
  Star, 
  AlertCircle, 
  Activity,
  Crown,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { AdminTabs } from './AdminTabs';

interface AdminDashboardProps {
  stats: {
    totalUsers: number;
    usersWithStudios: number;
    totalStudios: number;
    activeStudios: number;
    verifiedStudios: number;
    featuredStudios: number;
    premiumStudios: number;
    totalReviews: number;
    pendingReviews: number;
    activeUsers30d: number;
  };
  recentActivity: {
    users: Array<{
      id: string;
      display_name: string;
      username: string;
      role: string;
      created_at: Date;
    }>;
    studios: Array<{
      id: string;
      name: string;
      status: string;
      is_verified: boolean;
      created_at: Date;
      owner: {
        display_name: string;
      };
    }>;
    reviews: Array<{
      id: string;
      rating: number;
      status: string;
      created_at: Date;
      reviewer: {
        display_name: string;
      };
      studio: {
        name: string;
      };
    }>;
  };
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
      title: 'Total Reviews',
      value: stats.totalReviews.toLocaleString(),
      subtitle: `${stats.pendingReviews} pending`,
      icon: Star,
      color: stats.pendingReviews > 0 ? 'bg-orange-500' : 'bg-indigo-500',
      urgent: stats.pendingReviews > 0,
    },
    {
      title: 'Active Users (30d)',
      value: stats.activeUsers30d.toLocaleString(),
      subtitle: `${Math.round((stats.activeUsers30d / stats.totalUsers) * 100)}% of total`,
      icon: Activity,
      color: 'bg-teal-500',
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingReviews.toLocaleString(),
      subtitle: stats.pendingReviews > 0 ? 'Needs attention' : 'All clear',
      icon: AlertCircle,
      color: 'bg-red-500',
      urgent: stats.pendingReviews > 0,
    },
  ];

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-lg shadow p-6 ${
                    stat.urgent ? 'ring-2 ring-red-500' : ''
                  }`}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Users */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Recent Users</h3>
                  <p className="text-sm text-gray-600 mt-1">Latest registrations</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {recentActivity.users.slice(0, 5).map((user) => (
                    <div key={user.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{user.display_name}</p>
                          <p className="text-sm text-gray-600">@{user.username}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Studios */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Recent Studios</h3>
                  <p className="text-sm text-gray-600 mt-1">Latest studio profiles</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {recentActivity.studios.slice(0, 5).map((studio) => (
                    <div key={studio.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{studio.name}</p>
                            {studio.is_verified && (
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600">by {studio.owner.display_name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(studio.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          studio.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          studio.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {studio.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Reviews */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Recent Reviews</h3>
                  <p className="text-sm text-gray-600 mt-1">Latest feedback</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {recentActivity.reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
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
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              review.status === 'PENDING' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : review.status === 'APPROVED'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {review.status}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{review.studio.name}</p>
                          <p className="text-xs text-gray-600">
                            by {review.reviewer.display_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
