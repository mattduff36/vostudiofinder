'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { Modal } from '@/components/ui/Modal';
import { emailResponse } from '@/components/admin/emails/TemplatePlayground';
import { describeCampaignExclusions, type CampaignReview } from '@/lib/email/campaign-client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Send, Clock, CheckCircle, XCircle,
  AlertTriangle, Users, RefreshCw, Ban, RotateCcw,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  template_key: string;
  status: string;
  filters: Record<string, unknown>;
  processingEnabled: boolean;
  requiresLegacyReview: boolean;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  auto_retry: boolean;
  max_retries: number;
  retry_count: number;
  retry_after: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  created_by?: {
    display_name: string;
    email: string;
  };
  template?: {
    key: string;
    name: string;
    is_marketing: boolean;
  };
}

interface DeliveryStats {
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  bounced: number;
  skipped: number;
  uncertain: number;
  retryable: number;
}

interface Delivery {
  id: string;
  to_email: string;
  status: string;
  error_message?: string;
  outcome_reason?: string;
  attempt_count?: number;
  next_attempt_at?: string;
  sent_at?: string;
  failed_at?: string;
  created_at: string;
  user?: {
    display_name: string;
    username: string;
  };
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  DRAFT: { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Draft' },
  SCHEDULED: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Scheduled' },
  SENDING: { color: 'bg-yellow-100 text-yellow-700', icon: Send, label: 'Sending' },
  SENT: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Finished' },
  FAILED: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Failed' },
  CANCELLED: { color: 'bg-gray-100 text-gray-500', icon: Ban, label: 'Cancelled' },
};

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = String(params.id ?? '');
  return <CampaignDetails key={campaignId} campaignId={campaignId} />;
}

function CampaignDetails({ campaignId }: { campaignId: string }) {
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<string>('');
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryTotal, setDeliveryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [campaignReadError, setCampaignReadError] = useState<string | null>(null);
  const [campaignReadPending, setCampaignReadPending] = useState(false);
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [autoRetryChecked, setAutoRetryChecked] = useState(false);
  const [maxRetriesInput, setMaxRetriesInput] = useState(3);
  const campaignController = useRef<AbortController | null>(null);
  const deliveriesController = useRef<AbortController | null>(null);
  const actionPending = useRef(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  const loadCampaign = useCallback(async () => {
    campaignController.current?.abort();
    const controller = new AbortController(); campaignController.current = controller;
    setCampaignReadPending(true); setCampaignReadError(null);
    try {
      const data = await emailResponse<{ campaign: Campaign; deliveryStats: DeliveryStats }>(await fetch(`/api/admin/emails/campaigns/${campaignId}`, { signal: controller.signal }));
      if (!controller.signal.aborted) { setCampaign(data.campaign); setDeliveryStats(data.deliveryStats); }
    } catch (cause) { if (!controller.signal.aborted) setCampaignReadError(cause instanceof Error ? cause.message : 'Campaign unavailable'); }
    finally { if (!controller.signal.aborted) { setCampaignReadPending(false); setLoading(false); } }
  }, [campaignId]);

  const loadDeliveries = useCallback(async () => {
    deliveriesController.current?.abort();
    const controller = new AbortController(); deliveriesController.current = controller;
    setDeliveriesLoading(true); setDeliveryError(null);
    try {
      const query = new URLSearchParams({ page: String(deliveryPage), limit: '50' });
      if (deliveryFilter) query.set('status', deliveryFilter);
      const data = await emailResponse<{ deliveries: Delivery[]; pagination: { total: number } }>(await fetch(`/api/admin/emails/campaigns/${campaignId}/deliveries?${query}`, { signal: controller.signal }));
      if (!controller.signal.aborted) { setDeliveries(data.deliveries); setDeliveryTotal(data.pagination.total); }
    } catch (cause) { if (!controller.signal.aborted) setDeliveryError(cause instanceof Error ? cause.message : 'Deliveries unavailable'); }
    finally { if (!controller.signal.aborted) setDeliveriesLoading(false); }
  }, [campaignId, deliveryPage, deliveryFilter]);

  useEffect(() => {
    setCampaign(null); setLoading(true);
    const query = new URLSearchParams(window.location.search);
    const status = query.get('status') ?? '';
    setDeliveryFilter(['PENDING', 'SENDING', 'SENT', 'FAILED', 'BOUNCED', 'SKIPPED', 'UNCERTAIN'].includes(status) ? status : '');
    const page = Number(query.get('page') ?? 1);
    setDeliveryPage(Number.isSafeInteger(page) && page > 0 ? page : 1);
    try {
      const notice = sessionStorage.getItem(`email-campaign-notice:${campaignId}`);
      if (notice) { setActionError(notice); sessionStorage.removeItem(`email-campaign-notice:${campaignId}`); }
    } catch { /* Delivery state remains authoritative. */ }
    void loadCampaign();
    return () => campaignController.current?.abort();
  }, [loadCampaign, campaignId]);
  useEffect(() => {
    if (!loading) {
      const query = new URLSearchParams({ page: String(deliveryPage) });
      if (deliveryFilter) query.set('status', deliveryFilter);
      window.history.replaceState(null, '', `/admin/emails/campaigns/${encodeURIComponent(campaignId)}?${query}`);
      void loadDeliveries();
    }
    return () => deliveriesController.current?.abort();
  }, [loadDeliveries, loading, campaignId, deliveryFilter, deliveryPage]);

  useEffect(() => {
    if (campaign?.status !== 'SENDING' && !(deliveryStats?.sending || deliveryStats?.uncertain)) return;
    let stopped = false; let inFlight = false; let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (stopped || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      await Promise.allSettled([loadCampaign(), loadDeliveries()]);
      inFlight = false;
      if (!stopped) timer = setTimeout(() => void poll(), 10_000);
    };
    const visibility = () => { if (timer) clearTimeout(timer); if (document.visibilityState === 'visible') void poll(); };
    timer = setTimeout(() => void poll(), 10_000);
    document.addEventListener('visibilitychange', visibility);
    return () => { stopped = true; if (timer) clearTimeout(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [campaign?.status, deliveryStats?.sending, deliveryStats?.uncertain, loadCampaign, loadDeliveries]);

  const handleStart = async () => {
    if (!campaign || actionPending.current) return;
    actionPending.current = true; setActionLoading(true); setActionError(null);
    try {
      const review = await emailResponse<CampaignReview>(await fetch('/api/admin/emails/recipients/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId }),
      }));
      if (!review.eligibleCount) throw new Error('No eligible recipients remain.');
      const excluded = describeCampaignExclusions(review.exclusions);
      if (!window.confirm(`Start "${campaign.name}" for ${review.eligibleCount} reviewed recipients?${excluded ? ` Excluded: ${excluded}.` : ''}`)) return;
      await emailResponse(await fetch(`/api/admin/emails/campaigns/${campaignId}/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audienceFingerprint: review.audienceFingerprint, templateRevision: review.templateRevision }),
      }));
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Start outcome unavailable; check current state.'); }
    finally { await Promise.allSettled([loadCampaign(), loadDeliveries()]); actionPending.current = false; setActionLoading(false); }
  };
  const handleCancel = async () => {
    if (!campaign || actionPending.current) return;
    if (!window.confirm('Cancel work that has not been submitted? In-flight and already accepted email may still be delivered.')) return;
    actionPending.current = true; setActionLoading(true); setActionError(null);
    try { await emailResponse(await fetch(`/api/admin/emails/campaigns/${campaignId}`, { method: 'PATCH' })); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Cancellation result unavailable'); }
    finally { await Promise.allSettled([loadCampaign(), loadDeliveries()]); actionPending.current = false; setActionLoading(false); }
  };
  const handleRetryFailed = async () => {
    if (!campaign || actionPending.current) return;
    actionPending.current = true; setActionLoading(true); setActionError(null);
    try {
      await emailResponse(await fetch(`/api/admin/emails/campaigns/${campaignId}/retry`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRetry: autoRetryChecked, maxRetries: maxRetriesInput }),
      }));
      setShowRetryDialog(false);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Retry result unavailable'); }
    finally { await Promise.allSettled([loadCampaign(), loadDeliveries()]); actionPending.current = false; setActionLoading(false); }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <>
        <AdminTabs activeTab="emails" />
        <div className="px-4 py-4 md:p-8">
          <div className="max-w-5xl mx-auto mt-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent" />
            <p className="mt-2 text-gray-600">Loading campaign...</p>
          </div>
        </div>
      </>
    );
  }

  if (!campaign) {
    return (
      <>
        <AdminTabs activeTab="emails" />
        <div className="px-4 py-4 md:p-8">
          <div className="max-w-5xl mx-auto mt-8 text-center">
            <XCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            {actionError && <p role="alert" className="text-red-700 mb-3">{actionError}</p>}
            <p role={campaignReadPending ? 'status' : 'alert'} className="text-gray-600">
              {campaignReadPending ? 'Loading campaign…' : campaignReadError || 'Campaign not found'}
            </p>
            <button
              onClick={() => void loadCampaign()}
              disabled={campaignReadPending}
              className="block mx-auto mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Retry loading campaign
            </button>
            <button
              onClick={() => router.push('/admin/emails?view=campaigns')}
              className="mt-4 text-red-600 hover:underline"
            >
              Back to Email Management
            </button>
          </div>
        </div>
      </>
    );
  }

  const defaultStatus = { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Draft' };
  const statusCfg = STATUS_CONFIG[campaign.status] || defaultStatus;
  const StatusIcon = statusCfg.icon;
  const processed = (deliveryStats?.sent || 0) + (deliveryStats?.failed || 0) + (deliveryStats?.bounced || 0) + (deliveryStats?.skipped || 0);
  const filterDetails = campaign.filters.mode === 'filters' && campaign.filters.filters && typeof campaign.filters.filters === 'object'
    ? campaign.filters.filters as Record<string, unknown> : campaign.filters.mode === 'selected'
      ? { selection: `${Array.isArray(campaign.filters.userIds) ? campaign.filters.userIds.length : 0} explicitly selected users`, excludedEmails: campaign.filters.excludedEmails ?? [] }
      : campaign.filters;
  const progress = campaign.recipient_count > 0
    ? Math.round((processed / campaign.recipient_count) * 100)
    : 0;

  return (
    <>
      <AdminTabs activeTab="emails" />

      <div className="px-4 py-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push('/admin/emails?view=campaigns')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Email Management
        </button>

        {actionError && (
          <div role="alert" className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-700">{actionError}</p>
            </div>
          </div>
        )}

        {campaignReadError && (
          <div role="alert" className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mb-6">
            <p className="text-sm text-red-700">{campaignReadError}</p>
            <button onClick={() => void loadCampaign()} disabled={campaignReadPending}
              className="mt-2 text-sm text-red-700 underline disabled:opacity-50">Retry loading campaign</button>
          </div>
        )}
        {campaignReadPending && <p role="status" className="text-sm text-gray-600 mb-4">Refreshing campaign…</p>}

        {!campaign.processingEnabled && <p role="status" className="p-4 mb-4 rounded-lg bg-amber-50 text-amber-900">Campaign sending is paused. Draft review and cancellation remain available.</p>}
        {campaign.requiresLegacyReview && <p role="alert" className="p-4 mb-4 rounded-lg bg-amber-50 text-amber-900">This historical campaign needs delivery and template snapshot review before retry.</p>}
        {campaign.status === 'CANCELLED' && <p className="text-sm text-gray-600 mb-4">Cancellation stops unsubmitted work. In-flight outcomes may still be reconciled.</p>}
        {campaign.status === 'SENT' && <p role="status" className="text-sm text-gray-600 mb-4">Processing finished. Review accepted, failed and skipped counts below; completion does not mean every recipient received an email.</p>}
        {/* Campaign Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Template: {campaign.template?.name || campaign.template_key}
                {campaign.template?.is_marketing && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Marketing</span>
                )}
              </p>
              {campaign.created_by && (
                <p className="text-sm text-gray-500">
                  Created by {campaign.created_by.display_name} on {formatDate(campaign.created_at)}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full ${statusCfg.color}`}>
                <StatusIcon className="w-4 h-4" />
                {statusCfg.label}
              </span>
              {(campaign.status === 'DRAFT' || (campaign.status === 'SCHEDULED' && !campaign.started_at)) && (
                <button
                  onClick={handleStart}
                  disabled={actionLoading || !campaign.processingEnabled || campaign.requiresLegacyReview}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Start Sending
                </button>
              )}
              {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED' || campaign.status === 'SENDING') && (
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" />
                  Cancel
                </button>
              )}
              {campaign.status !== 'SENDING' && campaign.status !== 'CANCELLED' && !campaign.requiresLegacyReview && (deliveryStats?.retryable || 0) > 0 && (
                <button
                  onClick={() => { setAutoRetryChecked(campaign.auto_retry || false); setMaxRetriesInput(campaign.max_retries || 3); setShowRetryDialog(true); }}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry eligible failures ({(deliveryStats?.retryable || 0).toLocaleString()})
                </button>
              )}
            </div>
          </div>

          {/* Auto-retry indicator */}
          {campaign.auto_retry && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <RotateCcw className="w-4 h-4 flex-shrink-0" />
              <span>
                {campaign.retry_after
                  ? <>Auto-retry scheduled for {formatDate(campaign.retry_after)}</>
                  : <>Auto-retry enabled — eligible temporary failures retry after 24 hours</>
                }
                <span className="ml-2 text-amber-600 font-medium">
                  (up to {campaign.max_retries} additional attempts per delivery)
                </span>
              </span>
            </div>
          )}

          {/* Progress Bar (when sending) */}
          {campaign.status === 'SENDING' && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Retry Dialog */}
        <Modal isOpen={showRetryDialog} onClose={() => { if (!actionLoading) setShowRetryDialog(false); }} preventBackdropClose={actionLoading} maxWidth="md" title="Retry failed deliveries">
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900">Retry Failed Deliveries</h3>
              {actionError && <p role="alert" className="mt-2 text-sm text-red-700">{actionError}</p>}
              <p className="mt-2 text-sm text-gray-600">
                {(deliveryStats?.retryable || 0).toLocaleString()} eligible failures are due within the attempt limit. Permanent failures, skipped recipients and uncertain submissions are not resent.
              </p>

              <label className="mt-4 flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRetryChecked}
                  onChange={e => setAutoRetryChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Auto-retry failed sends every 24 hours</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Only eligible temporary failures retry after 24 hours. Fresh recipient identity and marketing consent are checked again.
                  </p>
                </div>
              </label>

              {autoRetryChecked && (
                <div className="mt-3 ml-7 flex items-center gap-2">
                  <label className="text-sm text-gray-700">Max retries:</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    aria-label="Maximum additional attempts" value={maxRetriesInput}
                    onChange={e => setMaxRetriesInput(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <span className="text-xs text-gray-500">additional attempts after the first submission</span>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  disabled={actionLoading}
                  onClick={() => setShowRetryDialog(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRetryFailed}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry Now
                </button>
              </div>
            </div>
        </Modal>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-gray-500">Recipients</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {campaign.recipient_count.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium text-gray-500">Pending</span>
            </div>
            <div className="text-xl font-bold text-yellow-700">
              {(deliveryStats?.pending || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-gray-500">Sent</span>
            </div>
            <div className="text-xl font-bold text-green-700">
              {(deliveryStats?.sent || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs font-medium text-gray-500">Failed</span>
            </div>
            <div className="text-xl font-bold text-red-700">
              {(deliveryStats?.failed || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-medium text-gray-500">Bounced</span>
            </div>
            <div className="text-xl font-bold text-orange-700">
              {(deliveryStats?.bounced || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4"><p className="text-sm text-gray-600">Skipped</p><p className="text-xl font-bold">{deliveryStats?.skipped ?? 0}</p></div>
          <div className="bg-white rounded-lg shadow-md p-4"><p className="text-sm text-gray-600">Uncertain</p><p className="text-xl font-bold">{deliveryStats?.uncertain ?? 0}</p><p className="text-xs text-gray-500">Requires same-submission reconciliation or review.</p></div>
        </div>
        {deliveryError && <p role="alert" className="text-red-800 bg-red-50 p-4 mb-4">{deliveryError} <button onClick={() => void loadDeliveries()} className="underline">Retry loading deliveries</button></p>}
        {deliveriesLoading && <p role="status" className="text-sm text-gray-600 mb-3">Updating delivery records…</p>}
        {/* Timestamps */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Created</span>
              <p className="font-medium text-gray-900">{formatDate(campaign.created_at)}</p>
            </div>
            <div>
              <span className="text-gray-500">Scheduled</span>
              <p className="font-medium text-gray-900">{formatDate(campaign.scheduled_at)}</p>
            </div>
            <div>
              <span className="text-gray-500">Started</span>
              <p className="font-medium text-gray-900">{formatDate(campaign.started_at)}</p>
            </div>
            <div>
              <span className="text-gray-500">Completed</span>
              <p className="font-medium text-gray-900">{formatDate(campaign.completed_at)}</p>
            </div>
            {campaign.retry_after && (
              <div>
                <span className="text-amber-600">Next Retry</span>
                <p className="font-medium text-amber-700">{formatDate(campaign.retry_after)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Applied Filters */}
        {campaign.filters && Object.keys(campaign.filters).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Recipient Filters</h2>
            <div className="space-y-2">
              {Object.entries(filterDetails).map(([key, value]) => {
                const items = Array.isArray(value) ? value : typeof value === 'string' && value.includes(',') ? value.split(',') : null;
                if (items && items.length > 3) {
                  return (
                    <div key={key}>
                      <span className="text-xs font-semibold text-gray-600">{key}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {items.map((item: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                            {String(item).trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <span
                    key={key}
                    className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full mr-2"
                  >
                    {key}: {String(value)}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Deliveries Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Deliveries ({deliveryTotal.toLocaleString()})
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label="Filter deliveries by status" value={deliveryFilter}
                onChange={e => { setDeliveryFilter(e.target.value); setDeliveryPage(1); }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option><option value="SENDING">Submitting</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
                <option value="BOUNCED">Bounced</option><option value="SKIPPED">Skipped</option><option value="UNCERTAIN">Uncertain</option>
              </select>
              <button
                onClick={() => { loadCampaign(); loadDeliveries(); }}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Refresh campaign and deliveries" title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {deliveries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {campaign.status === 'DRAFT'
                ? 'No deliveries yet. Start the campaign to create deliveries.'
                : 'No deliveries match the current filter.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Recipient</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Time</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map(d => (
                      <tr key={d.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 px-3">
                          <div className="font-medium text-gray-900">{d.to_email}</div>
                          {d.user && (
                            <div className="text-xs text-gray-500">
                              {d.user.display_name} {d.user.username ? `(@${d.user.username})` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            d.status === 'SENT' ? 'bg-green-100 text-green-700' :
                            d.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                            d.status === 'BOUNCED' ? 'bg-orange-100 text-orange-700' :
                            d.status === 'SENDING' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {d.sent_at ? formatDate(d.sent_at) :
                           d.failed_at ? formatDate(d.failed_at) :
                           formatDate(d.created_at)}
                        </td>
                        <td className="py-2 px-3 text-red-600 text-xs max-w-[200px] truncate" title={d.error_message || ''}>
                          {d.error_message || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {deliveryTotal > 50 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    Page {deliveryPage} of {Math.ceil(deliveryTotal / 50)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeliveryPage(p => Math.max(1, p - 1))}
                      disabled={deliveryPage <= 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setDeliveryPage(p => p + 1)}
                      disabled={deliveryPage >= Math.ceil(deliveryTotal / 50)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
