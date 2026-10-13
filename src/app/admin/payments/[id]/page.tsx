'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { RefundForm } from '@/components/admin/payments/RefundForm';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, DollarSign, Check } from 'lucide-react';
import {
  describePaymentPackage,
  getPaymentPackageBadgeClass,
} from '@/lib/payment-package';

interface PaymentDetails {
  payment: {
    id: string;
    user_id: string;
    stripe_checkout_session_id: string | null;
    stripe_payment_intent_id: string | null;
    amount: number;
    currency: string;
    status: string;
    refunded_amount: number;
    created_at: string;
    metadata: unknown;
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
      status: string;
      created_at: string;
      users_refunds_processed_byTousers: {
        email: string;
        display_name: string;
      } | null;
    }>;
  };
  subscriptions: Array<{
    id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
  }> | null;
}

export default function PaymentDetailPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const paymentId = params.id as string;

  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [loadError, setLoadError] = useState('');
  const requestOwner = useRef<{ generation: number; controller?: AbortController }>({ generation: 0 });
  const [refundSuccess, setRefundSuccess] = useState(false);

  const fetchPaymentDetails = useCallback(async () => {
    requestOwner.current.controller?.abort();
    const controller = new AbortController();
    requestOwner.current.controller = controller;
    const generation = ++requestOwner.current.generation;
    setLoading(true); setLoadError('');
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 404 ? 'Payment not found' : response.status === 403 ? 'You do not have permission to view this payment.' : data.error || 'Failed to fetch payment details');
      if (generation === requestOwner.current.generation && !controller.signal.aborted) setDetails(data);
    } catch (error) {
      if (generation === requestOwner.current.generation && !controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Unable to load payment');
    } finally { if (generation === requestOwner.current.generation && !controller.signal.aborted) setLoading(false); }
  }, [paymentId]);
  useEffect(() => {
    if (session?.user?.role === 'ADMIN') void fetchPaymentDetails();
    else if (sessionStatus !== 'loading') { setLoading(false); setLoadError('You do not have permission to view this payment.'); }
    return () => { requestOwner.current.controller?.abort(); requestOwner.current.generation++; };
  }, [session?.user?.role, sessionStatus, fetchPaymentDetails]);

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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && (!details || details.payment.id !== paymentId)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!details || details.payment.id !== paymentId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p role="alert" className="text-gray-600">{loadError || 'Payment not found'}</p><Button onClick={fetchPaymentDetails} className="mt-4">Retry</Button>
          <Button onClick={() => router.push('/admin/payments')} className="mt-4">
            Back to Payments
          </Button>
        </div>
      </div>
    );
  }

  const maxRefundable = details.payment.amount - details.payment.refunded_amount;
  const canRefund = !!details.payment.stripe_payment_intent_id && ['SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(details.payment.status);
  const paymentPackage = describePaymentPackage(details.payment.metadata);

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Button
          onClick={() => router.push('/admin/payments')}
          variant="outline"
          className="mb-4 w-full md:w-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Payments
        </Button>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Payment Details</h1>
        <p className="text-gray-600 text-sm break-all">ID: {details.payment.id}</p>
      </div>

      {loadError && <p role="alert" className="mb-4 text-sm text-red-700">{loadError} <Button size="sm" variant="outline" onClick={fetchPaymentDetails}>Retry</Button></p>}
      {/* Success Message */}
      {refundSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <Check className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-green-800">Refund issued successfully</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Information</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Package</p>
                <span className={`inline-flex mt-1 px-3 py-1 text-sm font-semibold rounded-full ${getPaymentPackageBadgeClass(paymentPackage.tone)}`}>
                  {paymentPackage.label}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatAmount(details.payment.amount, details.payment.currency)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex mt-1 px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(details.payment.status)}`}>
                  {details.payment.status.replace(/_/g, ' ')}
                </span>
              </div>

              {details.payment.refunded_amount > 0 && (
                <div>
                  <p className="text-sm text-gray-500">Refunded Amount</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatAmount(details.payment.refunded_amount, details.payment.currency)}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="text-gray-900">
                  {new Date(details.payment.created_at).toLocaleString('en-GB')}
                </p>
              </div>

              {details.payment.stripe_payment_intent_id && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Stripe Payment Intent</p>
                  <p className="text-sm text-gray-900 font-mono">
                    {details.payment.stripe_payment_intent_id}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer</h2>

            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-gray-900">{details.payment.users.display_name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-900">{details.payment.users.email}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Username</p>
                <p className="text-gray-900">{details.payment.users.username}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Account Created</p>
                <p className="text-gray-900">
                  {new Date(details.payment.users.created_at).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>
          </div>

          {/* Refunds History */}
          {details.payment.refunds.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Refund History</h2>

              <div className="space-y-4">
                {details.payment.refunds.map((refund) => (
                  <div key={refund.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-red-600">
                        {formatAmount(refund.amount, refund.currency)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${refund.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {refund.status}
                      </span>
                    </div>

                    {refund.reason && (
                      <p className="text-sm text-gray-600 mb-2">Reason: {refund.reason}</p>
                    )}

                    <p className="text-sm text-gray-500">
                      Processed by {refund.users_refunds_processed_byTousers?.display_name || 'Provider / unknown historical actor'} on{' '}
                      {new Date(refund.created_at).toLocaleString('en-GB')}
                    </p>

                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      {refund.stripe_refund_id}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          {/* Refund Action */}
          {canRefund && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Issue Refund</h3>

              <p className="text-sm text-gray-600 mb-4">
                Available to refund: {formatAmount(maxRefundable, details.payment.currency)}
              </p>

              {!refundModalOpen ? (
                <Button
                  onClick={() => setRefundModalOpen(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-sm"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Issue Refund
                </Button>
              ) : (
                <RefundForm key={paymentId} paymentId={paymentId} onCancel={() => setRefundModalOpen(false)} onPersisted={async operation => { setRefundSuccess(operation.moneyStatus === 'SUCCEEDED'); await fetchPaymentDetails(); }} />
              )}
            </div>
          )}

          {/* Membership Info */}
          {details.subscriptions && details.subscriptions.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Membership</h3>

              {details.subscriptions.map((sub) => (
                <div key={sub.id} className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${sub.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {sub.status}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Period</p>
                    <p className="text-sm text-gray-900">
                      {new Date(sub.current_period_start).toLocaleDateString('en-GB')} -{' '}
                      {new Date(sub.current_period_end).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

