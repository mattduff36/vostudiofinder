import { db } from '@/lib/db';
import { Role } from '@prisma/client';

export interface MembershipStatus {
  isActive: boolean;
  isExpired: boolean;
  expiresAt: Date | null;
  daysRemaining: number | null;
}

/**
 * Get membership status for a user
 */
export async function getMembershipStatus(userId: string): Promise<MembershipStatus> {
  // Get latest subscription
  const subscription = await db.subscriptions.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: 1,
  });

  if (!subscription || !subscription.current_period_end) {
    return {
      isActive: false,
      isExpired: true,
      expiresAt: null,
      daysRemaining: null,
    };
  }

  const now = new Date();
  const expiresAt = subscription.current_period_end;
  const isExpired = expiresAt < now;
  const daysRemaining = isExpired
    ? 0
    : Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isActive: !isExpired && subscription.status === 'ACTIVE',
    isExpired,
    expiresAt,
    daysRemaining,
  };
}

/**
 * Check if user has active membership (or is admin)
 * Admins bypass membership checks
 */
export async function hasActiveMembership(userId: string): Promise<boolean> {
  // Check if user is admin
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === 'ADMIN') {
    return true; // Admins bypass membership checks
  }

  // Check membership status
  const status = await getMembershipStatus(userId);
  return status.isActive;
}

/**
 * Require active membership for an API route
 * Returns error response if membership is invalid
 */
export async function requireActiveMembership(userId: string): Promise<{ error?: string; status?: number }> {
  // Check if user is admin
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === 'ADMIN') {
    return {}; // Admin - no error
  }

  // Check membership
  const status = await getMembershipStatus(userId);

  if (!status.isActive) {
    if (status.isExpired) {
      return {
        error: 'Your membership has expired. Please renew to continue.',
        status: 402, // Payment Required
      };
    }
    return {
      error: 'Active membership required for this action.',
      status: 402,
    };
  }

  return {}; // No error - membership is active
}

/**
 * Get membership info for display in UI
 */
export async function getMembershipInfo(userId: string) {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });

  if (user?.role === 'ADMIN') {
    return {
      isAdmin: true,
      status: 'active',
      message: 'Admin account - unlimited access',
    };
  }

  const status = await getMembershipStatus(userId);

  if (status.isActive) {
    return {
      isAdmin: false,
      status: 'active',
      expiresAt: status.expiresAt,
      daysRemaining: status.daysRemaining,
      message: `Your membership expires in ${status.daysRemaining} day${status.daysRemaining !== 1 ? 's' : ''}`,
    };
  }

  if (status.isExpired) {
    return {
      isAdmin: false,
      status: 'expired',
      expiresAt: status.expiresAt,
      message: 'Your membership has expired',
      renewUrl: '/auth/membership',
    };
  }

  return {
    isAdmin: false,
    status: 'none',
    message: 'No active membership',
    purchaseUrl: '/auth/membership',
  };
}

/**
 * Check if user can perform a specific action
 */
export async function canPerformAction(
  userId: string,
  action: 'create_studio' | 'edit_studio' | 'send_message' | 'write_review'
): Promise<boolean> {
  // Admins can do everything
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === 'ADMIN') {
    return true;
  }

  // All member actions require active membership
  const status = await getMembershipStatus(userId);
  return status.isActive;
}

