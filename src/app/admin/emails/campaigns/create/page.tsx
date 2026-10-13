'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { useState, useEffect, useRef, Suspense } from 'react';
import { audienceSelectionSchema, parseRecipientQuery } from '@/lib/email/recipients';
import { emailResponse } from '@/components/admin/emails/TemplatePlayground';
import { runCampaignAttempt, describeCampaignExclusions, type CampaignReview, type StoredCampaignAttempt } from '@/lib/email/campaign-client';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Send, Users, FileText, Search,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle, RotateCcw,
  UserMinus, X, Plus,
} from 'lucide-react';

interface EmailTemplate {
  key: string;
  name: string;
  description?: string;
  layout: 'STANDARD' | 'HERO';
  isMarketing: boolean;
  isSystem: boolean;
  subject: string;
  campaignSupported: boolean;
}

interface RecipientFilters {
  status?: string | undefined;
  emailVerified?: boolean | undefined;
  hasStudio?: boolean | undefined;
  studioVerified?: boolean | undefined;
  studioFeatured?: boolean | undefined;
  marketingOptIn?: boolean | undefined;
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
  lastLoginAfter?: string | undefined;
  lastLoginBefore?: string | undefined;
  search?: string | undefined;
  excludedEmails?: string[] | undefined;
}

interface UserSearchResult {
  id: string;
  email: string;
  username: string;
  display_name: string;
}

function CreateCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTemplate = searchParams.get('template') || '';
  const audienceHandoff = searchParams.get('audience');

  const [initialState] = useState(() => {
    try {
      const query = new URLSearchParams(searchParams);
      query.delete('template'); query.delete('audience');
      return { filters: parseRecipientQuery(query).filters as RecipientFilters, error: null };
    } catch { return { filters: {} as RecipientFilters, error: 'This campaign link contains invalid filters. Clear those filters or return to Recipients to select the audience again.' }; }
  });
  const initialFilters = initialState.filters;
  const hasInitialFilters = Object.keys(initialFilters).length > 0;

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(initialState.error);
  const [invalidInitialFilters, setInvalidInitialFilters] = useState(!!initialState.error);

  const [name, setName] = useState('');
  const [templateKey, setTemplateKey] = useState(preselectedTemplate);
  const [filters, setFilters] = useState<RecipientFilters>(initialFilters);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(hasInitialFilters);
  const [review, setReview] = useState<(CampaignReview & { inputKey: string }) | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[] | null>(null);
  const [handoffReady, setHandoffReady] = useState(false);
  const [attempt, setAttempt] = useState<StoredCampaignAttempt | null>(null);
  const createPending = useRef(false);
  const attemptRef = useRef<StoredCampaignAttempt | null>(null);
  const attemptStorageKey = `email-campaign-create:${audienceHandoff || preselectedTemplate || 'new'}`;
  const [countLoading, setCountLoading] = useState(false);
  const [autoRetry, setAutoRetry] = useState(false);
  const [maxRetries, setMaxRetries] = useState(3);

  const [excludedEmails, setExcludedEmails] = useState<string[]>([]);
  const [excludeSearch, setExcludeSearch] = useState('');
  const [excludeResults, setExcludeResults] = useState<UserSearchResult[]>([]);
  const [excludeSearching, setExcludeSearching] = useState(false);
  const [showExcludeSection, setShowExcludeSection] = useState(false);
  const [bulkExcludeText, setBulkExcludeText] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);

  const audience = selectedUserIds ? { mode: 'selected', userIds: selectedUserIds, excludedEmails }
    : { mode: 'filters', filters: { ...filters, ...(excludedEmails.length ? { excludedEmails } : {}) } };
  const reviewKey = JSON.stringify({ templateKey, audience });
  const recipientCount = review?.inputKey === reviewKey ? review.eligibleCount : null;

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/admin/emails/templates', { signal: controller.signal })
      .then(response => emailResponse<{ templates: EmailTemplate[] }>(response))
      .then(data => { if (!controller.signal.aborted) setTemplates(data.templates); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Templates unavailable'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    try {
      if (invalidInitialFilters) throw new Error(initialState.error!);
      const handoff = audienceHandoff;
      if (handoff) {
        const saved = sessionStorage.getItem(`email-audience:${handoff}`);
        if (!saved) throw new Error('The selected audience is no longer available in this session. Return to Recipients and select it again.');
        const restored = audienceSelectionSchema.parse(JSON.parse(saved));
        if (restored.mode === 'selected') setSelectedUserIds(restored.userIds);
        else setFilters(restored.filters);
      }
      const pending = sessionStorage.getItem(attemptStorageKey);
      if (pending) {
        const stored = JSON.parse(pending) as StoredCampaignAttempt;
        const payload = JSON.parse(stored.payload);
        const restored = audienceSelectionSchema.parse(payload.audience);
        setName(payload.name); setTemplateKey(payload.templateKey); setAutoRetry(payload.autoRetry); setMaxRetries(payload.maxRetries);
        if (restored.mode === 'selected') setSelectedUserIds(restored.userIds); else setFilters(restored.filters);
        setExcludedEmails(restored.mode === 'selected' ? restored.excludedEmails ?? [] : restored.filters.excludedEmails ?? []);
        setAttempt(stored); attemptRef.current = stored;
      }
      setHandoffReady(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to restore this audience'); }
    return () => controller.abort();
  }, [attemptStorageKey, audienceHandoff, invalidInitialFilters, initialState.error]);

  useEffect(() => {
    if (templateKey) {
      const tpl = templates.find(item => item.key === templateKey);
      if (tpl) setName(current => current || tpl.name);
    }
  }, [templateKey, templates]);

  useEffect(() => {
    const controller = new AbortController();
    setCountError(null); setCountLoading(true);
    if (!templateKey || !handoffReady) { setCountLoading(false); return () => controller.abort(); }
    const timer = setTimeout(async () => {
      try {
        const data = await emailResponse<CampaignReview>(await fetch('/api/admin/emails/recipients/preview', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: reviewKey, signal: controller.signal,
        }));
        if (!controller.signal.aborted) setReview({ ...data, inputKey: reviewKey });
      } catch (cause) {
        if (!controller.signal.aborted) { setReview(null); setCountError(cause instanceof Error ? cause.message : 'Audience count unavailable'); }
      } finally { if (!controller.signal.aborted) setCountLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [reviewKey, templateKey, handoffReady]);

  useEffect(() => {
    const controller = new AbortController();
    setExcludeResults([]); setExcludeSearching(false);
    if (excludeSearch.trim().length < 2) return () => controller.abort();
    setExcludeSearching(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: excludeSearch.trim(), limit: '10' });
        const data = await emailResponse<{ users: UserSearchResult[] }>(await fetch(`/api/admin/emails/users?${params}`, { signal: controller.signal }));
        if (!controller.signal.aborted) setExcludeResults(data.users.filter(user => !excludedEmails.includes(user.email.toLowerCase())));
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Exclusion search unavailable'); }
      finally { if (!controller.signal.aborted) setExcludeSearching(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [excludeSearch, excludedEmails]);

  const addExcludedEmail = (email: string) => {
    const normalized = email.toLowerCase().trim();
    if (normalized && !excludedEmails.includes(normalized)) {
      setExcludedEmails(prev => [...prev, normalized]);
    }
    setExcludeSearch('');
    setExcludeResults([]);
  };

  const removeExcludedEmail = (email: string) => {
    setExcludedEmails(prev => prev.filter(e => e !== email));
  };

  const handleBulkExclude = () => {
    const emails = bulkExcludeText
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && e.includes('@'));
    const unique = [...new Set([...excludedEmails, ...emails])];
    setExcludedEmails(unique);
    setBulkExcludeText('');
    setShowBulkInput(false);
  };

  const selectedTemplate = templates.find(item => item.key === templateKey);
  const handleCreate = async (startImmediately: boolean) => {
    if (createPending.current) return;
    if (!attemptRef.current && (!name.trim() || !templateKey || !review || review.inputKey !== reviewKey || countLoading || !recipientCount || countError)) {
      setError('Wait for a valid current audience review before creating a campaign.'); return;
    }
    createPending.current = true; setCreating(true); setError(null);
    try {
      let operation = attemptRef.current;
      if (!operation) {
        operation = { payload: JSON.stringify({ requestKey: crypto.randomUUID(), name: name.trim(), templateKey, audience, autoRetry, maxRetries }), review: review! };
        // Save before the first network request so a lost response is recoverable.
        sessionStorage.setItem(attemptStorageKey, JSON.stringify(operation));
        attemptRef.current = operation; setAttempt(operation);
      }
      const result = await runCampaignAttempt(operation, startImmediately, id => {
        const saved = { ...operation!, campaignId: id };
        attemptRef.current = saved; setAttempt(saved);
        sessionStorage.setItem(attemptStorageKey, JSON.stringify(saved));
      });
      if (result.startError) sessionStorage.setItem(`email-campaign-notice:${result.campaignId}`, result.startError);
      router.push(`/admin/emails/campaigns/${encodeURIComponent(result.campaignId)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Creation outcome unavailable. Recover this attempt before making another.'); }
    finally { createPending.current = false; setCreating(false); }
  };

  const updateFilter = <K extends keyof RecipientFilters>(key: K, value: RecipientFilters[K] | '' | null) => {
    setFilters(prev => {
      const next = { ...prev };
      if (value === '' || value === undefined || value === null) {
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  };

  return (
    <>
      <AdminTabs activeTab="emails" />

      <div className="px-4 py-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/admin/emails?view=campaigns')}
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
          <div role="alert" className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
              {invalidInitialFilters && <button className="underline text-sm" onClick={() => { setFilters({}); setInvalidInitialFilters(false); setError(null); }}>Clear invalid filters</button>}
            </div>
          </div>
        )}

        {attempt && <div role="status" className="p-4 mb-4 bg-blue-50 text-blue-900 rounded-lg">
          <p>{attempt.campaignId ? 'This attempt already created a campaign. Open it to review its state.' : 'A creation request is saved. Recovery uses exactly the same request and audience.'}</p>
          <button disabled={creating} onClick={() => void handleCreate(false)} className="underline mr-4">{attempt.campaignId ? 'Open existing campaign' : 'Recover creation request'}</button>
          {attempt.campaignId && <button disabled={creating} onClick={() => { sessionStorage.removeItem(attemptStorageKey); attemptRef.current = null; setAttempt(null); }} className="underline">Begin a separate new campaign</button>}
        </div>}
        {countError && <p role="alert" className="p-4 mb-4 bg-red-50 text-red-800 rounded-lg">{countError}</p>}
        {selectedUserIds && <p className="p-4 mb-4 bg-blue-50 text-blue-900 rounded-lg">Selected audience: {selectedUserIds.length} users. Return to Recipients to change this selection.</p>}
        {review?.inputKey === reviewKey && <p role="status" className="text-sm text-gray-600 mb-4">{review.matchedCount} matched, {review.eligibleCount} eligible. Excluded: {describeCampaignExclusions(review.exclusions)}.</p>}
        {/* Campaign Name */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
          <input
            type="text"
            aria-label="Name" disabled={creating || !!attempt} value={name}
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
                  aria-pressed={templateKey === tpl.key}
                  disabled={!tpl.campaignSupported || creating || !!attempt}
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
                      {!tpl.campaignSupported && <p className="text-xs text-gray-500">Requires event data; available for preview/test only.</p>}
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
        <fieldset aria-label="Recipient filters" disabled={creating || !!attempt || !!selectedUserIds} className="min-w-0 bg-white rounded-lg shadow-md p-6 mb-6">
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

          <p className="text-xs text-gray-500 mb-3">Date ranges include both selected days in UTC. No Studio ignores the studio verification/Featured filters.</p>
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
              aria-label="Search" value={filters.search || ''}
              onChange={e => updateFilter('search', e.target.value || undefined)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">User Status</label>
              <select
                aria-label="Status" value={filters.status || ''}
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
                aria-label="Email verified" value={filters.emailVerified === undefined ? '' : String(filters.emailVerified)}
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
                aria-label="Marketing opt in" value={filters.marketingOptIn === undefined ? '' : String(filters.marketingOptIn)}
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
            aria-expanded={showAdvancedFilters}
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
                    aria-label="Has studio" value={filters.hasStudio === undefined ? '' : String(filters.hasStudio)}
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
                    aria-label="Studio verified" disabled={filters.hasStudio === false} value={filters.studioVerified === undefined ? '' : String(filters.studioVerified)}
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
                    aria-label="Studio featured" disabled={filters.hasStudio === false} value={filters.studioFeatured === undefined ? '' : String(filters.studioFeatured)}
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
                    aria-label="Created after (UTC)" value={filters.createdAfter || ''}
                    onChange={e => updateFilter('createdAfter', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Created Before</label>
                  <input
                    type="date"
                    aria-label="Created before (UTC)" value={filters.createdBefore || ''}
                    onChange={e => updateFilter('createdBefore', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last Login After</label>
                  <input
                    type="date"
                    aria-label="Last login after (UTC)" value={filters.lastLoginAfter || ''}
                    onChange={e => updateFilter('lastLoginAfter', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last Login Before</label>
                  <input
                    type="date"
                    aria-label="Last login before (UTC)" value={filters.lastLoginBefore || ''}
                    onChange={e => updateFilter('lastLoginBefore', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>
          )}
        </fieldset>

        {/* Excluded Users */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <button
            onClick={() => setShowExcludeSection(!showExcludeSection)}
            aria-expanded={showExcludeSection}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors w-full"
          >
            <UserMinus className="w-4 h-4" />
            Exclude Users
            {excludedEmails.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                {excludedEmails.length}
              </span>
            )}
            {showExcludeSection ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </button>

          {showExcludeSection && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-gray-500">
                These users will be excluded from the campaign even if they match the recipient filters above.
              </p>

              {/* Search to add individual users */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email, username, or name to exclude..."
                  aria-label="Exclude search" disabled={creating || !!attempt} value={excludeSearch}
                  onChange={e => setExcludeSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                />
                {excludeSearching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Searching...</span>
                )}
              </div>

              {/* Search results dropdown */}
              {excludeResults.length > 0 && (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {excludeResults.map(user => (
                    <button
                      key={user.id}
                      onClick={() => addExcludedEmail(user.email)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-amber-50 transition-colors text-left"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{user.display_name}</span>
                        <span className="text-gray-500 ml-2">{user.email}</span>
                      </div>
                      <Plus className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Bulk add toggle */}
              <button
                onClick={() => setShowBulkInput(!showBulkInput)}
                className="text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors"
              >
                {showBulkInput ? 'Hide bulk input' : 'Bulk add emails (paste a list)'}
              </button>

              {showBulkInput && (
                <div className="space-y-2">
                  <textarea
                    aria-label="Bulk exclude text" disabled={creating || !!attempt} value={bulkExcludeText}
                    onChange={e => setBulkExcludeText(e.target.value)}
                    placeholder="Paste emails separated by commas, semicolons, or new lines..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono"
                  />
                  <button
                    onClick={handleBulkExclude}
                    disabled={!bulkExcludeText.trim()}
                    className="px-4 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Emails
                  </button>
                </div>
              )}

              {/* Excluded emails list */}
              {excludedEmails.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      {excludedEmails.length} user{excludedEmails.length !== 1 ? 's' : ''} excluded
                    </span>
                    <button
                      onClick={() => setExcludedEmails([])}
                      className="text-xs text-red-600 hover:text-red-800 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {excludedEmails.map(email => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-full"
                      >
                        {email}
                        <button
                          onClick={() => removeExcludedEmail(email)}
                          className="hover:text-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Options & Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRetry}
                onChange={e => setAutoRetry(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  Auto-retry failed sends every 24 hours
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Only eligible temporary failures retry after 24 hours. Skipped, permanent and uncertain outcomes are handled separately.
                </p>
              </div>
            </label>

            {autoRetry && (
              <div className="ml-7 flex items-center gap-2">
                <label className="text-sm text-gray-700">Max retries:</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  aria-label="Max retries" disabled={creating || !!attempt} value={maxRetries}
                  onChange={e => setMaxRetries(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <span className="text-xs text-gray-500">additional attempts after the initial submission</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={() => router.push('/admin/emails?view=campaigns')}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleCreate(false)}
              disabled={creating || !!attempt || !handoffReady || !name.trim() || !templateKey || countLoading || !!countError || !recipientCount}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save as Draft
            </button>
            <button
              onClick={() => {
                if (recipientCount != null && recipientCount > 0) {
                  const confirmed = window.confirm(
                    `This will immediately start sending to ${recipientCount.toLocaleString()} recipient${recipientCount !== 1 ? 's' : ''}. Continue?`
                  );
                  if (confirmed) handleCreate(true);
                }
              }}
              disabled={creating || !!attempt || !handoffReady || !name.trim() || !templateKey || countLoading || !!countError || !recipientCount}
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

export default function CreateCampaignPage() {
  return <Suspense fallback={<p className="p-6" role="status">Loading campaign draft…</p>}><CampaignRoute /></Suspense>;
}

function CampaignRoute() {
  const params = useSearchParams();
  return <CreateCampaignContent key={params.toString()} />;
}
