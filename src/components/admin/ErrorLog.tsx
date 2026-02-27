'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  Loader2, 
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Info,
  Zap,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Copy,
  User,
  Globe,
  Code,
  List,
  FileJson
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { showSuccess, showError } from '@/lib/toast';
import { AdminTabs } from './AdminTabs';
import { AdminDrawer } from './AdminDrawer';

interface ErrorLogGroup {
  id: string;
  sentry_issue_id: string;
  title: string;
  level: string;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  first_seen_at: string;
  last_seen_at: string;
  event_count: number;
  environment: string | null;
  release: string | null;
  last_event_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ErrorLogGroupDetails extends ErrorLogGroup {
  sample_event_json: any;
}

interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  permalink: string;
  status: string;
  statusDetails: any;
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  stats: any;
  annotations: any[];
  assignedTo: any;
  [key: string]: any;
}

interface SentryEvent {
  id: string;
  eventID: string;
  message: string;
  title: string;
  culprit: string;
  dateCreated: string;
  platform: string;
  tags: Array<{ key: string; value: string }>;
  contexts: any;
  user: any;
  request: any;
  exception: any;
  breadcrumbs: any;
  entries: any[];
  [key: string]: any;
}

interface ErrorDetailsResponse {
  errorLogGroup: ErrorLogGroupDetails;
  sentryIssue: SentryIssue | null;
  sentryLatestEvent: SentryEvent | null;
  sentryError: string | null;
}

export function ErrorLog() {
  const [errorLogGroups, setErrorLogGroups] = useState<ErrorLogGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchText, setSearchText] = useState('');
  const [selectedError, setSelectedError] = useState<ErrorLogGroupDetails | null>(null);
  const [sentryIssue, setSentryIssue] = useState<SentryIssue | null>(null);
  const [sentryEvent, setSentryEvent] = useState<SentryEvent | null>(null);
  const [sentryError, setSentryError] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page] = useState(1); // Pagination controls to be added in future enhancement
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const fetchErrorLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterLevel !== 'ALL') params.append('level', filterLevel);
      if (searchText) params.append('search', searchText);
      params.append('page', page.toString());
      params.append('limit', '50');
      params.append('sortBy', 'last_seen_at');
      params.append('sortOrder', 'desc');

      const response = await fetch(`/api/admin/error-log?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch error logs');
      }

      setErrorLogGroups(data.errorLogGroups);
      setTotalCount(data.pagination.totalCount);
    } catch (error) {
      logger.error('Error fetching error logs:', error);
      showError('Failed to load error logs');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterLevel, searchText, page]);

  useEffect(() => {
    fetchErrorLogs();
  }, [fetchErrorLogs]);

  const fetchErrorDetails = async (errorId: string) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/admin/error-log/${errorId}?live=1`);
      const data: ErrorDetailsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.errorLogGroup?.title || 'Failed to fetch error details');
      }

      setSelectedError(data.errorLogGroup);
      setSentryIssue(data.sentryIssue);
      setSentryEvent(data.sentryLatestEvent);
      setSentryError(data.sentryError);
      setExpandedErrorId(errorId);
    } catch (error) {
      logger.error('Error fetching error details:', error);
      showError('Failed to load error details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateStatus = async (errorId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch('/api/admin/error-log', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: errorId, status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      showSuccess('Status updated successfully');
      fetchErrorLogs();
      if (selectedError?.id === errorId) {
        setSelectedError({ ...selectedError, status: newStatus as any });
      }
    } catch (error: any) {
      logger.error('Error updating error status:', error);
      showError(error.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const toggleErrorDetails = (errorId: string) => {
    if (expandedErrorId === errorId) {
      setExpandedErrorId(null);
      setSelectedError(null);
      setSentryIssue(null);
      setSentryEvent(null);
      setSentryError(null);
      setMobileDrawerOpen(false);
    } else {
      fetchErrorDetails(errorId);
      setMobileDrawerOpen(true);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/sync-sentry');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync with Sentry');
      }

      showSuccess(`Successfully synced ${data.synced} error${data.synced !== 1 ? 's' : ''} from Sentry`);
      fetchErrorLogs(); // Refresh the list
    } catch (error) {
      logger.error('Error syncing with Sentry:', error);
      showError('Failed to sync with Sentry');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      OPEN: 'bg-red-100 text-red-700 border-red-300',
      RESOLVED: 'bg-green-100 text-green-700 border-green-300',
      IGNORED: 'bg-gray-100 text-gray-700 border-gray-300',
    };

    const icons = {
      OPEN: AlertCircle,
      RESOLVED: CheckCircle2,
      IGNORED: EyeOff,
    };

    const Icon = icons[status as keyof typeof icons] || AlertCircle;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border flex items-center space-x-1 ${styles[status as keyof typeof styles] || styles.OPEN}`}>
        <Icon className="w-3 h-3" />
        <span>{status}</span>
      </span>
    );
  };

  const getLevelBadge = (level: string) => {
    const styles = {
      fatal: 'bg-red-600 text-white',
      error: 'bg-red-100 text-red-700',
      warning: 'bg-yellow-100 text-yellow-700',
      info: 'bg-blue-100 text-blue-700',
    };

    const icons = {
      fatal: Zap,
      error: AlertTriangle,
      warning: AlertCircle,
      info: Info,
    };

    const Icon = icons[level as keyof typeof icons] || AlertTriangle;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded flex items-center space-x-1 ${styles[level as keyof typeof styles] || styles.error}`}>
        <Icon className="w-3 h-3" />
        <span className="uppercase">{level}</span>
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(`${label} copied to clipboard`);
    } catch (error) {
      logger.error('Failed to copy to clipboard:', error);
      showError('Failed to copy to clipboard');
    }
  };

  return (
    <>
      <AdminTabs activeTab="error_log" />

      <div className="px-4 py-4 md:p-8 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-0">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Error Log</h1>
              <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
                Monitor and review site-wide errors captured by Sentry
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="px-4 py-2 bg-[#d42027] hover:bg-[#b01a20] text-white rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
                <span className="text-xs text-gray-500 md:hidden">({totalCount} error{totalCount !== 1 ? 's' : ''})</span>
              </div>

              <div className="grid grid-cols-2 gap-2 md:flex md:gap-4">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-sm px-2.5 md:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="IGNORED">Ignored</option>
                </select>

                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="text-sm px-2.5 md:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
                >
                  <option value="ALL">All Levels</option>
                  <option value="fatal">Fatal</option>
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="Search errors..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027] w-full md:flex-grow md:max-w-md"
              />

              <div className="hidden md:block ml-auto text-sm text-gray-600">
                {totalCount} error{totalCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Error Log List */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
                <Loader2 className="w-8 h-8 animate-spin text-[#d42027]" />
              </div>
            ) : errorLogGroups.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500">No errors found - all clear! 🎉</p>
              </div>
            ) : (
              errorLogGroups.map((error) => (
                <div
                  key={error.id}
                  className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all"
                >
                  {/* Error Summary - Clickable to expand (desktop inline, mobile drawer) */}
                  <div 
                    className="p-3 md:p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleErrorDetails(error.id)}
                  >
                    <div className="flex items-start justify-between gap-2 md:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 flex-wrap">
                          {getLevelBadge(error.level)}
                          {getStatusBadge(error.status)}
                          {error.environment && (
                            <span className="px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs font-medium rounded bg-gray-100 text-gray-700">
                              {error.environment}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm md:text-base font-medium text-gray-900 mb-1 break-words line-clamp-2">
                          {error.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(error.last_seen_at)}
                          </span>
                          <span className="font-medium text-gray-700">
                            {error.event_count.toLocaleString()}x
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {loadingDetails && expandedErrorId === error.id ? (
                          <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-gray-400" />
                        ) : expandedErrorId === error.id ? (
                          <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-gray-400 transition-transform" />
                        ) : (
                          <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-gray-400 transition-transform" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details - Desktop only */}
                  {expandedErrorId === error.id && selectedError && (
                    <div className="hidden md:block border-t border-gray-200 bg-gray-50 p-4" onClick={(e) => e.stopPropagation()}>
                      {/* Header with Status Control */}
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900">Error Details</h4>
                        <div className="flex items-center gap-3">
                          {sentryIssue?.permalink && (
                            <a
                              href={sentryIssue.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open in Sentry
                            </a>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Status:</span>
                            <select
                              value={selectedError.status}
                              onChange={(e) => handleUpdateStatus(error.id, e.target.value)}
                              disabled={updatingStatus}
                              className="text-sm px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
                            >
                              <option value="OPEN">Open</option>
                              <option value="RESOLVED">Resolved</option>
                              <option value="IGNORED">Ignored</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Sentry Error Warning */}
                      {sentryError && (
                        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                          <AlertTriangle className="w-4 h-4 inline mr-2" />
                          Could not fetch live Sentry data: {sentryError}. Showing DB-cached data only.
                        </div>
                      )}

                      <div className="space-y-4">
                        {/* Overview Section */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Overview
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Sentry Issue ID</span>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-gray-900 font-mono text-xs">{selectedError.sentry_issue_id}</p>
                                <button
                                  onClick={() => copyToClipboard(selectedError.sentry_issue_id, 'Issue ID')}
                                  className="text-gray-400 hover:text-gray-600 transition-colors"
                                  title="Copy to clipboard"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            {selectedError.last_event_id && (
                              <div>
                                <span className="font-medium text-gray-700">Last Event ID</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-gray-900 font-mono text-xs truncate">{selectedError.last_event_id}</p>
                                  <button
                                    onClick={() => copyToClipboard(selectedError.last_event_id!, 'Event ID')}
                                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                                    title="Copy to clipboard"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-gray-700">Occurrences</span>
                              <p className="text-gray-900 font-semibold mt-1">
                                {sentryIssue?.count || selectedError.event_count.toLocaleString()}
                              </p>
                            </div>
                            {(selectedError.environment || sentryIssue) && (
                              <div>
                                <span className="font-medium text-gray-700">Environment</span>
                                <p className="text-gray-900 mt-1">{selectedError.environment || 'N/A'}</p>
                              </div>
                            )}
                            {(selectedError.release || sentryIssue) && (
                              <div>
                                <span className="font-medium text-gray-700">Release</span>
                                <p className="text-gray-900 mt-1 font-mono text-xs">{selectedError.release || 'N/A'}</p>
                              </div>
                            )}
                            {sentryIssue?.culprit && (
                              <div>
                                <span className="font-medium text-gray-700">Culprit</span>
                                <p className="text-gray-900 mt-1 font-mono text-xs truncate">{sentryIssue.culprit}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* What Happened Section */}
                        {(sentryEvent?.message || sentryEvent?.exception || selectedError.sample_event_json?.message) && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              What Happened
                            </h5>
                            <div className="space-y-2">
                              {(sentryEvent?.message || selectedError.sample_event_json?.message) && (
                                <div>
                                  <span className="text-xs font-medium text-gray-700">Message:</span>
                                  <p className="text-sm text-gray-900 mt-1 font-mono bg-gray-50 p-2 rounded">
                                    {sentryEvent?.message || selectedError.sample_event_json?.message}
                                  </p>
                                </div>
                              )}
                              {(sentryEvent?.exception?.values?.[0] || selectedError.sample_event_json?.exception?.values?.[0]) && (
                                <div>
                                  <span className="text-xs font-medium text-gray-700">Exception:</span>
                                  <p className="text-sm text-red-700 mt-1 font-mono">
                                    {sentryEvent?.exception?.values?.[0]?.type || selectedError.sample_event_json?.exception?.values?.[0]?.type}
                                    {': '}
                                    {sentryEvent?.exception?.values?.[0]?.value || selectedError.sample_event_json?.exception?.values?.[0]?.value}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Stack Trace Section */}
                        {(sentryEvent?.exception?.values?.[0]?.stacktrace || selectedError.sample_event_json?.exception?.values?.[0]?.stacktrace) && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Code className="w-4 h-4" />
                              Stack Trace
                            </h5>
                            <div className="max-h-96 overflow-y-auto">
                              <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                                {JSON.stringify(
                                  sentryEvent?.exception?.values?.[0]?.stacktrace || selectedError.sample_event_json?.exception?.values?.[0]?.stacktrace,
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Request Section */}
                        {(sentryEvent?.request || selectedError.sample_event_json?.request) && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Globe className="w-4 h-4" />
                              Request
                            </h5>
                            <div className="space-y-3 text-sm">
                              {(sentryEvent?.request?.url || selectedError.sample_event_json?.request?.url) && (
                                <div>
                                  <span className="font-medium text-gray-700">URL:</span>
                                  <p className="text-gray-900 font-mono text-xs mt-1 break-all">
                                    {sentryEvent?.request?.url || selectedError.sample_event_json?.request?.url}
                                  </p>
                                </div>
                              )}
                              {(sentryEvent?.request?.method || selectedError.sample_event_json?.request?.method) && (
                                <div>
                                  <span className="font-medium text-gray-700">Method:</span>
                                  <p className="text-gray-900 font-mono mt-1">
                                    {sentryEvent?.request?.method || selectedError.sample_event_json?.request?.method}
                                  </p>
                                </div>
                              )}
                              {(sentryEvent?.request?.headers || selectedError.sample_event_json?.request?.headers) && (
                                <details>
                                  <summary className="font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                                    Headers (Click to expand)
                                  </summary>
                                  <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-x-auto">
                                    {JSON.stringify(sentryEvent?.request?.headers || selectedError.sample_event_json?.request?.headers, null, 2)}
                                  </pre>
                                </details>
                              )}
                              {(sentryEvent?.request?.data || selectedError.sample_event_json?.request?.data) && (
                                <details>
                                  <summary className="font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                                    Request Body (Click to expand)
                                  </summary>
                                  <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-x-auto">
                                    {JSON.stringify(sentryEvent?.request?.data || selectedError.sample_event_json?.request?.data, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        )}

                        {/* User Section */}
                        {(sentryEvent?.user || selectedError.sample_event_json?.user) && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <User className="w-4 h-4" />
                              User
                            </h5>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {(sentryEvent?.user?.id || selectedError.sample_event_json?.user?.id) && (
                                <div>
                                  <span className="font-medium text-gray-700">ID:</span>
                                  <p className="text-gray-900 font-mono text-xs mt-1">
                                    {sentryEvent?.user?.id || selectedError.sample_event_json?.user?.id}
                                  </p>
                                </div>
                              )}
                              {(sentryEvent?.user?.username || selectedError.sample_event_json?.user?.username) && (
                                <div>
                                  <span className="font-medium text-gray-700">Username:</span>
                                  <p className="text-gray-900 mt-1">
                                    {sentryEvent?.user?.username || selectedError.sample_event_json?.user?.username}
                                  </p>
                                </div>
                              )}
                              {(sentryEvent?.user?.email || selectedError.sample_event_json?.user?.email) && (
                                <div>
                                  <span className="font-medium text-gray-700">Email:</span>
                                  <p className="text-gray-900 mt-1">
                                    {sentryEvent?.user?.email || selectedError.sample_event_json?.user?.email}
                                  </p>
                                </div>
                              )}
                              {(sentryEvent?.user?.ip_address || selectedError.sample_event_json?.user?.ip_address) && (
                                <div>
                                  <span className="font-medium text-gray-700">IP Address:</span>
                                  <p className="text-gray-900 font-mono text-xs mt-1">
                                    {sentryEvent?.user?.ip_address || selectedError.sample_event_json?.user?.ip_address}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Breadcrumbs Section */}
                        {(sentryEvent?.breadcrumbs?.values || selectedError.sample_event_json?.breadcrumbs?.values) && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <List className="w-4 h-4" />
                              Breadcrumbs
                            </h5>
                            <div className="max-h-64 overflow-y-auto">
                              <div className="space-y-2">
                                {(sentryEvent?.breadcrumbs?.values || selectedError.sample_event_json?.breadcrumbs?.values)?.slice(-10).map((breadcrumb: any, idx: number) => (
                                  <div key={idx} className="text-xs border-l-2 border-gray-300 pl-3 py-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-gray-500">{breadcrumb.timestamp}</span>
                                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded">{breadcrumb.type || breadcrumb.category}</span>
                                    </div>
                                    <p className="text-gray-900 mt-1">{breadcrumb.message || JSON.stringify(breadcrumb.data)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Raw Event JSON */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <details>
                            <summary className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-gray-700 flex items-center gap-2">
                              <FileJson className="w-4 h-4" />
                              Raw Event JSON (Click to expand)
                            </summary>
                            <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded mt-3 overflow-x-auto max-h-96 overflow-y-auto">
                              {JSON.stringify(sentryEvent || selectedError.sample_event_json, null, 2)}
                            </pre>
                          </details>
                        </div>

                        {/* No Data Message */}
                        {!sentryEvent && !selectedError.sample_event_json && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center text-sm text-gray-500">
                            No detailed event data available for this error group.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mobile Error Details Drawer */}
      <AdminDrawer
        isOpen={mobileDrawerOpen && !!selectedError}
        onClose={() => {
          setMobileDrawerOpen(false);
          setExpandedErrorId(null);
          setSelectedError(null);
          setSentryIssue(null);
          setSentryEvent(null);
          setSentryError(null);
        }}
        title="Error Details"
        showBackButton
      >
        {selectedError && (
          <div className="p-4 space-y-4">
            {/* Header with Status Control */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {getLevelBadge(selectedError.level)}
                {getStatusBadge(selectedError.status)}
              </div>
              {sentryIssue?.permalink && (
                <a
                  href={sentryIssue.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Sentry
                </a>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status:</label>
                <select
                  value={selectedError.status}
                  onChange={(e) => handleUpdateStatus(selectedError.id, e.target.value)}
                  disabled={updatingStatus}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
                >
                  <option value="OPEN">Open</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="IGNORED">Ignored</option>
                </select>
              </div>
            </div>

            {/* Sentry Error Warning */}
            {sentryError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Could not fetch live Sentry data: {sentryError}. Showing DB-cached data only.
              </div>
            )}

            {/* Error Title */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-base font-medium text-gray-900 break-words">
                {selectedError.title}
              </h3>
            </div>

            {/* Overview Section */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Overview
              </h5>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700 block mb-1">Sentry Issue ID</span>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 font-mono text-xs break-all flex-1">{selectedError.sentry_issue_id}</p>
                    <button
                      onClick={() => copyToClipboard(selectedError.sentry_issue_id, 'Issue ID')}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700 block mb-1">Occurrences</span>
                  <p className="text-gray-900 font-semibold">
                    {sentryIssue?.count || selectedError.event_count.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>First: {formatDate(selectedError.first_seen_at)}</span>
                  <span>Last: {formatDate(selectedError.last_seen_at)}</span>
                </div>
                {selectedError.environment && (
                  <div>
                    <span className="font-medium text-gray-700 block mb-1">Environment</span>
                    <p className="text-gray-900">{selectedError.environment}</p>
                  </div>
                )}
              </div>
            </div>

            {/* What Happened Section */}
            {(sentryEvent?.message || sentryEvent?.exception || selectedError.sample_event_json?.message) && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  What Happened
                </h5>
                <div className="space-y-2">
                  {(sentryEvent?.message || selectedError.sample_event_json?.message) && (
                    <div>
                      <span className="text-xs font-medium text-gray-700 block mb-1">Message:</span>
                      <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded break-words">
                        {sentryEvent?.message || selectedError.sample_event_json?.message}
                      </p>
                    </div>
                  )}
                  {(sentryEvent?.exception?.values?.[0] || selectedError.sample_event_json?.exception?.values?.[0]) && (
                    <div>
                      <span className="text-xs font-medium text-gray-700 block mb-1">Exception:</span>
                      <p className="text-sm text-red-700 font-mono break-words">
                        {sentryEvent?.exception?.values?.[0]?.type || selectedError.sample_event_json?.exception?.values?.[0]?.type}
                        {': '}
                        {sentryEvent?.exception?.values?.[0]?.value || selectedError.sample_event_json?.exception?.values?.[0]?.value}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stack Trace Section */}
            {(sentryEvent?.exception?.values?.[0]?.stacktrace || selectedError.sample_event_json?.exception?.values?.[0]?.stacktrace) && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Stack Trace
                </h5>
                <div className="max-h-80 overflow-y-auto">
                  <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(
                      sentryEvent?.exception?.values?.[0]?.stacktrace || selectedError.sample_event_json?.exception?.values?.[0]?.stacktrace,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            )}

            {/* Request Section */}
            {(sentryEvent?.request || selectedError.sample_event_json?.request) && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Request
                </h5>
                <div className="space-y-3 text-sm">
                  {(sentryEvent?.request?.url || selectedError.sample_event_json?.request?.url) && (
                    <div>
                      <span className="font-medium text-gray-700 block mb-1">URL:</span>
                      <p className="text-gray-900 font-mono text-xs break-all">
                        {sentryEvent?.request?.url || selectedError.sample_event_json?.request?.url}
                      </p>
                    </div>
                  )}
                  {(sentryEvent?.request?.method || selectedError.sample_event_json?.request?.method) && (
                    <div>
                      <span className="font-medium text-gray-700 block mb-1">Method:</span>
                      <p className="text-gray-900 font-mono">
                        {sentryEvent?.request?.method || selectedError.sample_event_json?.request?.method}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Raw Event JSON - Collapsible */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <details>
                <summary className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-gray-700 flex items-center gap-2">
                  <FileJson className="w-4 h-4" />
                  Raw Event JSON (Click to expand)
                </summary>
                <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded mt-3 overflow-x-auto max-h-96 overflow-y-auto">
                  {JSON.stringify(sentryEvent || selectedError.sample_event_json, null, 2)}
                </pre>
              </details>
            </div>

            {/* No Data Message */}
            {!sentryEvent && !selectedError.sample_event_json && (
              <div className="bg-white rounded-lg p-4 border border-gray-200 text-center text-sm text-gray-500">
                No detailed event data available for this error group.
              </div>
            )}
          </div>
        )}
      </AdminDrawer>
    </>
  );
}
