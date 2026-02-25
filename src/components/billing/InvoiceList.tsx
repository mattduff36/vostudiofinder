'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

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

export function InvoiceList() {
  const [items, setItems] = useState<BillingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/user/invoices/${invoiceId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download invoice:', error);
    }
  };

  const getStatusColor = (status: BillingItem['status']) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'refunded':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No payment history found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Payment History</h2>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-medium">
                  {item.type === 'invoice' ? `Invoice #${item.number}` : 'Payment Receipt'}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    item.status
                  )}`}
                >
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-1">{item.description}</p>
              <p className="text-sm text-gray-500">
                {new Date(item.date).toLocaleDateString('en-GB')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold">
                  {formatAmount(item.amount, item.currency)}
                </p>
              </div>

              {item.status === 'paid' && (
                <div className="flex items-center gap-2">
                  {item.receiptUrl && (
                    <a
                      href={item.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        Receipt
                      </Button>
                    </a>
                  )}

                  {item.type === 'invoice' && (
                    <Button
                      onClick={() => downloadInvoice(item.id)}
                      variant="outline"
                      size="sm"
                    >
                      Download
                    </Button>
                  )}

                  {item.type === 'receipt' && item.invoiceUrl && (
                    <a
                      href={item.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        Invoice
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
