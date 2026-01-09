'use client';

import { 
  Users, 
  CheckCircle,
  Sparkles,
  Activity,
  Clock,
  CreditCard,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { AdminTabs } from './AdminTabs';

interface AdminDashboardProps {
  stats: {
    totalUsers: number;
    totalStudios: number;
    activeStudios: number;
    verifiedStudios: number;
    featuredStudios: number;
    activeUsers30d: number;
    totalPayments: number;
    totalPaymentAmount: number;
    recentPaymentAmount: number;
    pendingReservations: number;
    expiredReservations: number;
    totalIssues: number;
    openIssues: number;
    totalSuggestions: number;
    openSuggestions: number;
  };
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  // Format payment amounts from pence to pounds
  const formatPaymentAmount = (amountInPence: number): string => {
    return `£${(amountInPence / 100).toFixed(2)}`;
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      subtitle: `${stats.activeStudios} Active Studios`,
      details: null,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Verified Studios',
      value: stats.verifiedStudios.toLocaleString(),
      subtitle: stats.totalStudios > 0 
        ? `${Math.round((stats.verifiedStudios / stats.totalStudios) * 100)}% of total`
        : 'Verified accounts',
      details: `${stats.totalStudios} total studios`,
      icon: CheckCircle,
      color: 'bg-purple-500',
    },
    {
      title: 'Featured Studios',
      value: stats.featuredStudios.toLocaleString(),
      subtitle: stats.totalStudios > 0
        ? `${Math.round((stats.featuredStudios / stats.totalStudios) * 100)}% of total`
        : 'Homepage highlights',
      details: 'Homepage highlights',
      icon: Sparkles,
      color: 'bg-yellow-500',
    },
    {
      title: 'Payments',
      value: formatPaymentAmount(stats.totalPaymentAmount),
      subtitle: formatPaymentAmount(stats.recentPaymentAmount) + ' Recent Payments (30d)',
      details: null,
      icon: CreditCard,
      color: 'bg-green-500',
    },
    {
      title: 'Reservations',
      value: (stats.pendingReservations + stats.expiredReservations).toLocaleString(),
      subtitle: `${stats.pendingReservations} pending`,
      details: `${stats.expiredReservations} expired`,
      icon: Clock,
      color: 'bg-orange-500',
    },
    {
      title: 'Issues',
      value: stats.openIssues.toLocaleString(),
      subtitle: `${stats.totalIssues} total`,
      details: 'Open support issues',
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
    {
      title: 'Suggestions',
      value: stats.openSuggestions.toLocaleString(),
      subtitle: `${stats.totalSuggestions} total`,
      details: 'Open suggestions',
      icon: Lightbulb,
      color: 'bg-yellow-500',
    },
    {
      title: 'Active Users (30d)',
      value: stats.activeUsers30d.toLocaleString(),
      subtitle: stats.totalUsers > 0
        ? `${Math.round((stats.activeUsers30d / stats.totalUsers) * 100)}% of total`
        : 'Active in last 30 days',
      details: null,
      icon: Activity,
      color: 'bg-teal-500',
    },
  ];

  return (
    <>
      <AdminTabs activeTab="overview" />

      <div className="p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Overview of platform statistics and recent activity
            </p>
          </div>

          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 ${stat.color} rounded-lg`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    {stat.subtitle && (
                      <p className="text-sm text-gray-700 mt-2 font-medium">{stat.subtitle}</p>
                    )}
                    {stat.details && (
                      <p className="text-xs text-gray-500 mt-1">{stat.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
