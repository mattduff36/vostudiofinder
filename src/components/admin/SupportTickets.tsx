'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  Lightbulb, 
  Loader2, 
  Mail, 
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Calendar
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { showSuccess, showError } from '@/lib/toast';
import { AdminTabs } from './AdminTabs';

interface Ticket {
  id: string;
  user_id: string;
  type: 'ISSUE' | 'SUGGESTION';
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

export function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'ISSUE' | 'SUGGESTION'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'ALL') params.append('type', filterType);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      params.append('sortBy', 'created_at');
      params.append('sortOrder', 'desc');

      const response = await fetch(`/api/admin/support-tickets?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tickets');
      }

      setTickets(data.tickets);
    } catch (error) {
      logger.error('Error fetching support tickets:', error);
      showError('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/admin/support-tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      showSuccess('Status updated successfully');
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(data.ticket);
      }
    } catch (error: any) {
      logger.error('Error updating ticket status:', error);
      showError(error.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTicket || !replyMessage.trim()) {
      showError('Please enter a reply message');
      return;
    }

    setSendingReply(true);
    try {
      const response = await fetch(`/api/admin/support-tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyMessage,
          updateStatus: selectedTicket.status === 'OPEN' ? 'IN_PROGRESS' : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reply');
      }

      showSuccess('Reply sent successfully!');
      setReplyMessage('');
      fetchTickets();
    } catch (error: any) {
      logger.error('Error sending reply:', error);
      showError(error.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
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

  const getTypeIcon = (type: string) => {
    return type === 'ISSUE' ? (
      <AlertTriangle className="w-5 h-5 text-orange-600" />
    ) : (
      <Lightbulb className="w-5 h-5 text-yellow-600" />
    );
  };

  const filteredTickets = tickets;

  return (
    <>
      <AdminTabs activeTab="support" />

      <div className="p-8 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-gray-600 mt-2">
              Manage user-reported issues and suggestions
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
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
              >
                <option value="ALL">All Types</option>
                <option value="ISSUE">Issues</option>
                <option value="SUGGESTION">Suggestions</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>

              <div className="ml-auto text-sm text-gray-600">
                {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tickets List */}
            <div className="lg:col-span-2 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
                  <Loader2 className="w-8 h-8 animate-spin text-[#d42027]" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No tickets found</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`bg-white rounded-lg border cursor-pointer transition-all ${
                      selectedTicket?.id === ticket.id
                        ? 'border-[#d42027] shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(ticket.type)}
                          <h3 className="font-semibold text-gray-900">
                            {ticket.type === 'ISSUE' ? 'Issue' : 'Suggestion'} - {ticket.category}
                          </h3>
                        </div>
                        {getStatusBadge(ticket.status)}
                      </div>

                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {ticket.message}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-3">
                          <span>By: {ticket.users.display_name}</span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(ticket.created_at).toLocaleDateString('en-GB')}</span>
                          </span>
                        </div>
                        {getPriorityBadge(ticket.priority)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Ticket Detail & Reply Panel */}
            <div className="lg:col-span-1">
              {selectedTicket ? (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm sticky top-4">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(selectedTicket.type)}
                        <h3 className="font-semibold text-gray-900">
                          {selectedTicket.type === 'ISSUE' ? 'Issue Details' : 'Suggestion Details'}
                        </h3>
                      </div>
                      {getStatusBadge(selectedTicket.status)}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Category:</span>
                        <span className="ml-2 text-gray-600">{selectedTicket.category}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">From:</span>
                        <span className="ml-2 text-gray-600">{selectedTicket.users.display_name}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Email:</span>
                        <span className="ml-2 text-gray-600">{selectedTicket.users.email}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Priority:</span>
                        <span className="ml-2">{getPriorityBadge(selectedTicket.priority)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Submitted:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(selectedTicket.created_at).toLocaleString('en-GB')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">Message:</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedTicket.message}</p>
                  </div>

                  <div className="p-4 border-b border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Change Status
                    </label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
                      disabled={updatingStatus}
                      className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d42027]"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
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
                  Select a ticket to view details and reply
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

