'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Eye } from 'lucide-react';

export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const templateKey = params.key as string;

  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreview();
  }, [templateKey]);

  const loadPreview = async () => {
    try {
      setLoading(true);

      // Generate sample variables
      const sampleVariables: Record<string, any> = {
        displayName: 'John Doe',
        username: 'johndoe',
        userEmail: 'john@example.com',
        verificationUrl: 'https://voiceoverstudiofinder.com/verify/sample',
        resetUrl: 'https://voiceoverstudiofinder.com/reset/sample',
        resetPasswordUrl: 'https://voiceoverstudiofinder.com/reset/sample', // Required by legacy-user-announcement
        signupUrl: 'https://voiceoverstudiofinder.com/signup',
        customerName: 'John Doe',
        amount: '10.00',
        currency: 'GBP',
        paymentId: 'pi_sample123',
        planName: '1 Year Membership',
        nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        reservationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        daysRemaining: 7,
        retryUrl: 'https://voiceoverstudiofinder.com/retry',
        errorMessage: 'Payment method declined',
        refundAmount: '10.00',
        refundType: 'full',
        isFullRefund: 'yes',
        comment: 'Requested by customer',
        refundDate: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        studioOwnerName: 'John Doe',
        studioName: 'John\'s Voiceover Studio',
        email: 'john@example.com',
        profileCompletion: 95,
        studioUrl: 'https://voiceoverstudiofinder.com/johndoe',
        adminDashboardUrl: 'https://voiceoverstudiofinder.com/admin',
      };

      const res = await fetch('/api/admin/emails/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey,
          variables: sampleVariables,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate preview');
      }

      const data = await res.json();
      setHtml(data.html);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-4 md:p-6">
      <AdminTabs activeTab="emails" />

      <div className="max-w-7xl mx-auto mt-8">
        <button
          onClick={() => router.push('/admin/emails')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Templates
        </button>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <Eye className="w-6 h-6 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900">Email Preview</h1>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
              <p className="mt-2 text-gray-600">Generating preview...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          )}

          {!loading && !error && html && (
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <iframe
                srcDoc={html}
                className="w-full h-[800px] bg-white"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
