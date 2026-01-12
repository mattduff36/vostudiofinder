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
  XCircle,
  AlertCircle,
  Info,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { showSuccess, showError } from '@/lib/toast';
import { AdminTabs } from './AdminTabs';

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

export function ErrorLog() {
  const [errorLogGroups, setErrorLogGroups] = useState<ErrorLogGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchText, setSearchText] = useState('');
  const [selectedError, setSelectedError] = useState<ErrorLogGroupDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);

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
      const response = await fetch(`/api/admin/error-log/${errorId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch error details');
      }

      setSelectedError(data.errorLogGroup);
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
    } else {
      fetchErrorDetails(errorId);
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

  return (
    <>
      <AdminTabs activeTab="error_log" />

      <div className="p-8 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Error Log</h1>
            <p className="text-gray-600 mt-2">
              Monitor and review site-wide errors captured by Sentry
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="RESOLVED">Resolved</option>
                <option value="IGNORED">Ignored</option>
              </select>

              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
              >
                <option value="ALL">All Levels</option>
                <option value="fatal">Fatal</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>

              <input
                type="text"
                placeholder="Search errors..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027] flex-grow max-w-md"
              />

              <div className="ml-auto text-sm text-gray-600">
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
                  {/* Error Summary */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getLevelBadge(error.level)}
                          {getStatusBadge(error.status)}
                          {error.environment && (
                            <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                              {error.environment}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-medium text-gray-900 mb-1 break-words">
                          {error.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            First: {formatDate(error.first_seen_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Last: {formatDate(error.last_seen_at)}
                          </span>
                          <span className="font-medium text-gray-700">
                            {error.event_count.toLocaleString()} occurrence{error.event_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleErrorDetails(error.id)}
                          disabled={loadingDetails && expandedErrorId === error.id}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1"
                        >
                          {loadingDetails && expandedErrorId === error.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : expandedErrorId === error.id ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Show Details
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedErrorId === error.id && selectedError && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900">Error Details</h4>
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

                      <div className="space-y-3">
                        {/* Metadata */}
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Sentry Issue ID:</span>
                              <p className="text-gray-900 font-mono">{selectedError.sentry_issue_id}</p>
                            </div>
                            {selectedError.last_event_id && (
                              <div>
                                <span className="font-medium text-gray-700">Last Event ID:</span>
                                <p className="text-gray-900 font-mono text-xs">{selectedError.last_event_id}</p>
                              </div>
                            )}
                            {selectedError.release && (
                              <div>
                                <span className="font-medium text-gray-700">Release:</span>
                                <p className="text-gray-900">{selectedError.release}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Sample Event JSON */}
                        {selectedError.sample_event_json && (
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-900 mb-2">Sample Event Data</h5>
                            
                            {/* Exception/Message */}
                            {selectedError.sample_event_json.message && (
                              <div className="mb-3">
                                <span className="text-xs font-medium text-gray-700">Message:</span>
                                <p className="text-sm text-gray-900 mt-1">{selectedError.sample_event_json.message}</p>
                              </div>
                            )}

                            {/* Stack Trace */}
                            {selectedError.sample_event_json.exception?.values?.[0]?.stacktrace && (
                              <div className="mb-3">
                                <span className="text-xs font-medium text-gray-700">Stack Trace:</span>
                                <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded mt-1 overflow-x-auto max-h-64 overflow-y-auto">
                                  {JSON.stringify(selectedError.sample_event_json.exception.values[0].stacktrace, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Request Context */}
                            {selectedError.sample_event_json.request && (
                              <div className="mb-3">
                                <span className="text-xs font-medium text-gray-700">Request:</span>
                                <div className="text-sm mt-1">
                                  <p><span className="font-medium">URL:</span> {selectedError.sample_event_json.request.url}</p>
                                  <p><span className="font-medium">Method:</span> {selectedError.sample_event_json.request.method}</p>
                                </div>
                              </div>
                            )}

                            {/* Tags */}
                            {selectedError.sample_event_json.tags && Object.keys(selectedError.sample_event_json.tags).length > 0 && (
                              <div className="mb-3">
                                <span className="text-xs font-medium text-gray-700">Tags:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {Object.entries(selectedError.sample_event_json.tags).map(([key, value]) => (
                                    <span key={key} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                      {key}: {String(value)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Full JSON (collapsed) */}
                            <details className="mt-3">
                              <summary className="text-xs font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                                View Full Event JSON
                              </summary>
                              <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded mt-2 overflow-x-auto max-h-96 overflow-y-auto">
                                {JSON.stringify(selectedError.sample_event_json, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}

                        {!selectedError.sample_event_json && (
                          <div className="bg-white rounded-lg p-3 border border-gray-200 text-center text-sm text-gray-500">
                            No sample event data available for this error group.
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
    </>
  );
}
