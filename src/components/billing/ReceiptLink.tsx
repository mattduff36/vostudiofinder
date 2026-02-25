'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ReceiptData {
  receiptUrl: string | null;
  invoiceUrl: string | null;
  invoicePdf: string | null;
}

interface ReceiptLinkProps {
  sessionId: string;
}

export function ReceiptLink({ sessionId }: ReceiptLinkProps) {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReceipt() {
      try {
        const res = await fetch(`/api/user/receipts/${encodeURIComponent(sessionId)}`);
        if (res.ok) {
          const data = await res.json();
          setReceipt(data);
        }
      } catch {
        // Receipt link is non-critical; fail silently
      } finally {
        setIsLoading(false);
      }
    }

    fetchReceipt();
  }, [sessionId]);

  if (isLoading) {
    return (
      <span className="inline-flex items-center text-sm text-gray-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
        Loading receipt...
      </span>
    );
  }

  const url = receipt?.receiptUrl || receipt?.invoiceUrl;

  if (!url) {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center text-sm font-medium text-[#d42027] hover:text-[#b01b21] hover:underline transition-colors"
    >
      View receipt
      <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}
