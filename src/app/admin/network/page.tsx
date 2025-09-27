'use client';

import { useState, useEffect } from 'react';

export default function AdminNetworkPage() {
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0, hasMore: false });

  useEffect(() => {
    fetchNetworkData();
  }, [pagination.offset]);

  const fetchNetworkData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString()
      });

      const response = await fetch(`/api/admin/network?${params}`); // Updated API endpoint
      if (!response.ok) {
        throw new Error('Failed to fetch network data');
      }
      
      const data = await response.json();
      setNetworkData(data);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
  };

  const getConnectionStatusBadge = (accepted: number) => {
    if (accepted === 1) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Connected
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          ⏳ Pending
        </span>
      );
    }
  };

  if (loading && pagination.offset === 0) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium">Error Loading Network Data</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <button 
          onClick={fetchNetworkData}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!networkData) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🤝 Studio Network & Connections</h1>
        <p className="text-gray-600 mt-1">
          Explore partnerships and connections within the VOSF community
        </p>
      </div>

      {/* Network Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-blue-900">Total Connections</h3>
            <div className="text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-700">
            {/* @ts-ignore */}
            {networkData.statistics?.total || 0}
          </div>
          <p className="text-blue-600 text-sm">All partnership requests</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-green-900">Active Partnerships</h3>
            <div className="text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-700">
            {/* @ts-ignore */}
            {networkData.statistics?.active || 0}
          </div>
          <p className="text-green-600 text-sm">Confirmed connections</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-yellow-900">Pending Requests</h3>
            <div className="text-yellow-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-yellow-700">
            {/* @ts-ignore */}
            {networkData.statistics?.pending || 0}
          </div>
          <p className="text-yellow-600 text-sm">Awaiting approval</p>
        </div>
      </div>

      {/* Top Connected Studios */}
      {/* @ts-ignore */}
      {networkData.topStudios && networkData.topStudios.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">🏆 Most Connected Studios</h2>
            <p className="text-gray-600 mt-1">Studios with the most active partnerships</p>
          </div>
          <div className="divide-y divide-gray-200">
            {/* @ts-ignore */}
            {networkData.topStudios.map((studio: any, index: number) => (
              <div key={studio.username || studio.id} className="p-4 hover:bg-gray-50">
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
                      <h3 className="font-bold text-gray-900">{studio.username || studio.name}</h3>
                      {studio.display_name && studio.display_name !== studio.username && (
                        <p className="text-sm text-gray-600">{studio.display_name}</p>
                      )}
                      <p className="text-xs text-gray-500">{studio.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{studio.connection_count || 0}</div>
                    <div className="text-xs text-gray-500">connections</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Connections */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">🔗 All Studio Connections</h2>
          <p className="text-gray-600 mt-1">
            Complete list of partnerships and connection requests ({pagination.total} total)
          </p>
        </div>
        <div className="divide-y divide-gray-200">
          {/* @ts-ignore */}
          {(networkData.connections || []).map((connection: any) => (
            <div key={connection.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Studio 1 */}
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {(connection.user1 || connection.studio1_username || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{connection.user1 || connection.studio1_username || 'Unknown'}</div>
                      {connection.studio1_name && connection.studio1_name !== (connection.user1 || connection.studio1_username) && (
                        <div className="text-xs text-gray-500">{connection.studio1_name}</div>
                      )}
                    </div>
                  </div>

                  {/* Connection Arrow */}
                  <div className="flex-shrink-0">
                    <span className={`text-2xl ${connection.accepted === 1 ? 'text-green-500' : 'text-yellow-500'}`}>
                      ↔
                    </span>
                  </div>

                  {/* Studio 2 */}
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-medium text-sm">
                        {(connection.user2 || connection.studio2_username || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{connection.user2 || connection.studio2_username || 'Unknown'}</div>
                      {connection.studio2_name && connection.studio2_name !== (connection.user2 || connection.studio2_username) && (
                        <div className="text-xs text-gray-500">{connection.studio2_name}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex-shrink-0 ml-4">
                  {getConnectionStatusBadge(connection.accepted)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        {pagination.hasMore && (
          <div className="p-4 bg-gray-50 text-center border-t border-gray-200">
            <button
              onClick={loadMore}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                  Loading...
                </>
              ) : (
                <>
                  Load More Connections
                  <svg className="ml-2 -mr-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}

        {/* No Results */}
        {/* @ts-ignore */}
        {(!networkData.connections || networkData.connections.length === 0) && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No connections found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No studio connections are available in the database.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}