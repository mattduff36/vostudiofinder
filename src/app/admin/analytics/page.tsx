'use client';

import { useState, useEffect } from 'react';
import { AdminTabs } from '@/components/admin/AdminTabs';

interface AnalyticsData {
  overview: {
    total_users: number;
    total_studios: number;
    total_reviews: number;
    total_contacts: number;
    active_studios: number;
    verified_studios: number;
    studios_with_profiles: number;
    users_with_profiles: number;
    accepted_contacts: number;
    avg_rating: number;
    first_user_date: string | null;
    latest_user_date: string | null;
  };
  studios: {
    by_status: Array<{ status: string; count: number }>;
    top_rated: Array<{
      id: string;
      name: string;
      status: string;
      is_verified: boolean;
      review_count: number;
      avg_rating: number;
    }>;
    recent: Array<{
      id: string;
      name: string;
      status: string;
      is_verified: boolean;
      created_at: string;
    }>;
  };
  users: {
    by_role: Array<{ role: string; count: number }>;
    recent: Array<{
      id: string;
      name: string;
      role: string;
      created_at: string;
    }>;
  };
  contacts: {
    by_status: Array<{ status: string; accepted: number; count: number }>;
    total: number;
    accepted: number;
    pending: number;
    acceptance_rate: number;
  };
  connection_methods: {
    standard: Array<{ id: string; label: string; count: number }>;
    custom: Array<{ method: string; count: number }>;
    total_users_with_custom: number;
    unique_custom_methods: number;
  };
  geographic: {
    top_locations: Array<{ location: string; count: number }>;
    total_locations: number;
    studios_with_location: number;
  };
  rates: {
    profiles_with_rates: number;
    avg_tier_1: number;
    avg_tier_2: number;
    avg_tier_3: number;
  };
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

  const formatDate = (dateString: string | null) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-8">
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

  const { overview, studios, users, contacts, connection_methods, geographic, rates } = analyticsData;

  return (
    <>
      <AdminTabs activeTab="analytics" />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h1 className="text-3xl font-bold text-gray-900">📊 VO Studio Finder Analytics</h1>
            <p className="text-gray-600 mt-2">
              Comprehensive insights and statistics for the Voice Over Studio Finder platform
            </p>
            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <span>First User: {formatDate(overview.first_user_date)}</span>
              <span>•</span>
              <span>Latest User: {formatDate(overview.latest_user_date)}</span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Users */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-blue-900">👥 Users</h3>
                <div className="text-3xl">👤</div>
              </div>
              <div className="text-3xl font-bold text-blue-900">{overview.total_users}</div>
              <div className="mt-3 pt-3 border-t border-blue-200 text-sm text-blue-700">
                {overview.users_with_profiles} with profiles
              </div>
            </div>

            {/* Studios */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-green-900">🎙️ Studios</h3>
                <div className="text-3xl">🎭</div>
              </div>
              <div className="text-3xl font-bold text-green-900">{overview.total_studios}</div>
              <div className="mt-3 pt-3 border-t border-green-200 space-y-1">
                <div className="flex justify-between text-sm text-green-700">
                  <span>Active:</span>
                  <span className="font-semibold">{overview.active_studios}</span>
                </div>
                <div className="flex justify-between text-sm text-green-700">
                  <span>Verified:</span>
                  <span className="font-semibold">{overview.verified_studios}</span>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-yellow-900">⭐ Reviews</h3>
                <div className="text-3xl">📝</div>
              </div>
              <div className="text-3xl font-bold text-yellow-900">{overview.total_reviews}</div>
              <div className="mt-3 pt-3 border-t border-yellow-200 text-sm text-yellow-700">
                Avg Rating: <span className="font-semibold">{overview.avg_rating.toFixed(1)}</span>/5
              </div>
            </div>

            {/* Contacts */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-purple-900">🤝 Contacts</h3>
                <div className="text-3xl">✉️</div>
              </div>
              <div className="text-3xl font-bold text-purple-900">{overview.total_contacts}</div>
              <div className="mt-3 pt-3 border-t border-purple-200 space-y-1">
                <div className="flex justify-between text-sm text-purple-700">
                  <span>Accepted:</span>
                  <span className="font-semibold">{contacts.accepted}</span>
                </div>
                <div className="flex justify-between text-sm text-purple-700">
                  <span>Rate:</span>
                  <span className="font-semibold">{contacts.acceptance_rate}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Connection Methods Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Standard Connection Methods */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                <h2 className="text-xl font-bold text-gray-900">🔗 Connection Methods Usage</h2>
                <p className="text-gray-600 text-sm mt-1">How many studios use each connection method</p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {connection_methods.standard.map((method, index) => (
                    <div key={method.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          index < 3 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900">{method.label}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                            style={{ 
                              width: `${Math.min((method.count / overview.studios_with_profiles) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-lg font-bold text-gray-900 w-12 text-right">{method.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Connection Methods */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <h2 className="text-xl font-bold text-gray-900">✨ Custom Connection Methods</h2>
                <p className="text-gray-600 text-sm mt-1">User-added custom methods tracking trends</p>
                <div className="mt-3 flex items-center space-x-4 text-sm">
                  <span className="text-purple-700">
                    <strong>{connection_methods.unique_custom_methods}</strong> unique methods
                  </span>
                  <span className="text-purple-700">•</span>
                  <span className="text-purple-700">
                    <strong>{connection_methods.total_users_with_custom}</strong> total uses
                  </span>
                </div>
              </div>
              <div className="p-6">
                {connection_methods.custom.length > 0 ? (
                  <div className="space-y-3">
                    {connection_methods.custom.map((method, index) => (
                      <div key={method.method} className="flex items-center justify-between p-3 rounded-lg hover:bg-purple-50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-orange-600' : 'bg-purple-500'
                          }`}>
                            {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{method.method}</h3>
                            <p className="text-xs text-gray-500">Custom method</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-purple-600">{method.count}</div>
                          <div className="text-xs text-gray-500">
                            {method.count === 1 ? 'user' : 'users'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No custom connection methods yet</p>
                    <p className="text-sm mt-1">Users can add their preferred methods</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Rated Studios */}
          {studios.top_rated.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
                <h2 className="text-xl font-bold text-gray-900">🏆 Top Rated Studios</h2>
                <p className="text-gray-600 text-sm mt-1">Studios with the highest average ratings</p>
              </div>
              <div className="divide-y divide-gray-200">
                {studios.top_rated.map((studio, index) => (
                  <div key={studio.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : 
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' : 
                          index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 
                          'bg-gradient-to-br from-blue-400 to-blue-600'
                        }`}>
                          {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-gray-900">{studio.name}</h3>
                            {studio.is_verified && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                                ✓ Verified
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              studio.status === 'ACTIVE' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {studio.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {studio.review_count} {studio.review_count === 1 ? 'review' : 'reviews'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          <span className="text-2xl font-bold text-yellow-500">{studio.avg_rating.toFixed(1)}</span>
                          <span className="text-yellow-500">⭐</span>
                        </div>
                        <div className="text-xs text-gray-500">Rating</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Geographic Distribution */}
          {geographic.top_locations.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-teal-50">
                <h2 className="text-xl font-bold text-gray-900">🌍 Geographic Distribution</h2>
                <p className="text-gray-600 text-sm mt-1">Where studios are located</p>
                <div className="mt-2 text-sm text-gray-600">
                  <strong>{geographic.total_locations}</strong> unique locations • <strong>{geographic.studios_with_location}</strong> studios with location data
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {geographic.top_locations.map((location, index) => (
                    <div key={location.location} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900">{location.location}</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">{location.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Rate Tier Analysis */}
          {rates.profiles_with_rates > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-green-50">
                <h2 className="text-xl font-bold text-gray-900">💰 Rate Tier Analysis</h2>
                <p className="text-gray-600 text-sm mt-1">Average rates across all studios</p>
                <div className="mt-2 text-sm text-gray-600">
                  Based on <strong>{rates.profiles_with_rates}</strong> profiles with rate information
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-lg border border-emerald-200">
                    <h3 className="text-sm font-medium text-emerald-700 mb-2">Tier 1 (Basic)</h3>
                    <div className="text-3xl font-bold text-emerald-900">£{rates.avg_tier_1}</div>
                    <p className="text-xs text-emerald-600 mt-1">Average per hour</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-medium text-blue-700 mb-2">Tier 2 (Standard)</h3>
                    <div className="text-3xl font-bold text-blue-900">£{rates.avg_tier_2}</div>
                    <p className="text-xs text-blue-600 mt-1">Average per hour</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                    <h3 className="text-sm font-medium text-purple-700 mb-2">Tier 3 (Premium)</h3>
                    <div className="text-3xl font-bold text-purple-900">£{rates.avg_tier_3}</div>
                    <p className="text-xs text-purple-600 mt-1">Average per hour</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Studio Status Distribution */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">📊 Studio Status</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {studios.by_status.map((item) => {
                    const percentage = overview.total_studios > 0 
                      ? Math.round((item.count / overview.total_studios) * 100)
                      : 0;
                    return (
                      <div key={item.status}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-900">{item.status}</span>
                          <span className="text-sm text-gray-600">{item.count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              item.status === 'ACTIVE' ? 'bg-green-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* User Role Distribution */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">👥 User Roles</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {users.by_role.map((item) => {
                    const percentage = overview.total_users > 0 
                      ? Math.round((item.count / overview.total_users) * 100)
                      : 0;
                    return (
                      <div key={item.role}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-900">{item.role}</span>
                          <span className="text-sm text-gray-600">{item.count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              item.role === 'ADMIN' ? 'bg-red-500' : 
                              item.role === 'STUDIO_OWNER' ? 'bg-blue-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Recent Studios */}
            {studios.recent.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">🆕 Recent Studios</h2>
                  <p className="text-gray-600 text-sm mt-1">Latest studio registrations</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {studios.recent.map((studio) => (
                    <div key={studio.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900">{studio.name}</h3>
                            {studio.is_verified && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{formatDate(studio.created_at)}</p>
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
            {users.recent.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">👤 Recent Users</h2>
                  <p className="text-gray-600 text-sm mt-1">Latest user registrations</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {users.recent.map((user) => (
                    <div key={user.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{user.name}</h3>
                          <p className="text-sm text-gray-500">{formatDate(user.created_at)}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          user.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 
                          user.role === 'STUDIO_OWNER' ? 'bg-blue-100 text-blue-800' : 
                          'bg-purple-100 text-purple-800'
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
