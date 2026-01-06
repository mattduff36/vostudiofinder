'use client';

import { useState, useEffect } from 'react';
import EditStudioModal from '@/components/admin/EditStudioModal';
import AddStudioModal from '@/components/admin/AddStudioModal';
import AdminBulkOperations from '@/components/admin/AdminBulkOperations';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { getCompletionBgColor } from '@/lib/profile-completion';
import { formatRelativeDate, formatDate } from '@/lib/date-format';

interface Studio {
  id: string;
  name: string;
  description?: string;
  studio_type: string;
  studio_studio_types?: Array<{ studio_type: string }>;
  status: string;
  is_verified: boolean;
  is_premium: boolean;
  is_featured?: boolean;
  is_spotlight?: boolean;
  is_profile_visible?: boolean;
  profile_completion?: number;
  last_login?: string | null;
  membership_expires_at?: string | null;
  users: {
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
    limit: 80, 
    total: 0, 
    hasMore: false 
  });
  const [editingStudio, setEditingStudio] = useState<Studio | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudios, setSelectedStudios] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchStudios();
  }, [search, statusFilter, pagination.offset, sortBy, sortOrder]);

  const fetchStudios = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
        sortBy: sortBy,
        sortOrder: sortOrder,
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
    setStudios([]); // Clear studios to prevent duplicates
    setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setStudios([]); // Clear studios to prevent duplicates
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
    setStudios([]); // Clear studios to prevent duplicates
    setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
    // fetchStudios will be called automatically by the useEffect
  };

  const handleDeleteStudio = async (studio: Studio) => {
    if (!confirm(`⚠️ WARNING: This will permanently delete "${studio.name}" AND the associated user account!\n\nThis includes:\n• User account\n• Studio profile\n• All images\n• All reviews\n• All related data\n\nThis action CANNOT be undone. Are you sure?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/studios/${studio.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete studio and user account');
      }

      alert('Studio and user account deleted successfully');
      setStudios([]); // Clear studios to prevent duplicates
      setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
      // fetchStudios will be called automatically by the useEffect
    } catch (error) {
      console.error('Error deleting studio:', error);
      alert('Failed to delete studio and user account. Please try again.');
    }
  };

  const handleToggleVisibility = async (studio: Studio, isVisible: boolean) => {
    try {
      const response = await fetch(`/api/admin/studios/${studio.id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible }),
      });

      if (!response.ok) {
        throw new Error('Failed to update visibility');
      }

      // Update the local state
      setStudios(prev => prev.map(s => 
        s.id === studio.id ? { ...s, is_profile_visible: isVisible } : s
      ));

      setSuccessMessage(`Profile visibility ${isVisible ? 'enabled' : 'disabled'} for ${studio.name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Failed to update visibility. Please try again.');
    }
  };

  const handleToggleVerified = async (studio: Studio, isVerified: boolean) => {
    try {
      const response = await fetch(`/api/admin/studios/${studio.id}/verified`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified }),
      });

      if (!response.ok) {
        throw new Error('Failed to update verified status');
      }

      // Update the local state
      setStudios(prev => prev.map(s => 
        s.id === studio.id ? { ...s, is_verified: isVerified } : s
      ));

      setSuccessMessage(`Studio ${isVerified ? 'verified' : 'unverified'}: ${studio.name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error toggling verified status:', error);
      alert('Failed to update verified status. Please try again.');
    }
  };

  const handleToggleFeatured = async (studio: Studio, isFeatured: boolean) => {
    try {
      const response = await fetch(`/api/admin/studios/${studio.id}/featured`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured }),
      });

      if (!response.ok) {
        throw new Error('Failed to update featured status');
      }

      // Update the local state
      setStudios(prev => prev.map(s => 
        s.id === studio.id ? { ...s, is_featured: isFeatured } : s
      ));

      setSuccessMessage(`Studio ${isFeatured ? 'featured' : 'unfeatured'}: ${studio.name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Failed to update featured status. Please try again.');
    }
  };

  const handleToggleStatus = async (studio: Studio, newStatus: 'ACTIVE' | 'INACTIVE') => {
    try {
      const response = await fetch(`/api/admin/studios/${studio.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Update the local state
      setStudios(prev => prev.map(s => 
        s.id === studio.id ? { ...s, status: newStatus } : s
      ));

      setSuccessMessage(`Studio status updated to ${newStatus}: ${studio.name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with ascending order
      setSortBy(field);
      setSortOrder('asc');
    }
    // Clear studios and reset pagination
    setStudios([]);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
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
      const confirmMessage = `⚠️ WARNING: This will permanently delete ${count} studio${count !== 1 ? 's' : ''} AND their associated user accounts!\n\nThis includes:\n• ${count} user account${count !== 1 ? 's' : ''}\n• ${count} studio profile${count !== 1 ? 's' : ''}\n• All images, reviews, and related data\n\nThis action CANNOT be undone. Are you sure?`;
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
    <>
      <AdminTabs activeTab="studios" />
      <div className="p-8 min-h-screen">
        <div className="max-w-full mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Studio Management</h1>
              <p className="text-gray-600 mt-2">
            {pagination.total} studios in the Voice Over Studio Finder network
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Studio
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

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
          <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('name')}
                      title="Click to sort by studio name"
                    >
                      Studio{getSortIcon('name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('owner')}
                      title="Click to sort by owner name"
                    >
                      Owner{getSortIcon('owner')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('status')}
                      title="Click to sort by status (Active/Inactive)"
                    >
                      Status{getSortIcon('status')}
                    </th>
                    <th 
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('is_profile_visible')}
                      title="Click to sort by visibility status"
                    >
                      Visible{getSortIcon('is_profile_visible')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('profile_completion')}
                      title="Click to sort by profile completion percentage"
                    >
                      Complete{getSortIcon('profile_completion')}
                    </th>
                    <th 
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('is_verified')}
                      title="Click to sort by verified status"
                    >
                      Verified{getSortIcon('is_verified')}
                    </th>
                    <th 
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('is_featured')}
                      title="Click to sort by featured status"
                    >
                      Featured{getSortIcon('is_featured')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('last_login')}
                      title="Click to sort by last login date"
                    >
                      Last Login{getSortIcon('last_login')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      title="Membership expiry date"
                    >
                      Membership Expires
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('updated_at')}
                    >
                      Updated{getSortIcon('updated_at')}
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
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mr-3">
                            <span className="text-white text-sm font-bold">
                              {studio.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 line-clamp-2">
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
                          {studio.studio_studio_types && studio.studio_studio_types.length > 0 
                            ? studio.studio_studio_types
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
                        <button
                          onClick={() => handleToggleStatus(studio, studio.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                          className={`relative inline-flex h-8 w-24 items-center justify-center rounded-full text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            studio.status === 'ACTIVE' 
                              ? 'bg-green-600 text-white focus:ring-green-500' 
                              : 'bg-red-600 text-white focus:ring-red-500'
                          }`}
                          title={`Click to toggle status (currently ${studio.status})`}
                        >
                          {studio.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                        {studio.is_spotlight && (
                          <span 
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800 cursor-help mt-1" 
                            title="Spotlight Studio – highlighted in network"
                          >
                            💡 Spotlight
                          </span>
                        )}
                      </td>
                      {/* Profile Visible Toggle */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleToggleVisibility(studio, !studio.is_profile_visible)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            studio.is_profile_visible ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                          title={studio.is_profile_visible ? 'Profile is visible - click to hide' : 'Profile is hidden - click to show'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              studio.is_profile_visible ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      {/* Profile Completion */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                            <div
                              className={`h-2 rounded-full transition-all ${getCompletionBgColor(studio.profile_completion || 0)}`}
                              style={{ width: `${studio.profile_completion || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700 w-8">
                            {studio.profile_completion || 0}%
                          </span>
                        </div>
                      </td>
                      {/* Verified Toggle */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleToggleVerified(studio, !studio.is_verified)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                            studio.is_verified ? 'bg-green-600' : 'bg-gray-300'
                          }`}
                          title={studio.is_verified ? 'Studio is verified - click to unverify' : 'Studio is not verified - click to verify'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              studio.is_verified ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      {/* Featured Toggle */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleToggleFeatured(studio, !studio.is_featured)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${
                            studio.is_featured ? 'bg-yellow-500' : 'bg-gray-300'
                          }`}
                          title={studio.is_featured ? 'Studio is featured - click to unfeature' : 'Studio is not featured - click to feature'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              studio.is_featured ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      {/* Last Login */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {studio.last_login ? formatRelativeDate(studio.last_login) : (
                          <span className="text-gray-400 italic">No data</span>
                        )}
                      </td>
                      {/* Membership Expires */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {studio.membership_expires_at ? (
                          <span className={
                            new Date(studio.membership_expires_at) < new Date()
                              ? 'text-red-600 font-medium'
                              : new Date(studio.membership_expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                              ? 'text-orange-600 font-medium'
                              : ''
                          }>
                            {formatDate(studio.membership_expires_at)}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">—</span>
                        )}
                      </td>
                      {/* Updated Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(studio.updated_at)}
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

      <AddStudioModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(message) => {
          setSuccessMessage(message);
          setStudios([]);
          setPagination(prev => ({ ...prev, offset: 0 }));
          setTimeout(() => setSuccessMessage(null), 10000);
        }}
      />
        </div>
      </div>
    </>
  );
}

