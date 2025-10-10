'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface Connection {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  created_at: string;
  acceptedAt?: string;
  initiatedBy: string;
  user: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
    role: string;
  };
  connectedUser: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
    role: string;
  };
}

interface ConnectionsListProps {
  status?: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  title: string;
  emptyMessage: string;
}

export function ConnectionsList({
  status,
  title,
  emptyMessage,
}: ConnectionsListProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchConnections();
  }, [status, page]);

  const fetchConnections = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      
      if (status) {
        params.append('status', status);
      }

      const response = await fetch(`/api/user/connections?${params}`);
      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectionAction = async (
    _connectionId: string,
    targetUserId: string,
    action: 'accept' | 'reject'
  ) => {
    try {
      const response = await fetch('/api/user/connections', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId,
          action,
        }),
      });

      if (response.ok) {
        // Refresh the list
        fetchConnections();
      }
    } catch (error) {
      console.error(`Failed to ${action} connection:`, error);
    }
  };

  const handleDisconnect = async (targetUserId: string) => {
    try {
      const response = await fetch('/api/user/connections', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId,
        }),
      });

      if (response.ok) {
        fetchConnections();
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      
      {connections.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => {
            // Determine which user to display (not the current user)
            const currentUserId = connection.user.id; // This would need to come from session
            const displayUser = connection.user.id !== currentUserId 
              ? connection.user 
              : connection.connectedUser;

            return (
              <div
                key={connection.id}
                className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    {displayUser.avatar_url ? (
                      <img
                        src={displayUser.avatar_url}
                        alt={displayUser.display_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-600 font-semibold">
                        {displayUser.display_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {displayUser.display_name}
                    </h3>
                    <p className="text-sm text-gray-500">@{displayUser.username}</p>
                    <p className="text-xs text-gray-400 capitalize">
                      {displayUser.role.replace('_', ' ').toLowerCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {status === 'PENDING' && (
                    <>
                      <Button
                        onClick={() => handleConnectionAction(
                          connection.id,
                          displayUser.id,
                          'accept'
                        )}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleConnectionAction(
                          connection.id,
                          displayUser.id,
                          'reject'
                        )}
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  
                  {status === 'ACCEPTED' && (
                    <Button
                      onClick={() => handleDisconnect(displayUser.id)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                    >
                      Disconnect
                    </Button>
                  )}

                  <div className="text-xs text-gray-500">
                    {status === 'ACCEPTED' && connection.acceptedAt
                      ? `Connected ${new Date(connection.acceptedAt).toLocaleDateString()}`
                      : `Requested ${new Date(connection.created_at).toLocaleDateString()}`
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2 mt-6">
          <Button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
