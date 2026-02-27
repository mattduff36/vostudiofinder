'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Lightbulb, 
  Loader2, 
  Mail, 
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Calendar,
  Trash2
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { showSuccess, showError } from '@/lib/toast';
import { showConfirm } from '@/components/ui/ConfirmDialog';
import { AdminTabs } from './AdminTabs';
import { AdminDrawer } from './AdminDrawer';

interface Suggestion {
  id: string;
  user_id: string;
  type: 'SUGGESTION';
  category: string;
  subject: string | null;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  users: {
    id: string;
    email: string;
    username: string;
    display_name: string;
  };
}

export function Suggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('type', 'SUGGESTION');
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      params.append('sortBy', 'created_at');
      params.append('sortOrder', 'desc');

      const response = await fetch(`/api/admin/support-tickets?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch suggestions');
      }

      setSuggestions(data.tickets);
    } catch (error) {
      logger.error('Error fetching suggestions:', error);
      showError('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleUpdateStatus = async (suggestionId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/admin/support-tickets/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      showSuccess('Status updated successfully');
      fetchSuggestions();
      if (selectedSuggestion?.id === suggestionId) {
        setSelectedSuggestion(data.ticket);
      }
    } catch (error: any) {
      logger.error('Error updating suggestion status:', error);
      showError(error.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSuggestion || !replyMessage.trim()) {
      showError('Please enter a reply message');
      return;
    }

    setSendingReply(true);
    try {
      const response = await fetch(`/api/admin/support-tickets/${selectedSuggestion.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyMessage,
          updateStatus: selectedSuggestion.status === 'OPEN' ? 'IN_PROGRESS' : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reply');
      }

      showSuccess('Reply sent successfully!');
      setReplyMessage('');
      fetchSuggestions();
    } catch (error: any) {
      logger.error('Error sending reply:', error);
      showError(error.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDeleteSuggestion = async (suggestionId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Suggestion?',
      message: 'This will permanently delete this suggestion. This action cannot be undone.',
      confirmText: 'Delete Suggestion',
      isDangerous: true,
    });

    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/support-tickets/${suggestionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete suggestion');
      }

      showSuccess('Suggestion deleted successfully');
      setSelectedSuggestion(null);
      setMobileDrawerOpen(false);
      fetchSuggestions();
    } catch (error: any) {
      logger.error('Error deleting suggestion:', error);
      showError(error.message || 'Failed to delete suggestion');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      OPEN: 'bg-blue-100 text-blue-700 border-blue-300',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      RESOLVED: 'bg-green-100 text-green-700 border-green-300',
      CLOSED: 'bg-gray-100 text-gray-700 border-gray-300',
    };

    const icons = {
      OPEN: Clock,
      IN_PROGRESS: Loader2,
      RESOLVED: CheckCircle2,
      CLOSED: XCircle,
    };

    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border flex items-center space-x-1 ${styles[status as keyof typeof styles] || styles.OPEN}`}>
        <Icon className="w-3 h-3" />
        <span>{status.replace('_', ' ')}</span>
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      LOW: 'bg-gray-100 text-gray-600',
      MEDIUM: 'bg-blue-100 text-blue-600',
      HIGH: 'bg-orange-100 text-orange-600',
      URGENT: 'bg-red-100 text-red-600',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[priority as keyof typeof styles] || styles.MEDIUM}`}>
        {priority}
      </span>
    );
  };

  return (
    <>
      <AdminTabs activeTab="suggestions" />

      <div className="px-4 py-4 md:p-8 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Suggestions</h1>
            <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
              Review user suggestions and feature requests
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-sm px-2.5 md:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="text-xs md:text-sm text-gray-600 flex-shrink-0">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Suggestions List */}
            <div className="lg:col-span-2 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
                  <Loader2 className="w-8 h-8 animate-spin text-[#d42027]" />
                </div>
              ) : suggestions.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No suggestions found</p>
                </div>
              ) : (
                suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    onClick={() => {
                      setSelectedSuggestion(suggestion);
                      setMobileDrawerOpen(true);
                    }}
                    className={`bg-white rounded-lg border cursor-pointer transition-all ${
                      selectedSuggestion?.id === suggestion.id
                        ? 'border-[#d42027] shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="p-3 md:p-4">
                      <div className="flex items-start justify-between mb-2 md:mb-3 gap-2">
                        <div className="flex items-center space-x-1.5 md:space-x-2 min-w-0">
                          <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 flex-shrink-0" />
                          <h3 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                            {suggestion.category}
                          </h3>
                        </div>
                        {getStatusBadge(suggestion.status)}
                      </div>

                      <p className="text-xs md:text-sm text-gray-700 mb-2 md:mb-3 line-clamp-2">
                        {suggestion.message}
                      </p>

                      <div className="flex items-center justify-between text-[10px] md:text-xs text-gray-500 gap-2">
                        <div className="flex items-center gap-2 md:space-x-3 min-w-0 truncate">
                          <span className="truncate">{suggestion.users.display_name}</span>
                          <span className="flex items-center space-x-1 flex-shrink-0">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(suggestion.created_at).toLocaleDateString('en-GB')}</span>
                          </span>
                        </div>
                        {getPriorityBadge(suggestion.priority)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Detail & Reply Panel - Hidden on mobile */}
            <div className="hidden lg:block lg:col-span-1">
              {selectedSuggestion ? (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm sticky top-4">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Lightbulb className="w-5 h-5 text-yellow-600" />
                        <h3 className="font-semibold text-gray-900">
                          Suggestion Details
                        </h3>
                      </div>
                      {getStatusBadge(selectedSuggestion.status)}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Category:</span>
                        <span className="ml-2 text-gray-600">{selectedSuggestion.category}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">From:</span>
                        <span className="ml-2 text-gray-600">{selectedSuggestion.users.display_name}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Email:</span>
                        <span className="ml-2 text-gray-600">{selectedSuggestion.users.email}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Priority:</span>
                        <span className="ml-2">{getPriorityBadge(selectedSuggestion.priority)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Submitted:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(selectedSuggestion.created_at).toLocaleString('en-GB')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">Message:</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedSuggestion.message}</p>
                  </div>

                  <div className="p-4 border-b border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Change Status
                    </label>
                    <select
                      value={selectedSuggestion.status}
                      onChange={(e) => handleUpdateStatus(selectedSuggestion.id, e.target.value)}
                      disabled={updatingStatus}
                      className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  <div className="p-4 border-b border-gray-200">
                    <button
                      onClick={() => handleDeleteSuggestion(selectedSuggestion.id)}
                      disabled={deleting}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Suggestion</span>
                        </>
                      )}
                    </button>
                  </div>

                  <form onSubmit={handleSendReply} className="p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reply via Email
                    </label>
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={6}
                      placeholder="Type your reply message..."
                      className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027] mb-3"
                      disabled={sendingReply}
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyMessage.trim()}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-[#d42027] rounded-md hover:bg-[#a1181d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {sendingReply ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          <span>Send Reply</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                  Select a suggestion to view details and reply
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Suggestion Details Drawer */}
      <AdminDrawer
        isOpen={mobileDrawerOpen && !!selectedSuggestion}
        onClose={() => {
          setMobileDrawerOpen(false);
          setReplyMessage('');
          setUpdatingStatus(false);
        }}
        title="Suggestion Details"
        showBackButton
      >
        {selectedSuggestion && (
          <div className="p-4 space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-gray-900">Suggestion</span>
              </div>
              {getStatusBadge(selectedSuggestion.status)}
            </div>

            {/* Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Category:</span>
                  <span className="ml-2 text-gray-900">{selectedSuggestion.category}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">From:</span>
                  <span className="ml-2 text-gray-900">{selectedSuggestion.users.display_name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="ml-2 text-gray-900 break-words">{selectedSuggestion.users.email}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Priority:</span>
                  <span className="ml-2">{getPriorityBadge(selectedSuggestion.priority)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Submitted:</span>
                  <span className="ml-2 text-gray-900 text-xs">
                    {new Date(selectedSuggestion.created_at).toLocaleString('en-GB')}
                  </span>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Message:</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedSuggestion.message}</p>
            </div>

            {/* Change Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Change Status
              </label>
              <select
                value={selectedSuggestion.status}
                onChange={(e) => handleUpdateStatus(selectedSuggestion.id, e.target.value)}
                disabled={updatingStatus}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Delete Button */}
            <div>
              <button
                onClick={() => handleDeleteSuggestion(selectedSuggestion.id)}
                disabled={deleting}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Suggestion</span>
                  </>
                )}
              </button>
            </div>

            {/* Reply Form */}
            <form onSubmit={handleSendReply} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Reply via Email
              </label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={6}
                placeholder="Type your reply message..."
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
                disabled={sendingReply}
              />
              <button
                type="submit"
                disabled={sendingReply || !replyMessage.trim()}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-[#d42027] rounded-md hover:bg-[#a1181d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {sendingReply ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Send Reply</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </AdminDrawer>
    </>
  );
}
