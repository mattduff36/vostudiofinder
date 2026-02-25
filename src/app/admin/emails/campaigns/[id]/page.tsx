'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { useState, useEffect, useCallback } from 'react';
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
  filters: Record<string, any>;
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
}

interface Delivery {
  id: string;
  to_email: string;
  status: string;
  error_message?: string;
  sent_at?: string;
  failed_at?: string;
  created_at: string;
  user?: {
    display_name: string;
    username: string;
  };
}

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  DRAFT: { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Draft' },
  SCHEDULED: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Scheduled' },
  SENDING: { color: 'bg-yellow-100 text-yellow-700', icon: Send, label: 'Sending' },
  SENT: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Sent' },
  FAILED: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Failed' },
  CANCELLED: { color: 'bg-gray-100 text-gray-500', icon: Ban, label: 'Cancelled' },
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<string>('');
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryTotal, setDeliveryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [autoRetryChecked, setAutoRetryChecked] = useState(false);
  const [maxRetriesInput, setMaxRetriesInput] = useState(3);

  const loadCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/emails/campaigns/${campaignId}`);
      if (!res.ok) throw new Error('Campaign not found');
      const data = await res.json();
      setCampaign(data.campaign);
      setDeliveryStats(data.deliveryStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const loadDeliveries = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(deliveryPage), limit: '50' });
      if (deliveryFilter) params.set('status', deliveryFilter);
      const res = await fetch(
        `/api/admin/emails/campaigns/${campaignId}/deliveries?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
        setDeliveryTotal(data.pagination?.total || 0);
      }
    } catch {
      // Non-critical
    }
  }, [campaignId, deliveryPage, deliveryFilter]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  useEffect(() => {
    if (!loading) loadDeliveries();
  }, [loadDeliveries, loading]);

  // Auto-refresh while campaign is actively sending
  useEffect(() => {
    if (campaign?.status !== 'SENDING') return;
    const interval = setInterval(() => {
      loadCampaign();
      loadDeliveries();
    }, 10000);
    return () => clearInterval(interval);
  }, [campaign?.status, loadCampaign, loadDeliveries]);

  const handleStart = async () => {
    if (!campaign) return;
    const confirmed = window.confirm(
      `Start sending "${campaign.name}" to ${campaign.recipient_count.toLocaleString()} recipients?`
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/emails/campaigns/${campaignId}/start`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start');
      }
      await loadCampaign();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!campaign) return;
    const confirmed = window.confirm('Cancel this campaign? Unsent emails will not be delivered.');
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/emails/campaigns/${campaignId}`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel');
      }
      await loadCampaign();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!campaign || !deliveryStats) return;

    setShowRetryDialog(false);
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/emails/campaigns/${campaignId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRetry: autoRetryChecked, maxRetries: autoRetryChecked ? maxRetriesInput : undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to retry');
      }
      await loadCampaign();
      await loadDeliveries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry');
    } finally {
      setActionLoading(false);
    }
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
            <p className="text-gray-600">{error || 'Campaign not found'}</p>
            <button
              onClick={() => router.push('/admin/emails')}
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
  const processed = (deliveryStats?.sent || 0) + (deliveryStats?.failed || 0) + (deliveryStats?.bounced || 0);
  const progress = campaign.recipient_count > 0
    ? Math.round((processed / campaign.recipient_count) * 100)
    : 0;

  return (
    <>
      <AdminTabs activeTab="emails" />

      <div className="px-4 py-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push('/admin/emails')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Email Management
        </button>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Campaign Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
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
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full ${statusCfg.color}`}>
                <StatusIcon className="w-4 h-4" />
                {statusCfg.label}
              </span>
              {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED') && (
                <button
                  onClick={handleStart}
                  disabled={actionLoading}
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
              {campaign.status !== 'SENDING' && (deliveryStats?.failed || 0) > 0 && (
                <button
                  onClick={() => { setAutoRetryChecked(campaign.auto_retry || false); setMaxRetriesInput(campaign.max_retries || 3); setShowRetryDialog(true); }}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry Failed ({(deliveryStats?.failed || 0).toLocaleString()})
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
                  : <>Auto-retry enabled — failed sends will be retried in 24 hours</>
                }
                <span className="ml-2 text-amber-600 font-medium">
                  ({campaign.retry_count}/{campaign.max_retries} retries used)
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
        {showRetryDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900">Retry Failed Deliveries</h3>
              <p className="mt-2 text-sm text-gray-600">
                {(deliveryStats?.failed || 0).toLocaleString()} failed deliveries will be reset to pending and re-sent by the background processor.
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
                    If any emails fail again (e.g. daily limit reached), they will automatically be retried after 24 hours.
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
                    value={maxRetriesInput}
                    onChange={e => setMaxRetriesInput(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <span className="text-xs text-gray-500">attempts before giving up</span>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
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
          </div>
        )}

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
            <div className="flex flex-wrap gap-2">
              {Object.entries(campaign.filters).map(([key, value]) => (
                <span
                  key={key}
                  className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
                >
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Deliveries Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Deliveries ({deliveryTotal.toLocaleString()})
            </h2>
            <div className="flex items-center gap-3">
              <select
                value={deliveryFilter}
                onChange={e => { setDeliveryFilter(e.target.value); setDeliveryPage(1); }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
                <option value="BOUNCED">Bounced</option>
              </select>
              <button
                onClick={() => { loadCampaign(); loadDeliveries(); }}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Refresh"
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
