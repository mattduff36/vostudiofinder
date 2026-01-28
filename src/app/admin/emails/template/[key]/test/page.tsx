'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';

export default function TestSendPage() {
  const params = useParams();
  const router = useRouter();
  const templateKey = params.key as string;

  const [recipientEmail, setRecipientEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    if (!recipientEmail) {
      setError('Please enter a recipient email address');
      return;
    }

    try {
      setSending(true);
      setError(null);
      setSuccess(false);

      // Generate sample variables based on template
      const sampleVariables: Record<string, any> = {
        displayName: 'Test User',
        username: 'testuser',
        userEmail: recipientEmail,
        verificationUrl: 'https://voiceoverstudiofinder.com/verify/test',
        resetUrl: 'https://voiceoverstudiofinder.com/reset/test',
        resetPasswordUrl: 'https://voiceoverstudiofinder.com/reset/test', // Required by legacy-user-announcement
        signupUrl: 'https://voiceoverstudiofinder.com/signup',
        customerName: 'Test Customer',
        amount: '10.00',
        currency: 'GBP',
        paymentId: 'pi_test123',
        planName: '1 Year Membership',
        nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        reservationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        daysRemaining: 7,
        retryUrl: 'https://voiceoverstudiofinder.com/retry',
        errorMessage: 'Card declined',
        refundAmount: '10.00',
        refundType: 'full',
        isFullRefund: 'yes',
        comment: 'Test refund',
        refundDate: new Date().toLocaleDateString('en-GB'),
        studioOwnerName: 'Test Studio Owner',
        studioName: 'Test Studio',
        email: recipientEmail,
        profileCompletion: 95,
        studioUrl: 'https://voiceoverstudiofinder.com/teststudio',
        adminDashboardUrl: 'https://voiceoverstudiofinder.com/admin',
      };

      const res = await fetch('/api/admin/emails/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey,
          recipientEmail,
          variables: sampleVariables,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to send test email');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/emails');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="px-4 py-4 md:p-6">
      <AdminTabs activeTab="emails" />

      <div className="max-w-2xl mx-auto mt-8">
        <button
          onClick={() => router.push('/admin/emails')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Templates
        </button>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Send Test Email</h1>
          <p className="text-gray-600 mb-6">
            Send a test email for template: <code className="px-2 py-1 bg-gray-100 rounded text-sm">{templateKey}</code>
          </p>

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
              ✓ Test email sent successfully! Redirecting...
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Email Address *
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="admin@example.com"
              disabled={sending || success}
            />
            <p className="text-xs text-gray-500 mt-1">
              The test email will be sent with sample variable data.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSend}
              disabled={sending || success}
              className="flex items-center gap-2 px-6 py-3 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              {sending ? 'Sending...' : 'Send Test Email'}
            </button>
            <button
              onClick={() => router.push('/admin/emails')}
              className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={sending}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
