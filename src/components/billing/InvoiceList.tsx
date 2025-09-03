'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  date: string;
  downloadUrl?: string;
  description: string;
}

export function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/user/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
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

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Assuming amount is in cents
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

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No invoices found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Payment History</h2>
      
      <div className="space-y-3">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-medium">Invoice #{invoice.number}</h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    invoice.status
                  )}`}
                >
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-1">{invoice.description}</p>
              <p className="text-sm text-gray-500">
                {new Date(invoice.date).toLocaleDateString('en-GB')}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold">
                  {formatAmount(invoice.amount, invoice.currency)}
                </p>
              </div>
              
              {invoice.status === 'paid' && (
                <Button
                  onClick={() => downloadInvoice(invoice.id)}
                  variant="outline"
                  size="sm"
                >
                  Download
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
