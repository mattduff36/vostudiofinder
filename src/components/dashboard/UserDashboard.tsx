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
  Crown,
  Calendar,
  Activity
} from 'lucide-react';

interface UserDashboardProps {
  data: {
    user: {
      id: string;
      displayName: string;
      email: string;
      username: string;
      role: string;
      avatarUrl?: string;
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
      studioType: string;
      status: string;
      isPremium: boolean;
      createdAt: Date;
      _count: { reviews: number };
    }>;
    reviews: Array<{
      id: string;
      rating: number;
      content: string;
      createdAt: Date;
      studio: {
        id: string;
        name: string;
      };
    }>;
    messages: Array<{
      id: string;
      subject: string;
      isRead: boolean;
      createdAt: Date;
      senderId: string;
      receiverId: string;
      sender: {
        displayName: string;
        avatarUrl?: string;
      };
      receiver: {
        displayName: string;
        avatarUrl?: string;
      };
      studio?: {
        name: string;
      };
    }>;
    connections: Array<{
      id: string;
      userId: string;
      connectedUserId: string;
      user: {
        id: string;
        displayName: string;
        avatarUrl?: string;
      };
      connectedUser: {
        id: string;
        displayName: string;
        avatarUrl?: string;
      };
    }>;
  };
}

export function UserDashboard({ data }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'studios' | 'reviews' | 'messages' | 'connections'>('overview');
  const { user, stats, studios, reviews, messages, connections } = data;

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
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-600" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-text-primary">
                  Welcome back, {user.displayName}!
                </h1>
                <p className="text-text-secondary">
                  @{user.username} • {user.role.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
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

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Reviews */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-text-primary">Recent Reviews</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-text-secondary">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-text-primary">{review.studio.name}</p>
                      <p className="text-sm text-text-secondary line-clamp-2 mt-1">
                        {review.content}
                      </p>
                    </div>
                  ))}
                  {reviews.length === 0 && (
                    <div className="p-8 text-center text-text-secondary">
                      No reviews yet. Start exploring studios!
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Messages */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-text-primary">Recent Messages</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {messages.slice(0, 5).map((message) => {
                    const isReceived = message.receiverId === user.id;
                    const otherUser = isReceived ? message.sender : message.receiver;
                    
                    return (
                      <div key={message.id} className={`p-4 ${!message.isRead && isReceived ? 'bg-blue-50' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            {otherUser.avatarUrl ? (
                              <img
                                src={otherUser.avatarUrl}
                                alt={otherUser.displayName}
                                className="w-6 h-6 rounded-full mr-2"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-gray-300 rounded-full mr-2 flex items-center justify-center">
                                <User className="w-3 h-3 text-gray-600" />
                              </div>
                            )}
                            <span className="text-sm font-medium text-text-primary">
                              {isReceived ? 'From' : 'To'} {otherUser.displayName}
                            </span>
                          </div>
                          <span className="text-xs text-text-secondary">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-text-primary font-medium">{message.subject}</p>
                        {message.studio && (
                          <p className="text-xs text-text-secondary mt-1">
                            Re: {message.studio.name}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="p-8 text-center text-text-secondary">
                      No messages yet.
                    </div>
                  )}
                </div>
              </div>
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
