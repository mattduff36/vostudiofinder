'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, Search, ChevronDown, ChevronUp,
  Send, CheckCircle, XCircle,
} from 'lucide-react';

interface Recipient {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  email_verified: boolean;
  status: string;
  created_at: string;
  last_login: string | null;
  studio_profiles: { id: string; name: string; is_featured: boolean } | null;
  email_preferences: { marketing_opt_in: boolean; unsubscribed_at: string | null } | null;
}

interface Filters {
  status: string;
  emailVerified: string;
  hasStudio: string;
  studioVerified: string;
  studioFeatured: string;
  marketingOptIn: string;
  createdAfter: string;
  createdBefore: string;
  lastLoginAfter: string;
  lastLoginBefore: string;
  search: string;
}

const EMPTY_FILTERS: Filters = {
  status: '',
  emailVerified: '',
  hasStudio: '',
  studioVerified: '',
  studioFeatured: '',
  marketingOptIn: '',
  createdAfter: '',
  createdBefore: '',
  lastLoginAfter: '',
  lastLoginBefore: '',
  search: '',
};

export default function RecipientsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Recipient[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const limit = 50;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (filters.status) params.set('status', filters.status);
      if (filters.emailVerified) params.set('emailVerified', filters.emailVerified);
      if (filters.hasStudio) params.set('hasStudio', filters.hasStudio);
      if (filters.studioVerified) params.set('studioVerified', filters.studioVerified);
      if (filters.studioFeatured) params.set('studioFeatured', filters.studioFeatured);
      if (filters.marketingOptIn) params.set('marketingOptIn', filters.marketingOptIn);
      if (filters.createdAfter) params.set('createdAfter', filters.createdAfter);
      if (filters.createdBefore) params.set('createdBefore', filters.createdBefore);
      if (filters.lastLoginAfter) params.set('lastLoginAfter', filters.lastLoginAfter);
      if (filters.lastLoginBefore) params.set('lastLoginBefore', filters.lastLoginBefore);
      if (filters.search) params.set('search', filters.search);

      const res = await fetch(`/api/admin/emails/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 0);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map(u => u.id)));
    }
  };

  const handleCreateCampaignFromFilters = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.set(key, val);
    });
    router.push(`/admin/emails/campaigns/create?${params.toString()}`);
  };

  const getOptInStatus = (user: Recipient): { label: string; color: string } => {
    if (!user.email_preferences) return { label: 'Default (In)', color: 'text-green-600' };
    if (user.email_preferences.unsubscribed_at) return { label: 'Unsubscribed', color: 'text-red-600' };
    return user.email_preferences.marketing_opt_in
      ? { label: 'Opted In', color: 'text-green-600' }
      : { label: 'Opted Out', color: 'text-red-600' };
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="px-4 py-4 md:p-6">
      <AdminTabs activeTab="emails" />

      <div className="max-w-7xl mx-auto mt-4 md:mt-6">
        <button
          onClick={() => router.push('/admin/emails')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Email Management
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Recipients</h1>
              <p className="text-sm text-gray-600 mt-1">
                Browse, filter, and select users for email campaigns.
                {total > 0 && (
                  <span className="ml-1 font-medium">{total.toLocaleString()} user{total !== 1 ? 's' : ''} found.</span>
                )}
              </p>
            </div>
            <button
              onClick={handleCreateCampaignFromFilters}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Create Campaign from Filters
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, username, or name..."
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">User Status</label>
              <select
                value={filters.status}
                onChange={e => updateFilter('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              >
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email Verified</label>
              <select
                value={filters.emailVerified}
                onChange={e => updateFilter('emailVerified', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              >
                <option value="">Any</option>
                <option value="true">Verified</option>
                <option value="false">Not Verified</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Marketing Opt-In</label>
              <select
                value={filters.marketingOptIn}
                onChange={e => updateFilter('marketingOptIn', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              >
                <option value="">Any</option>
                <option value="true">Opted In</option>
                <option value="false">Opted Out</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Has Studio</label>
              <select
                value={filters.hasStudio}
                onChange={e => updateFilter('hasStudio', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              >
                <option value="">Any</option>
                <option value="true">Has Studio</option>
                <option value="false">No Studio</option>
              </select>
            </div>
          </div>

          {/* Advanced Filters */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Advanced Filters
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Studio Verified</label>
                  <select
                    value={filters.studioVerified}
                    onChange={e => updateFilter('studioVerified', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Any</option>
                    <option value="true">Verified</option>
                    <option value="false">Not Verified</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Studio Featured</label>
                  <select
                    value={filters.studioFeatured}
                    onChange={e => updateFilter('studioFeatured', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Any</option>
                    <option value="true">Featured</option>
                    <option value="false">Not Featured</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Created After</label>
                  <input
                    type="date"
                    value={filters.createdAfter}
                    onChange={e => updateFilter('createdAfter', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Created Before</label>
                  <input
                    type="date"
                    value={filters.createdBefore}
                    onChange={e => updateFilter('createdBefore', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last Login After</label>
                  <input
                    type="date"
                    value={filters.lastLoginAfter}
                    onChange={e => updateFilter('lastLoginAfter', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last Login Before</label>
                  <input
                    type="date"
                    value={filters.lastLoginBefore}
                    onChange={e => updateFilter('lastLoginBefore', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-3 text-sm text-red-600 hover:text-red-700 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent" />
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No users match the current filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selected.size === users.length && users.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                      </th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">User</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Verified</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Marketing</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Studio</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => {
                      const optIn = getOptInStatus(user);
                      return (
                        <tr
                          key={user.id}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selected.has(user.id)}
                              onChange={() => toggleSelect(user.id)}
                              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{user.email}</div>
                            <div className="text-xs text-gray-500">
                              {user.display_name || '—'}
                              {user.username ? ` (@${user.username})` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                              user.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {user.email_verified ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400" />
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-medium ${optIn.color}`}>
                              {optIn.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {user.studio_profiles ? (
                              <span className="text-xs">
                                {user.studio_profiles.name}
                                {user.studio_profiles.is_featured && (
                                  <span className="ml-1 text-yellow-600">★</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer: selection info + pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600">
                  {selected.size > 0 ? (
                    <span>{selected.size} selected</span>
                  ) : (
                    <span>
                      Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
