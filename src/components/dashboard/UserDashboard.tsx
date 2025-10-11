'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  User, 
  Building, 
  Star, 
  MessageCircle, 
  Users, 
  Plus,
  Settings,
  Activity
} from 'lucide-react';

interface UserDashboardProps {
  data: {
    user: {
      id: string;
      display_name: string;
      email: string;
      username: string;
      role: string;
      avatar_url?: string;
    };
    stats: {
      studiosOwned: number;
      reviewsWritten: number;
      totalConnections: number;
      unreadMessages: number;
    };
    studios: Array<{
      id: string;
      name: string;
      studio_type: string;
      status: string;
      is_premium: boolean;
      created_at: Date;
      _count: { reviews: number };
    }>;
    reviews: Array<{
      id: string;
      rating: number;
      content: string;
      created_at: Date;
      studio: {
        id: string;
        name: string;
      };
    }>;
    messages: Array<{
      id: string;
      subject: string;
      isRead: boolean;
      created_at: Date;
      sender_id: string;
      receiver_id: string;
      sender: {
        display_name: string;
        avatar_url?: string;
      };
      receiver: {
        display_name: string;
        avatar_url?: string;
      };
      studio?: {
        name: string;
      };
    }>;
    connections: Array<{
      id: string;
      user_id: string;
      connected_user_id: string;
      user: {
        id: string;
        display_name: string;
        avatar_url?: string;
      };
      connectedUser: {
        id: string;
        display_name: string;
        avatar_url?: string;
      };
    }>;
  };
}

export function UserDashboard({ data }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'studios' | 'reviews' | 'messages' | 'connections'>('overview');
  const { user, stats, reviews, messages } = data;

  const isStudioOwner = user.role === 'STUDIO_OWNER' || user.role === 'ADMIN';

  const statCards = [
    {
      title: 'Studios Owned',
      value: stats.studiosOwned,
      icon: Building,
      color: 'bg-blue-500',
      visible: isStudioOwner,
    },
    {
      title: 'Reviews Written',
      value: stats.reviewsWritten,
      icon: Star,
      color: 'bg-yellow-500',
      visible: true,
    },
    {
      title: 'Connections',
      value: stats.totalConnections,
      icon: Users,
      color: 'bg-green-500',
      visible: true,
    },
    {
      title: 'Unread Messages',
      value: stats.unreadMessages,
      icon: MessageCircle,
      color: 'bg-purple-500',
      urgent: stats.unreadMessages > 0,
      visible: true,
    },
  ].filter(card => card.visible);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-600" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-text-primary">
                  Welcome back, {user.display_name}!
                </h1>
                <p className="text-text-secondary">
                  @{user.username} • {user.role.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user.email === 'admin@mpdee.co.uk' && (
                <button
                  onClick={() => window.location.href = '/admin'}
                  className="bg-black hover:bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center transition-all font-medium"
                >
                  ADMIN
                </button>
              )}
              <Button
                onClick={() => window.location.href = '/profile'}
                variant="outline"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              
              {isStudioOwner && (
                <Button
                  onClick={() => window.location.href = '/studio/create'}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Studio
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              ...(isStudioOwner ? [{ id: 'studios', label: 'My Studios', icon: Building }] : []),
              { id: 'reviews', label: 'Reviews', icon: Star },
              { id: 'messages', label: 'Messages', icon: MessageCircle, badge: stats.unreadMessages },
              { id: 'connections', label: 'Connections', icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm relative ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-lg border border-gray-200 p-6 ${
                    stat.urgent ? 'ring-2 ring-red-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-secondary">{stat.title}</p>
                      <p className="text-3xl font-bold text-text-primary">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-text-primary mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => window.location.href = '/studios'}
                  variant="outline"
                  className="justify-start"
                >
                  <Building className="w-4 h-4 mr-2" />
                  Browse Studios
                </Button>
                
                {isStudioOwner && (
                  <Button
                    onClick={() => window.location.href = '/studio/create'}
                    variant="outline"
                    className="justify-start"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Studio
                  </Button>
                )}
                
                <Button
                  onClick={() => window.location.href = '/profile'}
                  variant="outline"
                  className="justify-start"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>

            {/* Placeholder */}
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-text-primary mb-2">
                Overview Page Under Development
              </h3>
              <p className="text-text-secondary max-w-md mx-auto">
                This section is currently being developed. Check back soon for activity insights, recent reviews, and messages.
              </p>
            </div>
          </div>
        )}

        {/* Other tabs would be implemented here */}
        {activeTab !== 'overview' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Section
            </h3>
            <p className="text-text-secondary">
              This section is under development. Advanced features for managing your {activeTab} will be available soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

