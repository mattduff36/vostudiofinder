'use client';

import { useState, useEffect } from 'react';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { Users, Building2, CheckCircle, Star, TrendingUp, MapPin, Network, Activity } from 'lucide-react';

interface AnalyticsData {
  overview: {
    total_users: number;
    total_studios: number;
    active_studios: number;
    verified_studios: number;
    featured_studios: number;
    premium_studios: number;
    users_with_studios: number;
  };
  user_roles: {
    role: string;
    count: number;
  }[];
  studio_status: {
    status: string;
    count: number;
  }[];
  connection_methods: {
    method: string;
    count: number;
  }[];
  custom_connections: {
    method: string;
    count: number;
  }[];
  geographic: {
    location: string;
    count: number;
  }[];
  recent_studios: {
    id: string;
    name: string;
    status: string;
    is_verified: boolean;
    created_at: string;
  }[];
  recent_users: {
    id: string;
    username: string;
    display_name: string;
    role: string;
    created_at: string;
  }[];
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/admin/analytics');
        if (response.ok) {
          const data = await response.json();
          setAnalyticsData(data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <>
        <AdminTabs activeTab="analytics" />
        <div className="p-8 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading analytics...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!analyticsData) {
    return (
      <>
        <AdminTabs activeTab="analytics" />
        <div className="p-8 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-red-500">Failed to load analytics data</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { overview, user_roles, studio_status, connection_methods, custom_connections, geographic, recent_studios, recent_users } = analyticsData;

  return (
    <>
      <AdminTabs activeTab="analytics" />
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
            <p className="text-gray-600 mt-2">
              Real-time insights and statistics for VoiceOver Studio Finder
            </p>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">Total</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{overview.total_users}</h3>
              <p className="text-gray-600 text-sm mt-1">Registered Users</p>
              <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                {overview.users_with_studios} have studios
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-sm text-gray-500">Total</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{overview.total_studios}</h3>
              <p className="text-gray-600 text-sm mt-1">Studios</p>
              <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                {overview.active_studios} active
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-sm text-gray-500">Verified</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{overview.verified_studios}</h3>
              <p className="text-gray-600 text-sm mt-1">Verified Studios</p>
              <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                {Math.round((overview.verified_studios / overview.total_studios) * 100)}% of total
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <span className="text-sm text-gray-500">Featured</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{overview.featured_studios}</h3>
              <p className="text-gray-600 text-sm mt-1">Featured Studios</p>
              <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                Homepage highlights
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
                <span className="text-sm text-gray-500">Premium</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{overview.premium_studios}</h3>
              <p className="text-gray-600 text-sm mt-1">Premium Studios</p>
              <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                Paid subscriptions
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <Activity className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-sm text-gray-500">Status</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {Math.round((overview.active_studios / overview.total_studios) * 100)}%
              </h3>
              <p className="text-gray-600 text-sm mt-1">Active Rate</p>
              <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                {overview.active_studios} of {overview.total_studios}
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* User Roles */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-900">User Roles</h2>
              </div>
              <div className="space-y-3">
                {user_roles.map((role) => (
                  <div key={role.role} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${
                        role.role === 'ADMIN' ? 'bg-red-500' :
                        role.role === 'STUDIO_OWNER' ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`}></span>
                      <span className="text-gray-700">{role.role}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{role.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Studio Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-900">Studio Status</h2>
              </div>
              <div className="space-y-3">
                {studio_status.map((status) => (
                  <div key={status.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${
                        status.status === 'ACTIVE' ? 'bg-green-500' :
                        status.status === 'INACTIVE' ? 'bg-gray-500' :
                        status.status === 'DRAFT' ? 'bg-yellow-500' :
                        'bg-orange-500'
                      }`}></span>
                      <span className="text-gray-700">{status.status}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{status.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Connection Methods */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <Network className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-900">Connection Methods</h2>
              </div>
              <div className="space-y-2">
                {connection_methods.slice(0, 10).map((method) => (
                  <div key={method.method} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{method.method}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${(method.count / connection_methods[0].count) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-semibold text-gray-900 w-8 text-right">{method.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Geographic Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-900">Top Locations</h2>
              </div>
              <div className="space-y-2">
                {geographic.slice(0, 10).map((loc) => (
                  <div key={loc.location} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 truncate max-w-[200px]">{loc.location}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500" 
                          style={{ width: `${(loc.count / geographic[0].count) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-semibold text-gray-900 w-8 text-right">{loc.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Connection Methods */}
          {custom_connections.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <Network className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-900">Custom Connection Methods</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {custom_connections.slice(0, 20).map((method, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <span className="text-gray-700 text-sm truncate">{method.method}</span>
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                      {method.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Recent Studios */}
            {recent_studios.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Recent Studios</h2>
                  <p className="text-gray-600 text-sm mt-1">Latest studio registrations</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {recent_studios.map((studio) => (
                    <div key={studio.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{studio.name}</h3>
                            {studio.is_verified && (
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(studio.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          studio.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {studio.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Users */}
            {recent_users.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Recent Users</h2>
                  <p className="text-gray-600 text-sm mt-1">Latest user registrations</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {recent_users.map((user) => (
                    <div key={user.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{user.display_name}</h3>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          user.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 
                          user.role === 'STUDIO_OWNER' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
