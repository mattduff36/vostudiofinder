'use client';

import { useState, useEffect, Fragment } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { Button } from '@/components/ui/Button';
import { Search, RefreshCw, Filter, ChevronDown, ChevronUp, Banknote, AlertCircle, Check } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/date-format';

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  refunded_amount: number;
  created_at: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  users: {
    id: string;
    email: string;
    username: string;
    display_name: string;
    role: string;
    created_at: string;
  };
  refunds: Array<{
    id: string;
    stripe_refund_id: string;
    amount: number;
    currency: string;
    reason: string | null;
    comment: string | null;
    status: string;
    created_at: string;
    users_refunds_processed_byTousers: {
      id: string;
      email: string;
      display_name: string;
    } | null;
  }>;
}

export default function AdminPaymentsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  const [refundModalPaymentId, setRefundModalPaymentId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState<'duplicate' | 'fraudulent' | 'requested_by_customer' | '' | null>(null);
  const [refundComment, setRefundComment] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  
  // Mobile drawer state
  const [mobileSelectedPayment, setMobileSelectedPayment] = useState<Payment | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (sessionStatus === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, sessionStatus, router]);

  // Fetch payments
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/payments?${params}`);
      if (!response.ok) throw new Error('Failed to fetch payments');

      const data = await response.json();
      setPayments(data.payments || []);
      setPagination(data.pagination || {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 when statusFilter changes (including when cleared)
  useEffect(() => {
    if (pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Fetch payments when dependencies change
  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.role, pagination.page, statusFilter]);

  const handleSearch = () => {
    // Fetch payments with page 1 directly
    // Don't update pagination state here - let the response update it
    // This prevents triggering the useEffect which would cause duplicate API calls
    setLoading(true);
    
    const params = new URLSearchParams({
      page: '1',
      limit: pagination.limit.toString(),
    });

    if (searchTerm) {
      params.append('search', searchTerm);
    }
    if (statusFilter) {
      params.append('status', statusFilter);
    }

    fetch(`/api/admin/payments?${params}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch payments');
        return response.json();
      })
      .then(data => {
        setPayments(data.payments || []);
        setPagination(data.pagination || {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        });
      })
      .catch(error => {
        console.error('Error fetching payments:', error);
        setPayments([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const togglePaymentExpand = (paymentId: string) => {
    setExpandedPaymentId(expandedPaymentId === paymentId ? null : paymentId);
  };

  const handleRefund = async (payment: Payment) => {
    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      setRefundError('Please enter a valid refund amount');
      return;
    }

    if (!refundReason) {
      setRefundError('Please select a reason for the refund');
      return;
    }

    const amountInCents = Math.round(parseFloat(refundAmount) * 100);
    const maxRefundable = payment.amount - payment.refunded_amount;

    if (amountInCents > maxRefundable) {
      setRefundError(`Amount exceeds available balance (${(maxRefundable / 100).toFixed(2)})`);
      return;
    }

    setRefunding(true);
    setRefundError('');

    try {
      const response = await fetch(`/api/admin/payments/${payment.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInCents,
          reason: refundReason || null,
          comment: refundComment.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Refund failed');
      }

      setRefundSuccess(payment.id);
      setRefundModalPaymentId(null);
      setRefundAmount('');
      setRefundReason(null);
      setRefundComment('');

      // Refresh payments
      await fetchPayments();

      // Reset success message after 3 seconds
      setTimeout(() => setRefundSuccess(null), 3000);
    } catch (error: any) {
      setRefundError(error.message);
    } finally {
      setRefunding(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return 'bg-green-100 text-green-800';
      case 'REFUNDED':
        return 'bg-red-100 text-red-800';
      case 'PARTIALLY_REFUNDED':
        return 'bg-orange-100 text-orange-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  if (session?.user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Tabs */}
      <AdminTabs activeTab="payments" />

      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 md:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="mt-1 text-sm text-gray-600">View and manage all membership payments</p>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Email or Username
              </label>
              <div className="flex h-10">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="user@example.com or username"
                  className="flex-1 h-10 px-3 rounded-l-md border border-gray-300 shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
                />
                <Button
                  onClick={handleSearch}
                  className="h-10 rounded-l-none bg-red-600 hover:bg-red-700 px-4"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="SUCCEEDED">Succeeded</option>
                <option value="REFUNDED">Refunded</option>
                <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Button
              onClick={fetchPayments}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            <span className="text-sm text-gray-600">
              Showing {payments.length} of {pagination.total} payments
            </span>
          </div>
        </div>

        {/* Mobile Payments List - Hidden on desktop */}
        <div className="md:hidden space-y-3">
          {payments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">
                {searchTerm || statusFilter ? 'No payments found matching your filters' : 'No payments found'}
              </p>
            </div>
          ) : (
            payments.map((payment) => {
              const maxRefundable = payment.amount - payment.refunded_amount;
              const canRefund = maxRefundable > 0 && payment.status !== 'FAILED';
              
              return (
                <div
                  key={payment.id}
                  onClick={() => setMobileSelectedPayment(payment)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 active:bg-gray-50 transition-colors"
                >
                  {refundSuccess === payment.id && (
                    <div className="flex items-center mb-3 p-2 bg-green-50 border border-green-200 rounded">
                      <Check className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-sm text-green-800">Refund issued successfully</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {payment.users.display_name}
                      </h3>
                      <p className="text-sm text-gray-600">{payment.users.email}</p>
                      <p className="text-xs text-gray-500">@{payment.users.username}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatAmount(payment.amount, payment.currency)}
                      </p>
                      {canRefund && (
                        <p className="text-xs text-green-600 font-medium">Can refund</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                      {payment.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(payment.created_at)}
                    </span>
                  </div>

                  {payment.refunded_amount > 0 && (
                    <div className="mt-2 text-sm text-red-600">
                      Refunded: {formatAmount(payment.refunded_amount, payment.currency)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Payments Table - Hidden on mobile */}
        <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Refunded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 border-t border-gray-200">
                      {searchTerm || statusFilter ? 'No payments found matching your filters' : 'No payments found'}
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => {
                    const isExpanded = expandedPaymentId === payment.id;
                    const maxRefundable = payment.amount - payment.refunded_amount;
                    const canRefund = maxRefundable > 0 && payment.status !== 'FAILED';
                    const isRefundModalOpen = refundModalPaymentId === payment.id;

                    return (
                      <Fragment key={payment.id}>
                        {/* Success Message Row */}
                        {refundSuccess === payment.id && (
                          <tr key={`${payment.id}-success`}>
                            <td colSpan={6} className="px-6 py-3 bg-green-50 border-t border-green-200">
                              <div className="flex items-center">
                                <Check className="w-5 h-5 text-green-600 mr-2" />
                                <span className="text-sm text-green-800">Refund issued successfully</span>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Main Payment Row */}
                        <tr
                          key={payment.id}
                          onClick={() => togglePaymentExpand(payment.id)}
                          className="border-t border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {payment.users.display_name}
                            </div>
                            <div className="text-sm text-gray-500">{payment.users.email}</div>
                            <div className="text-xs text-gray-400">@{payment.users.username}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              {formatAmount(payment.amount, payment.currency)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                              {payment.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.refunded_amount > 0
                              ? formatAmount(payment.refunded_amount, payment.currency)
                              : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(payment.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400 ml-auto" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400 ml-auto" />
                            )}
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <tr key={`${payment.id}-details`}>
                            <td colSpan={6} className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Payment Information with Refund Action */}
                                <div className="bg-white rounded-lg border border-gray-200 p-3">
                                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Payment Information</h3>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                                    <div>
                                      <p className="text-xs text-gray-500">Payment ID</p>
                                      <p className="text-gray-900 font-mono text-xs">{payment.id}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Created</p>
                                      <p className="text-gray-900 text-xs">
                                        {formatDateTime(payment.created_at)}
                                      </p>
                                    </div>
                                    {payment.stripe_payment_intent_id && (
                                      <div className="col-span-2">
                                        <p className="text-xs text-gray-500">Stripe Payment Intent</p>
                                        <p className="text-gray-900 font-mono text-xs break-all">
                                          {payment.stripe_payment_intent_id}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Refund Action */}
                                  {canRefund && (
                                    <div className="border-t border-gray-200 pt-3 mt-3">
                                      {!isRefundModalOpen ? (
                                        <div>
                                          <p className="text-xs text-gray-600 mb-2">
                                            Available to refund: <span className="font-semibold">{formatAmount(maxRefundable, payment.currency)}</span>
                                          </p>
                                            <Button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Clear form state when opening modal for a new payment
                                              setRefundAmount('');
                                              setRefundReason(null);
                                              setRefundComment('');
                                              setRefundError('');
                                              setRefundModalPaymentId(payment.id);
                                            }}
                                            className="w-full bg-red-600 hover:bg-red-700"
                                            size="sm"
                                          >
                                            <Banknote className="w-4 h-4 mr-2" />
                                            Issue Refund
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              Amount ({payment.currency.toUpperCase()})
                                            </label>
                                            <input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              max={maxRefundable / 100}
                                              value={refundAmount}
                                              onChange={(e) => setRefundAmount(e.target.value)}
                                              placeholder="0.00"
                                              className="flex h-10 w-full rounded-md border border-form-border bg-transparent px-3 py-2 text-sm text-black ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-form-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                          </div>

                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              Reason
                                            </label>
                                            <select
                                              value={refundReason || ''}
                                              onChange={(e) => setRefundReason(e.target.value ? (e.target.value as 'duplicate' | 'fraudulent' | 'requested_by_customer') : null)}
                                              className="flex h-10 w-full rounded-md border border-form-border bg-transparent px-3 py-2 text-sm text-black ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-form-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                              <option value="" disabled className="text-gray-400">Select a reason...</option>
                                              <option value="requested_by_customer">Requested by customer</option>
                                              <option value="duplicate">Duplicate payment</option>
                                              <option value="fraudulent">Fraudulent transaction</option>
                                            </select>
                                          </div>

                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              Comment (Optional)
                                            </label>
                                            <textarea
                                              value={refundComment}
                                              onChange={(e) => setRefundComment(e.target.value)}
                                              placeholder="Add a note or comment about this refund..."
                                              rows={3}
                                              className="flex w-full rounded-md border border-form-border bg-transparent px-3 py-2 text-sm text-black ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-form-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                            />
                                          </div>

                                          {refundError && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start">
                                              <AlertCircle className="w-4 h-4 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                                              <span className="text-xs text-red-800">{refundError}</span>
                                            </div>
                                          )}

                                          <div className="flex space-x-2">
                                            <Button
                                              onClick={() => handleRefund(payment)}
                                              disabled={refunding}
                                              loading={refunding}
                                              className="flex-1 bg-red-600 hover:bg-red-700"
                                              size="sm"
                                            >
                                              Confirm
                                            </Button>
                                            <Button
                                              onClick={() => {
                                                setRefundModalPaymentId(null);
                                                setRefundAmount('');
                                                setRefundReason(null);
                                                setRefundComment('');
                                                setRefundError('');
                                              }}
                                              variant="outline"
                                              disabled={refunding}
                                              size="sm"
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Customer Information */}
                                <div className="bg-white rounded-lg border border-gray-200 p-3">
                                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer Information</h3>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div>
                                      <p className="text-xs text-gray-500">Name</p>
                                      <p className="text-gray-900 text-xs">{payment.users.display_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Username</p>
                                      <p className="text-gray-900 text-xs">@{payment.users.username}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-xs text-gray-500">Email</p>
                                      <p className="text-gray-900 text-xs">{payment.users.email}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Account Created</p>
                                      <p className="text-gray-900 text-xs">
                                        {formatDate(payment.users.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Refund History */}
                                {payment.refunds.length > 0 && (
                                  <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-3">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Refund History</h3>
                                    <div className="space-y-2">
                                      {payment.refunds.map((refund) => (
                                        <div key={refund.id} className="border border-gray-200 rounded-lg p-2 text-sm">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-red-600 text-sm">
                                              {formatAmount(refund.amount, refund.currency)}
                                            </span>
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${refund.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                              {refund.status}
                                            </span>
                                          </div>
                                          {refund.reason && (
                                            <p className="text-gray-600 text-xs mb-1">Reason: {refund.reason}</p>
                                          )}
                                          {refund.comment && (
                                            <p className="text-gray-600 text-xs mb-1">Comment: {refund.comment}</p>
                                          )}
                                          <p className="text-gray-500 text-xs">
                                            Processed by {refund.users_refunds_processed_byTousers?.display_name || 'System'} on{' '}
                                            {formatDateTime(refund.created_at)}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4">
            <Button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              variant="outline"
              className="border-gray-300"
            >
              Previous
            </Button>

            <span className="text-sm text-gray-700 font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <Button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.totalPages}
              variant="outline"
              className="border-gray-300"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Payment Details Drawer */}
      {mobileSelectedPayment && (
        <AdminDrawer
          isOpen={!!mobileSelectedPayment}
          onClose={() => {
            setMobileSelectedPayment(null);
            setRefundModalPaymentId(null);
            setRefundAmount('');
            setRefundReason(null);
            setRefundComment('');
            setRefundError('');
          }}
          title="Payment Details"
          showBackButton
        >
          <div className="p-4 space-y-4">
            {/* Success Message */}
            {refundSuccess === mobileSelectedPayment.id && (
              <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm text-green-800">Refund issued successfully</span>
              </div>
            )}

            {/* Payment Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Payment ID:</span>
                  <p className="text-gray-900 font-mono text-xs break-all">{mobileSelectedPayment.id}</p>
                </div>
                <div>
                  <span className="text-gray-500">Amount:</span>
                  <p className="text-lg font-bold text-gray-900">
                    {formatAmount(mobileSelectedPayment.amount, mobileSelectedPayment.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <div className="mt-1">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(mobileSelectedPayment.status)}`}>
                      {mobileSelectedPayment.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                {mobileSelectedPayment.refunded_amount > 0 && (
                  <div>
                    <span className="text-gray-500">Refunded:</span>
                    <p className="text-red-600 font-semibold">
                      {formatAmount(mobileSelectedPayment.refunded_amount, mobileSelectedPayment.currency)}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Date:</span>
                  <p className="text-gray-900">{formatDateTime(mobileSelectedPayment.created_at)}</p>
                </div>
                {mobileSelectedPayment.stripe_payment_intent_id && (
                  <div>
                    <span className="text-gray-500">Stripe Payment Intent:</span>
                    <p className="text-gray-900 font-mono text-xs break-all">
                      {mobileSelectedPayment.stripe_payment_intent_id}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <p className="text-gray-900">{mobileSelectedPayment.users.display_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <p className="text-gray-900">{mobileSelectedPayment.users.email}</p>
                </div>
                <div>
                  <span className="text-gray-500">Username:</span>
                  <p className="text-gray-900">@{mobileSelectedPayment.users.username}</p>
                </div>
              </div>
            </div>

            {/* Refund Section */}
            {(() => {
              const maxRefundable = mobileSelectedPayment.amount - mobileSelectedPayment.refunded_amount;
              const canRefund = maxRefundable > 0 && mobileSelectedPayment.status !== 'FAILED';
              const isRefundModalOpen = refundModalPaymentId === mobileSelectedPayment.id;

              return canRefund ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Issue Refund</h3>
                  
                  {!isRefundModalOpen ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">
                        Available to refund: <span className="font-semibold">{formatAmount(maxRefundable, mobileSelectedPayment.currency)}</span>
                      </p>
                      <Button
                        onClick={() => {
                          setRefundAmount('');
                          setRefundReason(null);
                          setRefundComment('');
                          setRefundError('');
                          setRefundModalPaymentId(mobileSelectedPayment.id);
                        }}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        <Banknote className="w-4 h-4 mr-2" />
                        Issue Refund
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount ({mobileSelectedPayment.currency.toUpperCase()})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={maxRefundable / 100}
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reason
                        </label>
                        <select
                          value={refundReason || ''}
                          onChange={(e) => setRefundReason(e.target.value ? (e.target.value as 'duplicate' | 'fraudulent' | 'requested_by_customer') : null)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="">Select a reason...</option>
                          <option value="requested_by_customer">Requested by customer</option>
                          <option value="duplicate">Duplicate payment</option>
                          <option value="fraudulent">Fraudulent transaction</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Comment (Optional)
                        </label>
                        <textarea
                          value={refundComment}
                          onChange={(e) => setRefundComment(e.target.value)}
                          placeholder="Add a note or comment about this refund..."
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                        />
                      </div>

                      {refundError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start">
                          <AlertCircle className="w-4 h-4 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-red-800">{refundError}</span>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleRefund(mobileSelectedPayment)}
                          disabled={refunding}
                          loading={refunding}
                          className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                          Confirm
                        </Button>
                        <Button
                          onClick={() => {
                            setRefundModalPaymentId(null);
                            setRefundAmount('');
                            setRefundReason(null);
                            setRefundComment('');
                            setRefundError('');
                          }}
                          variant="outline"
                          disabled={refunding}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null;
            })()}

            {/* Refund History */}
            {mobileSelectedPayment.refunds.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Refund History</h3>
                <div className="space-y-2">
                  {mobileSelectedPayment.refunds.map((refund) => (
                    <div key={refund.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-red-600">
                          {formatAmount(refund.amount, refund.currency)}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${refund.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {refund.status}
                        </span>
                      </div>
                      {refund.reason && (
                        <p className="text-gray-600 text-xs mb-1">Reason: {refund.reason}</p>
                      )}
                      {refund.comment && (
                        <p className="text-gray-600 text-xs mb-1">Comment: {refund.comment}</p>
                      )}
                      <p className="text-gray-500 text-xs">
                        Processed by {refund.users_refunds_processed_byTousers?.display_name || 'System'} on{' '}
                        {formatDateTime(refund.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AdminDrawer>
      )}
    </div>
  );
}
