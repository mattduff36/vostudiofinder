'use client';

import { 
  Users, 
  CheckCircle,
  Sparkles,
  Activity,
  Clock,
  CreditCard,
  AlertTriangle,
  Lightbulb,
  Building2,
  Star,
  TrendingUp,
  MapPin,
  Link as LinkIcon
} from 'lucide-react';
import { AdminTabs } from './AdminTabs';

interface RecentActivityData {
  users: Array<{
    id: string;
    email: string;
    username: string;
    display_name: string;
    status: string;
    created_at: Date;
    studio_profiles: Array<{
      id: string;
      name: string;
      city: string;
      status: string;
      is_verified: boolean;
      is_featured: boolean;
    }> | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    created_at: Date;
    users: {
      id: string;
      username: string;
      display_name: string;
    };
  }>;
  studios: Array<{
    id: string;
    name: string;
    city: string;
    status: string;
    is_verified: boolean;
    is_featured: boolean;
    updated_at: Date;
    created_at: Date;
    users: {
      username: string;
      display_name: string;
    };
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    content: string | null;
    created_at: Date;
    studio_profiles: {
      name: string;
    };
    users_reviews_reviewer_idTousers: {
      username: string;
      display_name: string;
    };
  }>;
  customConnections: Array<{
    custom_connection_methods: string[];
    name: string;
    updated_at: Date;
    users: {
      username: string;
      display_name: string;
    };
  }>;
  customConnectionsStats: Array<[string, number]>;
}

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
  recentActivity: RecentActivityData;
}

export function AdminDashboard({ stats, recentActivity }: AdminDashboardProps) {
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

  // Format payment amount
  const formatPayment = (amountInPence: number, currency: string): string => {
    const pounds = amountInPence / 100;
    return `£${Math.round(pounds)}`;
  };

  // Get relative time
  function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  // Build unified activity feed with rich details
  const activities: Array<{
    id: string;
    type: 'user' | 'payment' | 'studio' | 'review' | 'custom_connection';
    icon: typeof Users;
    color: string;
    bgColor: string;
    title: string;
    description: string;
    metadata?: string;
    timestamp: Date;
  }> = [];

  // Add user activities with rich context
  recentActivity.users.forEach(user => {
    const studio = user.studio_profiles?.[0];
    const hasStudio = !!studio;
    const isActive = user.status === 'ACTIVE';
    const city = studio?.city || 'Unknown location';
    
    let description = `@${user.username} (${user.display_name})`;
    if (hasStudio) {
      description += ` joined from ${city}`;
      if (studio.is_verified) description += ' • Verified studio';
      if (studio.is_featured) description += ' • Featured';
      if (studio.status === 'ACTIVE') description += ' • Active';
    } else if (isActive) {
      description += ` joined • ${user.status} status`;
    } else {
      description += ` joined • ${user.status}`;
    }

    activities.push({
      id: `user-${user.id}`,
      type: 'user',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      title: 'New User Registration',
      description,
      metadata: hasStudio ? studio.name : undefined,
      timestamp: user.created_at,
    });
  });

  // Add payment activities
  recentActivity.payments.forEach(payment => {
    activities.push({
      id: `payment-${payment.id}`,
      type: 'payment',
      icon: CreditCard,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      title: 'Payment Received',
      description: `${formatPayment(payment.amount, payment.currency)} from @${payment.users.username} (${payment.users.display_name})`,
      timestamp: payment.created_at,
    });
  });

  // Add studio update activities
  recentActivity.studios.forEach(studio => {
    const isNew = studio.created_at.getTime() === studio.updated_at.getTime();
    const updates: string[] = [];
    
    if (studio.is_verified) updates.push('verified');
    if (studio.is_featured) updates.push('featured');
    if (studio.status === 'ACTIVE') updates.push('active');
    
    const updateText = updates.length > 0 ? ` • ${updates.join(', ')}` : '';
    
    activities.push({
      id: `studio-${studio.id}`,
      type: 'studio',
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      title: isNew ? 'New Studio Created' : 'Studio Updated',
      description: `${studio.name} by @${studio.users.username}${studio.city ? ` • ${studio.city}` : ''}${updateText}`,
      timestamp: studio.updated_at,
    });
  });

  // Add review activities
  recentActivity.reviews.forEach(review => {
    const stars = '⭐'.repeat(review.rating);
    activities.push({
      id: `review-${review.id}`,
      type: 'review',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      title: 'New Review',
      description: `${stars} ${review.rating}-star review for ${review.studio_profiles.name} by @${review.users_reviews_reviewer_idTousers.username}`,
      timestamp: review.created_at,
    });
  });

  // Add custom connection activities (most recent 10)
  recentActivity.customConnections.slice(0, 10).forEach(studio => {
    const methods = studio.custom_connection_methods.filter(m => m && m.trim());
    if (methods.length > 0) {
      activities.push({
        id: `custom-${studio.users.username}-${studio.updated_at.getTime()}`,
        type: 'custom_connection',
        icon: LinkIcon,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
        title: 'Custom Connection Added',
        description: `${studio.name} by @${studio.users.username} added: ${methods.join(', ')}`,
        timestamp: studio.updated_at,
      });
    }
  });

  // Sort by timestamp and limit to 30 most recent
  const sortedActivities = activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 30);

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

            {/* Recent Activity Section */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-gray-700" />
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Recent Activity & Insights</h2>
                      <p className="text-sm text-gray-600 mt-1">Platform activity with detailed context</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {sortedActivities.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No recent activity to display
                  </div>
                ) : (
                  sortedActivities.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${activity.bgColor}`}>
                              <Icon className={`w-4 h-4 ${activity.color}`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-900">
                                  {activity.title}
                                </span>
                                {activity.metadata && (
                                  <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-800">
                                    {activity.metadata}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                            </div>
                          </div>
                          
                          <time className="text-xs text-gray-500 whitespace-nowrap">
                            {getRelativeTime(activity.timestamp)}
                          </time>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Custom Connections Stats */}
            {recentActivity.customConnectionsStats.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <LinkIcon className="w-5 h-5 text-gray-700" />
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Custom Connection Methods</h2>
                      <p className="text-sm text-gray-600 mt-1">Most popular custom connections added by users</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentActivity.customConnectionsStats.map(([method, count], index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm font-medium text-gray-900">{method}</span>
                        <span className="text-sm text-gray-600">{count} {count === 1 ? 'user' : 'users'}</span>
                      </div>
                    ))}
                  </div>
                  {recentActivity.customConnections.length > 0 && (
                    <p className="text-xs text-gray-500 mt-4">
                      {recentActivity.customConnections.length} total users have added custom connection methods
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
