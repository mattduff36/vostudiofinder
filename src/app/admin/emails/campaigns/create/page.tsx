'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Send, Users, FileText, Search,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle,
} from 'lucide-react';

interface EmailTemplate {
  key: string;
  name: string;
  description?: string;
  layout: 'STANDARD' | 'HERO';
  isMarketing: boolean;
  isSystem: boolean;
  subject: string;
}

interface RecipientFilters {
  status?: string;
  emailVerified?: boolean;
  hasStudio?: boolean;
  studioVerified?: boolean;
  studioFeatured?: boolean;
  marketingOptIn?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
  search?: string;
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTemplate = searchParams.get('template') || '';

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [templateKey, setTemplateKey] = useState(preselectedTemplate);
  const [filters, setFilters] = useState<RecipientFilters>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (templateKey) {
      const tpl = templates.find(t => t.key === templateKey);
      if (tpl && !name) {
        setName(tpl.name);
      }
    }
  }, [templateKey, templates]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecipientCount();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, templateKey]);

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/admin/emails/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipientCount = async () => {
    setCountLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '1');
      if (filters.status) params.set('status', filters.status);
      if (filters.emailVerified !== undefined) params.set('emailVerified', String(filters.emailVerified));
      if (filters.hasStudio !== undefined) params.set('hasStudio', String(filters.hasStudio));
      if (filters.studioVerified !== undefined) params.set('studioVerified', String(filters.studioVerified));
      if (filters.studioFeatured !== undefined) params.set('studioFeatured', String(filters.studioFeatured));
      if (filters.marketingOptIn !== undefined) params.set('marketingOptIn', String(filters.marketingOptIn));
      if (filters.createdAfter) params.set('createdAfter', filters.createdAfter);
      if (filters.createdBefore) params.set('createdBefore', filters.createdBefore);
      if (filters.lastLoginAfter) params.set('lastLoginAfter', filters.lastLoginAfter);
      if (filters.lastLoginBefore) params.set('lastLoginBefore', filters.lastLoginBefore);
      if (filters.search) params.set('search', filters.search);

      const res = await fetch(`/api/admin/emails/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecipientCount(data.pagination?.total ?? null);
      }
    } catch {
      setRecipientCount(null);
    } finally {
      setCountLoading(false);
    }
  };

  const selectedTemplate = templates.find(t => t.key === templateKey);

  const handleCreate = async (startImmediately: boolean) => {
    if (!name.trim() || !templateKey) {
      setError('Campaign name and template are required.');
      return;
    }
    if (recipientCount === 0) {
      setError('No recipients match the current filters.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/emails/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          templateKey,
          filters,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create campaign');
      }

      const data = await res.json();
      const campaignId = data.campaign?.id;

      if (startImmediately && campaignId) {
        const startRes = await fetch(`/api/admin/emails/campaigns/${campaignId}/start`, {
          method: 'POST',
        });
        if (!startRes.ok) {
          const startData = await startRes.json();
          throw new Error(startData.error || 'Campaign created but failed to start');
        }
      }

      router.push(`/admin/emails/campaigns/${campaignId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  };

  const updateFilter = (key: keyof RecipientFilters, value: any) => {
    setFilters(prev => {
      const next = { ...prev };
      if (value === '' || value === undefined || value === null) {
        delete next[key];
      } else {
        (next as any)[key] = value;
      }
      return next;
    });
  };

  return (
    <>
      <AdminTabs activeTab="emails" />

      <div className="px-4 py-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/admin/emails')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Email Management
        </button>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Create Campaign</h1>
          <p className="text-sm text-gray-600">
            Select a template, configure recipients, and send or save as draft.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Campaign Name */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Legacy User Announcement - February 2026"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {/* Template Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <FileText className="w-4 h-4 inline mr-1" />
            Email Template
          </label>
          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading templates...</div>
          ) : (
            <div className="space-y-2">
              {templates.map(tpl => (
                <button
                  key={tpl.key}
                  onClick={() => setTemplateKey(tpl.key)}
                  className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                    templateKey === tpl.key
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{tpl.name}</div>
                      {tpl.description && (
                        <div className="text-sm text-gray-500 mt-1">{tpl.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      {tpl.isMarketing && (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                          Marketing
                        </span>
                      )}
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        {tpl.layout}
                      </span>
                      {templateKey === tpl.key && (
                        <CheckCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recipient Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              <Users className="w-4 h-4 inline mr-1" />
              Recipients
            </label>
            <div className="flex items-center gap-3">
              {countLoading ? (
                <span className="text-sm text-gray-500">Counting...</span>
              ) : recipientCount !== null ? (
                <span className="text-sm font-medium text-gray-900">
                  {recipientCount.toLocaleString()} recipient{recipientCount !== 1 ? 's' : ''}
                </span>
              ) : null}
            </div>
          </div>

          {selectedTemplate?.isMarketing && (
            <div className="bg-purple-50 border-l-4 border-purple-400 p-3 rounded-r-lg mb-4">
              <p className="text-sm text-purple-700">
                This is a marketing template. Only users who are opted in to marketing emails will receive it.
                Unsubscribed users are automatically excluded when the campaign starts.
              </p>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, username, or name..."
              value={filters.search || ''}
              onChange={e => updateFilter('search', e.target.value || undefined)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">User Status</label>
              <select
                value={filters.status || ''}
                onChange={e => updateFilter('status', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email Verified</label>
              <select
                value={filters.emailVerified === undefined ? '' : String(filters.emailVerified)}
                onChange={e => {
                  const v = e.target.value;
                  updateFilter('emailVerified', v === '' ? undefined : v === 'true');
                }}
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
                value={filters.marketingOptIn === undefined ? '' : String(filters.marketingOptIn)}
                onChange={e => {
                  const v = e.target.value;
                  updateFilter('marketingOptIn', v === '' ? undefined : v === 'true');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              >
                <option value="">Any</option>
                <option value="true">Opted In</option>
                <option value="false">Opted Out</option>
              </select>
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            {showAdvancedFilters ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Advanced Filters
          </button>

          {showAdvancedFilters && (
            <div className="space-y-4 border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Has Studio</label>
                  <select
                    value={filters.hasStudio === undefined ? '' : String(filters.hasStudio)}
                    onChange={e => {
                      const v = e.target.value;
                      updateFilter('hasStudio', v === '' ? undefined : v === 'true');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Any</option>
                    <option value="true">Has Studio</option>
                    <option value="false">No Studio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Studio Verified</label>
                  <select
                    value={filters.studioVerified === undefined ? '' : String(filters.studioVerified)}
                    onChange={e => {
                      const v = e.target.value;
                      updateFilter('studioVerified', v === '' ? undefined : v === 'true');
                    }}
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
                    value={filters.studioFeatured === undefined ? '' : String(filters.studioFeatured)}
                    onChange={e => {
                      const v = e.target.value;
                      updateFilter('studioFeatured', v === '' ? undefined : v === 'true');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Any</option>
                    <option value="true">Featured</option>
                    <option value="false">Not Featured</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Created After</label>
                  <input
                    type="date"
                    value={filters.createdAfter || ''}
                    onChange={e => updateFilter('createdAfter', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Created Before</label>
                  <input
                    type="date"
                    value={filters.createdBefore || ''}
                    onChange={e => updateFilter('createdBefore', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last Login After</label>
                  <input
                    type="date"
                    value={filters.lastLoginAfter || ''}
                    onChange={e => updateFilter('lastLoginAfter', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last Login Before</label>
                  <input
                    type="date"
                    value={filters.lastLoginBefore || ''}
                    onChange={e => updateFilter('lastLoginBefore', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={() => router.push('/admin/emails')}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleCreate(false)}
              disabled={creating || !name.trim() || !templateKey}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save as Draft
            </button>
            <button
              onClick={() => {
                if (recipientCount && recipientCount > 0) {
                  const confirmed = window.confirm(
                    `This will immediately start sending to ${recipientCount.toLocaleString()} recipient${recipientCount !== 1 ? 's' : ''}. Continue?`
                  );
                  if (confirmed) handleCreate(true);
                }
              }}
              disabled={creating || !name.trim() || !templateKey || recipientCount === 0}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {creating ? 'Creating...' : 'Create & Start Sending'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
