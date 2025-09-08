'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

interface ConnectionButtonProps {
  targetUserId: string;
  targetUserName: string;
  initialConnectionStatus: 'none' | 'pending' | 'connected' | 'blocked';
  onConnectionChange?: (status: string) => void;
}

export function ConnectionButton({
  targetUserId,
  targetUserName: _,
  initialConnectionStatus,
  onConnectionChange,
}: ConnectionButtonProps) {
  const { data: session } = useSession();
  const [connectionStatus, setConnectionStatus] = useState(initialConnectionStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    if (!session?.user) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId,
          action: 'connect',
        }),
      });

      if (response.ok) {
        setConnectionStatus('pending');
        onConnectionChange?.('pending');
      }
    } catch (error) {
      console.error('Failed to send connection request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
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
        setConnectionStatus('none');
        onConnectionChange?.('none');
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user || session.user.id === targetUserId) {
    return null;
  }

  const getButtonContent = () => {
    switch (connectionStatus) {
      case 'none':
        return {
          text: 'Connect',
          action: handleConnect,
          variant: 'primary' as const,
          icon: '👋',
        };
      case 'pending':
        return {
          text: 'Request Sent',
          action: () => {},
          variant: 'outline' as const,
          icon: '⏳',
          disabled: true,
        };
      case 'connected':
        return {
          text: 'Connected',
          action: handleDisconnect,
          variant: 'outline' as const,
          icon: '✓',
        };
      case 'blocked':
        return {
          text: 'Blocked',
          action: () => {},
          variant: 'outline' as const,
          icon: '🚫',
          disabled: true,
        };
      default:
        return {
          text: 'Connect',
          action: handleConnect,
          variant: 'primary' as const,
          icon: '👋',
        };
    }
  };

  const buttonProps = getButtonContent();

  return (
    <Button
      onClick={buttonProps.action}
      disabled={isLoading || buttonProps.disabled}
      variant={buttonProps.variant}
      size="sm"
      className="flex items-center gap-2"
    >
      <span>{buttonProps.icon}</span>
      {isLoading ? 'Loading...' : buttonProps.text}
    </Button>
  );
}
