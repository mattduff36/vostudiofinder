'use client';

import { useState, useEffect } from 'react';
import EditStudioModal from '@/components/admin/EditStudioModal';
import AdminBulkOperations from '@/components/admin/AdminBulkOperations';

interface Studio {
  id: string;
  name: string;
  description?: string;
  studio_type: string;
  studioTypes?: Array<{ studio_type: string }>;
  status: string;
  is_verified: boolean;
  is_premium: boolean;
  owner: {
    display_name: string;
    email: string;
    username: string;
  };
  created_at: string;
  updated_at: string;
}

interface StudiosResponse {
  studios: Studio[];
  pagination: {
    total: number;
    hasMore: boolean;
  };
}

export default function AdminStudiosPage() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ 
    offset: 0, 
    limit: 12, 
    total: 0, 
    hasMore: false 
  });
  const [editingStudio, setEditingStudio] = useState<Studio | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudios, setSelectedStudios] = useState<string[]>([]);

  useEffect(() => {
    fetchStudios();
  }, [search, statusFilter, pagination.offset]);

  const fetchStudios = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });

      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/admin/studios?${params}`);
      if (!response.ok) throw new Error('Failed to fetch studios');

      const data: StudiosResponse = await response.json();
      
      if (pagination.offset === 0) {
        setStudios(data.studios || []);
      } else {
        setStudios(prev => [...prev, ...(data.studios || [])]);
      }
      
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        hasMore: data.pagination?.hasMore || false
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
  };

  const handleEditStudio = (studio: Studio) => {
    setEditingStudio(studio);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingStudio(null);
  };

  const handleSaveStudio = () => {
    fetchStudios(); // Refresh the studios list
  };

  const handleDeleteStudio = async (studio: Studio) => {
    if (!confirm(`Are you sure you want to delete "${studio.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/studios/${studio.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete studio');
      }

      alert('Studio deleted successfully');
      fetchStudios(); // Refresh the studios list
    } catch (error) {
      console.error('Error deleting studio:', error);
      alert('Failed to delete studio. Please try again.');
    }
  };

  const handleSelectStudio = (studio_id: string, isSelected: boolean) => {
    setSelectedStudios(prev => 
      isSelected 
        ? [...prev, studio_id]
        : prev.filter(id => id !== studio_id)
    );
  };

  const handleSelectAll = (isSelected: boolean) => {
    setSelectedStudios(isSelected ? studios.map(studio => studio.id) : []);
  };

  const handleClearSelection = () => {
    setSelectedStudios([]);
  };

  const handleBulkAction = async (action: string, studioIds: string[]) => {
    // Add confirmation for delete action
    if (action === 'delete') {
      const count = studioIds.length;
      const confirmMessage = `Are you sure you want to delete ${count} studio${count !== 1 ? 's' : ''}? This action cannot be undone.`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    try {
      const response = await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, studioIds })
      });

      if (action === 'export') {
        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `studios_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
      }

      if (!response.ok) throw new Error('Bulk operation failed');
      
      const result = await response.json();
      alert(result.message);
      
      // Refresh the studios list
      fetchStudios();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadMore = () => {
    setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium">Error Loading Studios</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <button 
          onClick={fetchStudios}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎭 VOSF Studio Directory</h1>
          <p className="text-gray-600 mt-1 pl-4">
            {pagination.total} studios in the Voice Over Studio Finder network
          </p>
        </div>
      </div>

      {/* Bulk Operations */}
      <AdminBulkOperations
        selectedStudios={selectedStudios}
        onBulkAction={handleBulkAction}
        onClearSelection={handleClearSelection}
      />

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Studios
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search by name, owner, or description..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="sm:w-48">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={handleStatusChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Studios</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
              <option value="DRAFT">Draft Only</option>
              <option value="PENDING">Pending Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Studios Table */}
      {loading && pagination.offset === 0 ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                {/* Left side - Select All checkbox */}
                <div className="flex items-center">
                  {studios.length > 0 && (
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedStudios.length === studios.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-600">Select All</span>
                    </label>
                  )}
                </div>

                {/* Center - Studios title */}
                <h2 className="text-lg font-semibold text-gray-900">
                  Studios ({pagination.total || 0})
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Studio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studios.map((studio) => (
                    <tr key={studio.id} className={`hover:bg-gray-50 ${selectedStudios.includes(studio.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedStudios.includes(studio.id)}
                          onChange={(e) => handleSelectStudio(studio.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mr-3">
                            <span className="text-white text-sm font-bold">
                              {studio.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {studio.name}
                            </div>
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {studio.users.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {studio.studioTypes && studio.studioTypes.length > 0 
                            ? studio.studioTypes
                                .map(st => {
                                  const type = st.studio_type;
                                  if (type === 'VO_COACH') return 'C';
                                  return type.charAt(0);
                                })
                                .join('')
                            : '-'
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{studio.users.display_name}</div>
                        <div className="text-sm text-gray-500">{studio.users.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            studio.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            studio.status === 'INACTIVE' ? 'bg-red-100 text-red-800' :
                            studio.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {studio.status}
                          </span>
                          <div className="flex space-x-1">
                            {studio.is_verified && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                ✓
                              </span>
                            )}
                            {studio.is_premium && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                ⭐
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(studio.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => window.open(`/${studio.users.username}`, '_blank')}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handleEditStudio(studio)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteStudio(studio)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Load More Button */}
          {pagination.hasMore && (
            <div className="px-6 py-4 border-t border-gray-200 text-center">
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
                    Load More Studios
                    <svg className="ml-2 -mr-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}

          {/* No Results */}
          {studios.length === 0 && !loading && (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No studios found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search criteria or filters.
              </p>
            </div>
          )}
        </>
      )}

      {/* Edit Studio Modal */}
      <EditStudioModal
        studio={editingStudio}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveStudio}
      />
    </div>
  );
}

