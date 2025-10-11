'use client';

import { Button } from '@/components/ui/Button';
import { 
  User, 
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
  const { user } = data;

  const isStudioOwner = user.role === 'STUDIO_OWNER' || user.role === 'ADMIN';

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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
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
      </div>
    </div>
  );
}

