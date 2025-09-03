'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Download, Trash2, Shield, AlertTriangle } from 'lucide-react';

export function GDPRSection() {
  const { data: session } = useSession();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleDataExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch('/api/user/data-export', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voiceoverstudiofinder-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setError('Please enter your password to confirm deletion');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmPassword: deletePassword,
          reason: deleteReason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }

      // Sign out and redirect
      await signOut({ callbackUrl: '/?deleted=true' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-text-primary">Data & Privacy</h2>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Manage your personal data and privacy settings in compliance with GDPR
          </p>
        </div>

        <div className="p-6 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Data Export Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-text-primary">Export Your Data</h3>
                <p className="text-sm text-text-secondary mt-1">
                  Download a complete copy of your personal data, including profile information, 
                  studios, reviews, messages, and connections.
                </p>
                <ul className="text-xs text-text-secondary mt-2 space-y-1">
                  <li>• Profile and account information</li>
                  <li>• Studio listings and reviews</li>
                  <li>• Messages and connections</li>
                  <li>• Subscription and payment history</li>
                </ul>
              </div>
              <Button
                onClick={handleDataExport}
                loading={isExporting}
                disabled={isExporting}
                variant="outline"
                className="ml-4"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export Data'}
              </Button>
            </div>
          </div>

          {/* Account Deletion Section */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-red-900">Delete Account</h3>
                <p className="text-sm text-red-700 mt-1">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                
                {!showDeleteConfirm ? (
                  <div className="mt-4">
                    <Button
                      onClick={() => setShowDeleteConfirm(true)}
                      variant="danger"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="bg-white border border-red-200 rounded p-4">
                      <h4 className="font-medium text-red-900 mb-3">Confirm Account Deletion</h4>
                      
                      <div className="space-y-3">
                        <Input
                          label="Enter your password to confirm"
                          type="password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          placeholder="Your current password"
                        />
                        
                        <Input
                          label="Reason for deletion (optional)"
                          value={deleteReason}
                          onChange={(e) => setDeleteReason(e.target.value)}
                          placeholder="Help us improve by sharing why you're leaving"
                        />
                      </div>
                      
                      <div className="bg-red-50 border border-red-200 rounded p-3 mt-4">
                        <p className="text-xs text-red-800 font-medium">
                          ⚠️ This will permanently delete:
                        </p>
                        <ul className="text-xs text-red-700 mt-1 space-y-1">
                          <li>• Your profile and account information</li>
                          <li>• All studio listings you've created</li>
                          <li>• Reviews you've written and received</li>
                          <li>• Messages and connections</li>
                          <li>• Subscription and billing history</li>
                        </ul>
                      </div>
                      
                      <div className="flex space-x-3 mt-4">
                        <Button
                          onClick={handleDeleteAccount}
                          loading={isDeleting}
                          disabled={isDeleting || !deletePassword.trim()}
                          variant="danger"
                          size="sm"
                        >
                          {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeletePassword('');
                            setDeleteReason('');
                            setError(null);
                          }}
                          variant="outline"
                          size="sm"
                          disabled={isDeleting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Privacy Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900">Your Privacy Rights</h3>
            <div className="text-xs text-blue-800 mt-2 space-y-2">
              <p>
                Under GDPR and other privacy laws, you have the right to:
              </p>
              <ul className="space-y-1 ml-4">
                <li>• Access your personal data (export feature above)</li>
                <li>• Correct inaccurate data (profile settings)</li>
                <li>• Delete your data (account deletion)</li>
                <li>• Restrict processing of your data</li>
                <li>• Data portability</li>
                <li>• Object to processing</li>
              </ul>
              <p className="mt-3">
                For questions about your data or to exercise these rights, contact us at{' '}
                <a href="mailto:privacy@voiceoverstudiofinder.com" className="underline">
                  privacy@voiceoverstudiofinder.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
