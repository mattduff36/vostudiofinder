'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { parseRecipientQuery, audienceSelectionSchema } from '@/lib/email/recipients';
import { emailResponse } from '@/components/admin/emails/TemplatePlayground';
import { useState, useEffect, useCallback, useRef } from 'react';
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

  const requestController = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatching, setSelectedMatching] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const limit = 50;
  const visibleSelected = users.filter(user => selected.has(user.id)).length;

  useEffect(() => {
    try {
      const parsed = parseRecipientQuery(new URLSearchParams(window.location.search));
      const restored = { ...EMPTY_FILTERS };
      Object.entries(parsed.filters).forEach(([key, value]) => { if (key in restored) restored[key as keyof Filters] = String(value); });
      setFilters(restored); setPage(parsed.page); setReady(true);
    } catch { setError('Invalid recipient filters in this link. Clear the filters to continue.'); setLoading(false); }
  }, []);

  const loadUsers = useCallback(async () => {
    if (!ready) return;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true); setError(null);
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

      window.history.replaceState(null, '', `/admin/emails/recipients?${params.toString()}`);
      const res = await fetch(`/api/admin/emails/users?${params.toString()}`, { signal: controller.signal });
      const data = await emailResponse<{ users: Recipient[]; pagination: { total: number; totalPages: number } }>(res);
      if (!controller.signal.aborted) {
        setUsers(data.users || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 0);
      }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, filters, ready]);

  useEffect(() => {
    const timer = setTimeout(() => void loadUsers(), 250);
    return () => { clearTimeout(timer); requestController.current?.abort(); };
  }, [loadUsers]);

  useEffect(() => {
    const controller = new AbortController();
    setSelectedMatching(null);
    if (!selected.size) return () => controller.abort();
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    const timer = setTimeout(async () => {
      try {
        const data = await emailResponse<{ matchingCount: number }>(await fetch('/api/admin/emails/users', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ userIds: [...selected], filters: parseRecipientQuery(params).filters }),
        }));
        if (!controller.signal.aborted) setSelectedMatching(data.matchingCount);
      } catch { /* Unknown remains explicitly uncounted; it never changes the selected IDs. */ }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, selected]);

  const updateFilter = (key: keyof Filters, value: string) => {
    requestController.current?.abort(); setLoading(true);
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    requestController.current?.abort(); setLoading(true);
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setReady(true);
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
    setSelected(current => {
      const next = new Set(current);
      const allVisible = users.length > 0 && users.every(user => next.has(user.id));
      users.forEach(user => { if (allVisible) next.delete(user.id); else next.add(user.id); });
      return next;
    });
  };

  const createFromAudience = (fromSelected: boolean) => {
    try {
      const audience = audienceSelectionSchema.parse(fromSelected ? { mode: 'selected', userIds: [...selected] }
        : { mode: 'filters', filters: parseRecipientQuery(new URLSearchParams(Object.entries(filters).filter(([, value]) => value))).filters });
      const handoff = crypto.randomUUID();
      sessionStorage.setItem(`email-audience:${handoff}`, JSON.stringify(audience));
      router.push(`/admin/emails/campaigns/create?audience=${handoff}`);
    } catch { setError('Unable to prepare this audience. Check the filters or selection, and browser session storage.'); }
  };
  const handleCreateCampaignFromFilters = () => createFromAudience(false);

  const getOptInStatus = (user: Recipient): { label: string; color: string } => {
    if (!user.email_preferences) return { label: 'Default (In)', color: 'text-green-600' };
    if (user.email_preferences.unsubscribed_at) return { label: 'Unsubscribed', color: 'text-red-600' };
    return user.email_preferences.marketing_opt_in
      ? { label: 'Opted In', color: 'text-green-600' }
      : { label: 'Opted Out', color: 'text-red-600' };
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <>
      <AdminTabs activeTab="emails" />

      <div className="px-4 py-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.push('/admin/emails')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Email Management
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
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
              disabled={loading || !!error}
              onClick={handleCreateCampaignFromFilters}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Create Campaign from Filters
            </button>
          </div>
        </div>

        {selected.size > 0 && <div className="bg-white p-4 rounded-lg shadow-md mb-4 flex flex-wrap items-center gap-3">
          <p role="status" className="text-sm text-gray-700">{selected.size} selected; {selectedMatching === null ? 'filter membership unavailable or checking' : `${selected.size - selectedMatching} outside the current filter`}.</p>
          <button onClick={() => createFromAudience(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg">Create from selected</button>
          <button onClick={() => setSelected(new Set())} className="text-sm underline">Clear selection</button>
        </div>}
        {error && <div role="alert" className="bg-red-50 p-4 text-red-800 rounded-lg mb-4">{error} {ready
          ? <button onClick={() => void loadUsers()} className="underline">Retry</button>
          : <button onClick={resetFilters} className="underline">Clear invalid filters</button>}</div>}
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, username, or name..."
              aria-label="Search" value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">User Status</label>
              <select
                aria-label="Status" value={filters.status}
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
                aria-label="Email verified" value={filters.emailVerified}
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
                aria-label="Marketing opt in" value={filters.marketingOptIn}
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
                aria-label="Has studio" value={filters.hasStudio}
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
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Advanced Filters
          </button>

          {showAdvanced && <p className="mt-3 text-xs text-gray-500">Date ranges include both selected days in UTC. Studio filters are ignored when No Studio is selected.</p>}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Studio Verified</label>
                  <select
                    aria-label="Studio verified" disabled={filters.hasStudio === 'false'} value={filters.studioVerified}
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
                    aria-label="Studio featured" disabled={filters.hasStudio === 'false'} value={filters.studioFeatured}
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
                    aria-label="Created after (UTC)" value={filters.createdAfter}
                    onChange={e => updateFilter('createdAfter', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Created Before</label>
                  <input
                    type="date"
                    aria-label="Created before (UTC)" value={filters.createdBefore}
                    onChange={e => updateFilter('createdBefore', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last Login After</label>
                  <input
                    type="date"
                    aria-label="Last login after (UTC)" value={filters.lastLoginAfter}
                    onChange={e => updateFilter('lastLoginAfter', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last Login Before</label>
                  <input
                    type="date"
                    aria-label="Last login before (UTC)" value={filters.lastLoginBefore}
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

        {loading && users.length > 0 && <p role="status" className="mb-2 text-sm text-gray-600">Updating recipients… Previous results remain visible.</p>}
        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading && users.length === 0 ? (
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
                          aria-label="Select all users on this page" disabled={loading || !!error}
                          ref={element => { if (element) element.indeterminate = visibleSelected > 0 && visibleSelected < users.length; }}
                          checked={visibleSelected === users.length && users.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                      </th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">User</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Verified</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Marketing</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Studio</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Joined (UTC)</th>
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
                              aria-label={`Select ${user.email}`} disabled={loading || !!error}
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
                            {new Date(user.created_at).toLocaleDateString(undefined, { timeZone: 'UTC' })}
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
                    onClick={() => { setLoading(true); setPage(p => Math.max(1, p - 1)); }}
                    disabled={loading || page <= 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => { setLoading(true); setPage(p => p + 1); }}
                    disabled={loading || page >= totalPages}
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
    </>
  );
}
