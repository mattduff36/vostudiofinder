'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { Button } from '@/components/ui/Button';
import { Search, RefreshCw, Clock, AlertCircle, CheckCircle, XCircle, Trash2, Filter } from 'lucide-react';
import { formatDate } from '@/lib/date-format';
import { showSuccess, showError } from '@/lib/toast';
import { showConfirm } from '@/components/ui/ConfirmDialog';

interface PendingUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED';
  reservation_expires_at: string | null;
  payment_attempted_at: string | null;
  payment_retry_count: number;
  created_at: string;
  _count: {
    payments: number;
  };
}

export default function AdminReservationsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'EXPIRED' | ''>(''); // Default to all statuses
  const [stats, setStats] = useState({
    pending: 0,
    expiringSoon: 0,
    failedPayments: 0,
    expired: 0,
  });
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (sessionStatus === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, sessionStatus, router]);

  // Fetch pending users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/reservations?${params}`);
      if (!response.ok) throw new Error('Failed to fetch reservations');

      const data = await response.json();
      setUsers(data.users);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [session, fetchUsers]);

  const handleSearch = () => {
    fetchUsers();
  };

  const handleDeleteReservation = async (userId: string, email: string, username: string) => {
    const confirmed = await showConfirm({
      title: 'Permanent Deletion Warning',
      message: `Are you sure you want to permanently delete ${email} (@${username})?\n\nThis will:\n• Delete the user account completely\n• Delete all payment records\n• Delete any studio profiles\n• Cancel all pending reminder emails\n\nTHIS ACTION CANNOT BE UNDONE!`,
      confirmText: 'Delete Permanently',
      isDangerous: true,
    });
    
    if (!confirmed) return;

    setDeletingUserId(userId);
    setDeleteError(null);
    setDeleteSuccess(null);

    try {
      const response = await fetch(`/api/admin/reservations/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete reservation');
      }

      showSuccess(`User ${email} has been permanently deleted along with all associated data.`);
      
      // Refresh the list
      fetchUsers();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to delete reservation');
    } finally {
      setDeletingUserId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </span>
        );
      default:
        return null;
    }
  };

  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (expiresAt: string | null) => {
    const days = getDaysRemaining(expiresAt);
    if (days === null) return null;

    if (days < 0) {
      return <span className="text-red-600 font-semibold">Expired</span>;
    } else if (days === 0) {
      return <span className="text-red-600 font-semibold">Expires today</span>;
    } else if (days === 1) {
      return <span className="text-orange-600 font-semibold">1 day left</span>;
    } else if (days <= 2) {
      return <span className="text-orange-600 font-semibold">{days} days left</span>;
    } else {
      return <span className="text-gray-600">{days} days left</span>;
    }
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  if (session?.user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Tabs */}
      <AdminTabs activeTab="reservations" />

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ minWidth: '1024px' }}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Username Reservations</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage pending user signups and username reservations
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-orange-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.expiringSoon}</p>
                <p className="text-sm text-gray-600">Expiring Soon (≤2 days)</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.failedPayments}</p>
                <p className="text-sm text-gray-600">Failed Payments</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-gray-400 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
                <p className="text-sm text-gray-600">Expired</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Email or Username
              </label>
              <div className="flex h-10">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="user@example.com or username"
                  className="flex-1 h-10 px-3 rounded-l-md border border-gray-300 shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
                />
                <Button
                  onClick={handleSearch}
                  className="h-10 rounded-l-none bg-red-600 hover:bg-red-700 px-4"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Button
              onClick={fetchUsers}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            <span className="text-sm text-gray-600">
              Showing {users.length} reservations
            </span>
          </div>
        </div>

        {/* Success/Error Messages */}
        {deleteSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-sm text-green-800">{deleteSuccess}</p>
            </div>
          </div>
        )}

        {deleteError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-sm text-red-800">{deleteError}</p>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '18%' }}>
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '14%' }}>
                    Username
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '14%' }}>
                    Payment Attempts
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '12%' }}>
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '16%' }}>
                    Reservation Expires
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '8%' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || statusFilter ? 'No reservations found matching your filters' : 'No reservations found'}
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <React.Fragment key={user.id}>
                      {/* Main data row */}
                      <tr className={`hover:bg-gray-50 transition-colors ${index > 0 ? 'border-t border-gray-200' : ''}`}>
                        <td className="px-4 pt-4 pb-1 align-top">
                          <div className="text-sm font-medium text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                            {user.display_name}
                          </div>
                        </td>
                        <td className="px-4 pt-4 pb-1 whitespace-nowrap align-top">
                          <div className="text-sm font-mono text-gray-900">
                            @{user.username}
                          </div>
                        </td>
                        <td className="px-4 pt-4 pb-1 whitespace-nowrap align-top">
                          {getStatusBadge(user.status)}
                        </td>
                        <td className="px-4 pt-4 pb-1 whitespace-nowrap align-top">
                          <div className="text-sm text-gray-900">
                            {user.payment_retry_count > 0 ? (
                              <span className="text-red-600 font-semibold">
                                {user.payment_retry_count} failed
                              </span>
                            ) : user._count.payments > 0 ? (
                              <span className="text-green-600">
                                {user._count.payments} attempt{user._count.payments > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-gray-400">No attempts</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 pt-4 pb-1 whitespace-nowrap text-sm text-gray-500 align-top">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-4 pt-4 pb-1 whitespace-nowrap align-top">
                          {user.reservation_expires_at ? (
                            <div>
                              <div className="text-sm text-gray-900">
                                {formatDate(user.reservation_expires_at)}
                              </div>
                              <div className="text-xs">
                                {getExpiryStatus(user.reservation_expires_at)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 pt-4 pb-1 whitespace-nowrap text-sm align-top">
                          <Button
                            onClick={() => handleDeleteReservation(user.id, user.email, user.username)}
                            disabled={deletingUserId === user.id}
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 disabled:opacity-50"
                            title="Permanently delete user and all associated data"
                          >
                            {deletingUserId === user.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </td>
                      </tr>
                      {/* Email row - spans first 5 columns */}
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td colSpan={5} className="px-4 pt-0 pb-4">
                          <div className="text-sm text-gray-500 break-words">
                            {user.email}
                          </div>
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

