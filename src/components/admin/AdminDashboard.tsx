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
    totalReservations: number;
    totalIssues: number;
    openIssues: number;
    totalSuggestions: number;
    openSuggestions: number;
  };
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  // Format payment amounts from pence to pounds
  // Round total to nearest full £, remove .00 from recent payments
  const formatPaymentAmount = (amountInPence: number, isTotal: boolean = false): string => {
    const pounds = amountInPence / 100;
    if (isTotal) {
      // Round total to nearest whole £
      return `£${Math.round(pounds)}`;
    }
    // Remove .00 from recent payments (e.g., £50.00 -> £50, but £50.50 -> £50.50)
    const formatted = pounds.toFixed(2);
    return formatted.endsWith('.00') ? `£${Math.round(pounds)}` : `£${formatted}`;
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      subtitle: `${stats.activeStudios} active studios`,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Verified Studios',
      value: stats.verifiedStudios.toLocaleString(),
      subtitle: stats.totalStudios > 0 
        ? `${Math.round((stats.verifiedStudios / stats.totalStudios) * 100)}% of total`
        : 'verified accounts',
      icon: CheckCircle,
      color: 'bg-purple-500',
    },
    {
      title: 'Featured Studios',
      value: stats.featuredStudios.toLocaleString(),
      subtitle: stats.totalStudios > 0
        ? `${Math.round((stats.featuredStudios / stats.totalStudios) * 100)}% of total`
        : 'homepage highlights',
      icon: Sparkles,
      color: 'bg-yellow-500',
    },
    {
      title: 'Payments',
      value: formatPaymentAmount(stats.totalPaymentAmount, true),
      subtitle: formatPaymentAmount(stats.recentPaymentAmount) + ' recent payments (30d)',
      icon: CreditCard,
      color: 'bg-green-500',
    },
    {
      title: 'Pending Reservations',
      value: stats.pendingReservations.toLocaleString(),
      subtitle: `${stats.totalReservations} total`,
      icon: Clock,
      color: 'bg-orange-500',
    },
    {
      title: 'New Issues',
      value: stats.openIssues.toLocaleString(),
      subtitle: `${stats.totalIssues} total`,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
    {
      title: 'New Suggestions',
      value: stats.openSuggestions.toLocaleString(),
      subtitle: `${stats.totalSuggestions} total`,
      icon: Lightbulb,
      color: 'bg-yellow-500',
    },
    {
      title: 'Active Users (30d)',
      value: stats.activeUsers30d.toLocaleString(),
      subtitle: stats.totalUsers > 0
        ? `${Math.round((stats.activeUsers30d / stats.totalUsers) * 100)}% of total`
        : 'active in last 30 days',
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
