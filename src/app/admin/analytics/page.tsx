'use client';

import { useState, useEffect } from 'react';
import { AdminTabs } from '@/components/admin/AdminTabs';

interface AnalyticsData {
  overview: {
    users: {
      total_users: number;
      active_users: number;
      pending_users: number;
      first_user_date: string;
      latest_user_date: string;
    };
    studios: {
      total_studios: number;
      active_studios: number;
      verified_studios: number;
    };
    connections: {
      total_connections: number;
      active_connections: number;
      pending_connections: number;
    };
    venues: {
      total_venues: number;
      venues_with_coords: number;
    };
    faqs: {
      total_faqs: number;
      answered_faqs: number;
    };
  };
  topStudios: Array<{
    id: string;
    name: string;
    connection_count: number;
    status: string;
  }>;
  distributions: {
    usersByStatus: Array<{
      status: string;
      count: number;
    }>;
    connectionsByStatus: Array<{
      accepted: number;
      count: number;
    }>;
  };
  recentActivity: Array<{
    id: string;
    name: string;
    date: string;
    status: string;
  }>;
}

export default function AdminAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusLabel = (status: string) => {
    return status === 'ACTIVE' ? 'Active' : 'Pending';
  };

  const getConnectionLabel = (accepted: number) => {
    return accepted === 1 ? 'Active' : 'Pending';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium">Error Loading Analytics</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <button 
          onClick={fetchAnalytics}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analyticsData) return null;

  const { overview, topStudios, distributions, recentActivity } = analyticsData;

  return (
    <>
      <AdminTabs activeTab="analytics" />
      <div className="min-h-screen bg-gray-50 relative">
        {/* Subtle red gradient overlays in corners */}
        <div className="fixed inset-0 pointer-events-none z-0">
          {/* Top-left gradient */}
          <div 
            className="absolute top-0 left-0 w-96 h-96 opacity-50"
            style={{
              background: 'radial-gradient(circle at top left, #d42027 0%, transparent 70%)'
            }}
          />
          {/* Top-right gradient */}
          <div 
            className="absolute top-0 right-0 w-96 h-96 opacity-50"
            style={{
              background: 'radial-gradient(circle at top right, #d42027 0%, transparent 70%)'
            }}
          />
          {/* Bottom-left gradient */}
          <div 
            className="absolute bottom-0 left-0 w-96 h-96 opacity-50"
            style={{
              background: 'radial-gradient(circle at bottom left, #d42027 0%, transparent 70%)'
            }}
          />
          {/* Bottom-right gradient */}
          <div 
            className="absolute bottom-0 right-0 w-96 h-96 opacity-50"
            style={{
              background: 'radial-gradient(circle at bottom right, #d42027 0%, transparent 70%)'
            }}
          />
          {/* Center gradient */}
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-10"
            style={{
              background: 'radial-gradient(circle at center, #d42027 0%, transparent 70%)'
            }}
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 VOSF Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Comprehensive insights and statistics from the Voice Over Studio Finder platform
        </p>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users Overview */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-blue-900">👥 Users</h3>
            <div className="text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-blue-700 text-sm">Total:</span>
              <span className="font-bold text-blue-900">{overview.users.total_users || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700 text-sm">Active:</span>
              <span className="font-bold text-green-600">{overview.users.active_users || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700 text-sm">Pending:</span>
              <span className="font-bold text-yellow-600">{overview.users.pending_users || 0}</span>
            </div>
          </div>
        </div>

        {/* Studios Overview */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-green-900">🎭 Studios</h3>
            <div className="text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-green-700 text-sm">Total:</span>
              <span className="font-bold text-green-900">{overview.studios.total_studios || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700 text-sm">Active:</span>
              <span className="font-bold text-green-600">{overview.studios.active_studios || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700 text-sm">Verified:</span>
              <span className="font-bold text-blue-600">{overview.studios.verified_studios || 0}</span>
            </div>
          </div>
        </div>

        {/* Connections Overview */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-purple-900">🤝 Connections</h3>
            <div className="text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-purple-700 text-sm">Total:</span>
              <span className="font-bold text-purple-900">{overview.connections.total_connections || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-700 text-sm">Active:</span>
              <span className="font-bold text-green-600">{overview.connections.active_connections || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-700 text-sm">Pending:</span>
              <span className="font-bold text-yellow-600">{overview.connections.pending_connections || 0}</span>
            </div>
          </div>
        </div>

        {/* FAQ Overview */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-orange-900">❓ Knowledge</h3>
            <div className="text-orange-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-orange-700 text-sm">Total FAQs:</span>
              <span className="font-bold text-orange-900">{overview.faqs.total_faqs || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-700 text-sm">Answered:</span>
              <span className="font-bold text-green-600">{overview.faqs.answered_faqs || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-700 text-sm">Rate:</span>
              <span className="font-bold text-blue-600">
                {overview.faqs.total_faqs > 0 
                  ? Math.round((overview.faqs.answered_faqs / overview.faqs.total_faqs) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">📅 Platform Timeline</h2>
          <p className="text-gray-600 mt-1">Key dates in VOSF platform history</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">🚀</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">First User Registered</h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(overview.users.first_user_date)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">👤</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Latest User Registered</h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(overview.users.latest_user_date)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Platform Growth</h4>
                <div className="text-sm text-gray-600">
                  <p>• {overview.users.total_users} total users registered</p>
                  <p>• {overview.studios.total_studios} studios listed</p>
                  <p>• {overview.connections.active_connections} active partnerships formed</p>
                  <p>• {overview.faqs.total_faqs} community questions answered</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Connected Studios */}
      {topStudios.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">🏆 Most Connected Studios</h2>
            <p className="text-gray-600 mt-1">Studios with the highest number of active partnerships</p>
          </div>
          <div className="divide-y divide-gray-200">
            {topStudios.map((studio, index) => (
              <div key={studio.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                      }`}>
                        {index < 3 ? ['🥇', '🥈', '🥉'][index] : (index + 1)}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{studio.name}</h3>
                      <p className="text-xs text-gray-500">
                        Status: {getStatusLabel(studio.status)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{studio.connection_count}</div>
                    <div className="text-xs text-gray-500">connections</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* User Status Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">👥 User Status Distribution</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {distributions.usersByStatus.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${
                      item.status === 'ACTIVE' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="font-medium text-gray-900">
                      {getStatusLabel(item.status)} Users
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{item.count}</div>
                    <div className="text-xs text-gray-500">
                      {overview.users.total_users > 0 
                        ? Math.round((item.count / overview.users.total_users) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Connection Status Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">🤝 Connection Status Distribution</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {distributions.connectionsByStatus.map((item) => (
                <div key={item.accepted} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${
                      item.accepted === 1 ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="font-medium text-gray-900">
                      {getConnectionLabel(item.accepted)} Connections
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{item.count}</div>
                    <div className="text-xs text-gray-500">
                      {overview.connections.total_connections > 0 
                        ? Math.round((item.count / overview.connections.total_connections) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">⚡ Recent Platform Activity</h2>
            <p className="text-gray-600 mt-1">Latest user registrations and platform activity</p>
          </div>
          <div className="divide-y divide-gray-200">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">👤</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{activity.name}</h3>
                        <p className="text-sm text-gray-500">
                          User registration • Status: {getStatusLabel(activity.status)}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(activity.date)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      </div>
    </>
  );
}
