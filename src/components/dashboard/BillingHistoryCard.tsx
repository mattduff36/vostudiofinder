'use client';

import { useState, useEffect, useCallback } from 'react';
import { Receipt, Download, ExternalLink, Loader2, FileText } from 'lucide-react';
import { showError } from '@/lib/toast';

interface BillingItem {
  id: string;
  type: 'invoice' | 'receipt';
  number: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  date: string;
  description: string;
  receiptUrl: string | null;
  invoiceUrl: string | null;
  invoicePdf: string | null;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function getStatusBadge(status: BillingItem['status']) {
  switch (status) {
    case 'paid':
      return { label: 'Paid', classes: 'text-green-700 bg-green-100 border-green-200' };
    case 'pending':
      return { label: 'Pending', classes: 'text-amber-700 bg-amber-100 border-amber-200' };
    case 'failed':
      return { label: 'Failed', classes: 'text-red-700 bg-red-100 border-red-200' };
    case 'refunded':
      return { label: 'Refunded', classes: 'text-gray-700 bg-gray-100 border-gray-200' };
    default:
      return { label: status, classes: 'text-gray-700 bg-gray-100 border-gray-200' };
  }
}

export function BillingHistoryCard() {
  const [items, setItems] = useState<BillingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingHistory();
  }, []);

  const fetchBillingHistory = async () => {
    try {
      const response = await fetch('/api/user/billing-history');
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch billing history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadInvoice = useCallback(async (invoiceId: string) => {
    setDownloadingId(invoiceId);
    try {
      const response = await fetch(`/api/user/invoices/${invoiceId}/download`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      showError('Failed to download invoice. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
        <div className="p-5">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Billing & Invoices</h3>
              <p className="text-xs text-gray-500">Payment history and invoice downloads</p>
            </div>
          </div>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
        <div className="p-5">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Billing & Invoices</h3>
              <p className="text-xs text-gray-500">Payment history and invoice downloads</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center py-4">No payment history yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
      <div className="p-5">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Receipt className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Billing & Invoices</h3>
            <p className="text-xs text-gray-500">Payment history and invoice downloads</p>
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const badge = getStatusBadge(item.status);
            const hasInvoiceDownload = item.type === 'invoice';
            const hasInvoiceLink = item.invoicePdf || item.invoiceUrl;
            const hasReceiptLink = item.receiptUrl;
            const isDownloading = downloadingId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4"
              >
                {/* Desktop layout */}
                <div className="hidden sm:flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {item.type === 'invoice' && item.number !== item.id && (
                          <span className="ml-1.5 text-gray-400">#{item.number}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${badge.classes}`}>
                      {badge.label}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 w-16 text-right">
                      {formatAmount(item.amount, item.currency)}
                    </span>

                    {item.status === 'paid' && (
                      <div className="flex items-center gap-1.5">
                        {hasInvoiceDownload && (
                          <button
                            onClick={() => downloadInvoice(item.id)}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            Invoice
                          </button>
                        )}
                        {!hasInvoiceDownload && hasInvoiceLink && (
                          <a
                            href={item.invoicePdf || item.invoiceUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Invoice
                          </a>
                        )}
                        {hasReceiptLink && (
                          <a
                            href={item.receiptUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Receipt
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile layout */}
                <div className="sm:hidden space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(item.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatAmount(item.amount, item.currency)}
                      </p>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 text-xs font-semibold rounded-full border ${badge.classes}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {item.status === 'paid' && (hasInvoiceDownload || hasInvoiceLink || hasReceiptLink) && (
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                      {hasInvoiceDownload && (
                        <button
                          onClick={() => downloadInvoice(item.id)}
                          disabled={isDownloading}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          {isDownloading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          Download Invoice
                        </button>
                      )}
                      {!hasInvoiceDownload && hasInvoiceLink && (
                        <a
                          href={item.invoicePdf || item.invoiceUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Invoice
                        </a>
                      )}
                      {hasReceiptLink && (
                        <a
                          href={item.receiptUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Receipt
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
