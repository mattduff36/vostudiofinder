'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, Send, Users, FileText, Edit, Eye, TestTube,
  Plus, ChevronRight, Clock, CheckCircle, XCircle, Ban, RefreshCw,
} from 'lucide-react';

interface EmailTemplate {
  key: string;
  name: string;
  description?: string;
  layout: 'STANDARD' | 'HERO';
  isMarketing: boolean;
  isSystem: boolean;
  hasDbOverride: boolean;
  subject: string;
  updatedAt?: string;
}

interface Campaign {
  id: string;
  name: string;
  template_key: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  template?: { name: string; is_marketing: boolean };
  created_by?: { display_name: string };
}

interface Stats {
  templates: number;
  campaigns: number;
  sentToday: number;
  optInUsers: number;
}

export default function AdminEmailsPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'overview' | 'templates' | 'campaigns'>('overview');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats>({ templates: 0, campaigns: 0, sentToday: 0, optInUsers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [templatesRes, campaignsRes, statsRes] = await Promise.all([
        fetch('/api/admin/emails/templates'),
        fetch('/api/admin/emails/campaigns'),
        fetch('/api/admin/emails/stats'),
      ]);

      let templateCount = 0;
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        const tpls = data.templates || [];
        setTemplates(tpls);
        templateCount = tpls.length;
      }

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns || []);
      }

      let campaignCount = 0;
      let sentToday = 0;
      let optInUsers = 0;

      if (statsRes.ok) {
        const data = await statsRes.json();
        campaignCount = data.campaigns || 0;
        sentToday = data.sentToday || 0;
        optInUsers = data.optInUsers || 0;
      }

      setStats({
        templates: templateCount,
        campaigns: campaignCount,
        sentToday,
        optInUsers,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (templateKey: string) => {
    window.location.href = `/admin/emails/template/${templateKey}`;
  };

  const handlePreviewTemplate = (templateKey: string) => {
    window.location.href = `/admin/emails/template/${templateKey}/preview`;
  };

  const handleTestSend = (templateKey: string) => {
    window.location.href = `/admin/emails/template/${templateKey}/test`;
  };

  return (
    <>
      <AdminTabs activeTab="emails" />

      <div className="px-4 py-4 md:p-8">
      <div className="max-w-7xl mx-auto">
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
              <div className="text-2xl font-bold text-blue-700">{stats.templates}</div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Send className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Campaigns</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{stats.campaigns}</div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Sent Today</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">{stats.sentToday}</div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Opt-In Users</span>
              </div>
              <div className="text-2xl font-bold text-yellow-700">{stats.optInUsers}</div>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveView('overview')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeView === 'overview'
                    ? 'border-b-2 border-red-600 text-red-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveView('templates')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeView === 'templates'
                    ? 'border-b-2 border-red-600 text-red-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Templates ({templates.length})
              </button>
              <button
                onClick={() => setActiveView('campaigns')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeView === 'campaigns'
                    ? 'border-b-2 border-red-600 text-red-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Campaigns
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Overview View */}
            {activeView === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveView('templates')}
                      className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-red-600 hover:bg-red-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-red-600" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900">Manage Templates</div>
                          <div className="text-sm text-gray-500">Edit email content</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>

                    <button
                      onClick={() => router.push('/admin/emails/campaigns/create')}
                      className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-red-600 hover:bg-red-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Send className="w-6 h-6 text-red-600" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900">Create Campaign</div>
                          <div className="text-sm text-gray-500">Send to all or filtered users</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>

                    <button
                      onClick={() => router.push('/admin/emails/recipients')}
                      className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-red-600 hover:bg-red-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-red-600" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900">View Recipients</div>
                          <div className="text-sm text-gray-500">Browse and filter users</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">System Info</h2>
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
                          All email templates use locked layouts (Standard and Hero). You can edit the text content, but the HTML structure and formatting are preserved.
                        </p>
                        <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                          <li>View and edit all email templates</li>
                          <li>Send test emails to yourself or other admins</li>
                          <li>Templates automatically include unsubscribe links for marketing emails</li>
                          <li>All changes are versioned for audit trail</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Templates View */}
            {activeView === 'templates' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Email Templates</h2>
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <Plus className="w-4 h-4" />
                    Create Custom Template
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
                    <p className="mt-2 text-gray-600">Loading templates...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No templates found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <div
                        key={template.key}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-red-600 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-gray-900">{template.name}</h3>
                            {template.isMarketing && (
                              <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                                Marketing
                              </span>
                            )}
                            {template.isSystem && (
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                System
                              </span>
                            )}
                            {template.hasDbOverride && (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                                Modified
                              </span>
                            )}
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                              {template.layout}
                            </span>
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          )}
                          <p className="text-sm text-gray-500 mt-1">Key: {template.key}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleEditTemplate(template.key)}
                            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            title="Edit template"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handlePreviewTemplate(template.key)}
                            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            title="Preview template"
                          >
                            <Eye className="w-4 h-4" />
                            Preview
                          </button>
                          <button
                            onClick={() => handleTestSend(template.key)}
                            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                            title="Send test email"
                          >
                            <TestTube className="w-4 h-4" />
                            Test
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Campaigns View */}
            {activeView === 'campaigns' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Campaigns</h2>
                  <button
                    onClick={() => router.push('/admin/emails/campaigns/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Campaign
                  </button>
                </div>

                {campaigns.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Send className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No campaigns yet. Create your first campaign to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map(c => {
                      const statusColors: Record<string, string> = {
                        DRAFT: 'bg-gray-100 text-gray-700',
                        SCHEDULED: 'bg-blue-100 text-blue-700',
                        SENDING: 'bg-yellow-100 text-yellow-700',
                        SENT: 'bg-green-100 text-green-700',
                        FAILED: 'bg-red-100 text-red-700',
                        CANCELLED: 'bg-gray-100 text-gray-500',
                      };
                      const StatusIcon =
                        c.status === 'SENT' ? CheckCircle :
                        c.status === 'FAILED' ? XCircle :
                        c.status === 'SENDING' ? RefreshCw :
                        c.status === 'CANCELLED' ? Ban :
                        Clock;
                      return (
                        <button
                          key={c.id}
                          onClick={() => router.push(`/admin/emails/campaigns/${c.id}`)}
                          className="w-full text-left flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-red-600 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-medium text-gray-900 truncate">{c.name}</h3>
                              <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[c.status] || statusColors.DRAFT}`}>
                                <StatusIcon className="w-3 h-3" />
                                {c.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {c.template?.name || c.template_key}
                              {' · '}
                              {c.recipient_count.toLocaleString()} recipient{c.recipient_count !== 1 ? 's' : ''}
                              {c.sent_count > 0 && ` · ${c.sent_count.toLocaleString()} sent`}
                              {c.failed_count > 0 && ` · ${c.failed_count.toLocaleString()} failed`}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Created {new Date(c.created_at).toLocaleDateString()}
                              {c.created_by && ` by ${c.created_by.display_name}`}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
