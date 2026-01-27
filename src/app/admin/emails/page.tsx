'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { Mail, Send, Users, FileText } from 'lucide-react';

export default function AdminEmailsPage() {
  return (
    <div className="px-4 py-4 md:p-6">
      <AdminTabs activeTab="emails" />

      <div className="max-w-7xl mx-auto mt-4 md:mt-6">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Email Management</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage email templates, send test emails, and create bulk campaigns
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Templates</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">0</div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Send className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Campaigns</span>
              </div>
              <div className="text-2xl font-bold text-green-700">0</div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Sent Today</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">0</div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Opt-In Users</span>
              </div>
              <div className="text-2xl font-bold text-yellow-700">0</div>
            </div>
          </div>
        </div>

        {/* Under Construction Notice */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Mail className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Email Management System
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                This feature is currently under development. Once complete, you'll be able to:
              </p>
              <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>View and edit all email templates (with locked layouts)</li>
                <li>Send test emails to yourself or other admins</li>
                <li>Create and manage bulk email campaigns</li>
                <li>Filter users and send targeted announcements</li>
                <li>Track email delivery status and errors</li>
                <li>Manage marketing opt-in preferences</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
