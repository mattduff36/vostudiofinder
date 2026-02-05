import { db } from '@/lib/db';
import { type MembershipTier, getTierLimits, type TierLimits } from '@/lib/membership-tiers';

export interface MembershipStatus {
  isActive: boolean;
  isExpired: boolean;
  expiresAt: Date | null;
  daysRemaining: number | null;
  tier: MembershipTier;
}

/**
 * Get membership status for a user, including their tier.
 */
export async function getMembershipStatus(userId: string): Promise<MembershipStatus> {
  // Get user tier and latest subscription in one query
  const user = await db.users.findUnique({
    where: { id: userId },
    select: {
      membership_tier: true,
      role: true,
      subscriptions: {
        orderBy: { created_at: 'desc' },
        take: 1,
      },
    },
  });

  const tier = (user?.membership_tier as MembershipTier) || 'BASIC';
  const subscription = user?.subscriptions?.[0];

  if (!subscription || !subscription.current_period_end) {
    return {
      isActive: tier === 'BASIC', // Basic members are "active" without a subscription
      isExpired: tier === 'PREMIUM', // Only Premium is "expired" without a sub
      expiresAt: null,
      daysRemaining: null,
      tier,
    };
  }

  const now = new Date();
  const expiresAt = subscription.current_period_end;
  const isExpired = expiresAt < now;
  const daysRemaining = isExpired
    ? 0
    : Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isActive: tier === 'BASIC' || (!isExpired && subscription.status === 'ACTIVE'),
    isExpired: tier === 'PREMIUM' && isExpired,
    expiresAt,
    daysRemaining,
    tier,
  };
}

/**
 * Get a user's membership tier directly (lightweight query).
 */
export async function getUserTier(userId: string): Promise<MembershipTier> {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { membership_tier: true, role: true },
  });

  // Admins are always treated as Premium
  if (user?.role === 'ADMIN') return 'PREMIUM';
  return (user?.membership_tier as MembershipTier) || 'BASIC';
}

/**
 * Get a user's tier limits (combines tier lookup + limit resolution).
 */
export async function getUserTierLimits(userId: string): Promise<TierLimits> {
  const tier = await getUserTier(userId);
  return getTierLimits(tier);
}

/**
 * Check if user has active membership (or is admin).
 * Basic members now have "active" status by default (free tier).
 * Premium members need an active subscription.
 */
export async function hasActiveMembership(userId: string): Promise<boolean> {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { role: true, membership_tier: true },
  });

  if (user?.role === 'ADMIN') return true;

  // Basic members are always "active" (free tier)
  if (user?.membership_tier === 'BASIC') return true;

  // Premium members need an active subscription
  const status = await getMembershipStatus(userId);
  return status.isActive;
}

/**
 * Check if user has Premium-tier access (or is admin).
 * Use this to gate Premium-only features.
 */
export async function hasPremiumAccess(userId: string): Promise<boolean> {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { role: true, membership_tier: true },
  });

  if (user?.role === 'ADMIN') return true;
  if (user?.membership_tier !== 'PREMIUM') return false;

  // Ensure their subscription is still active
  const status = await getMembershipStatus(userId);
  return status.isActive;
}

/**
 * Require active membership for an API route.
 * Basic members now pass this check. Use requirePremiumMembership()
 * for Premium-only actions.
 */
export async function requireActiveMembership(userId: string): Promise<{ error?: string; status?: number }> {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { role: true, membership_tier: true },
  });

  if (user?.role === 'ADMIN') return {};

  // Basic members always have active membership (free tier)
  if (user?.membership_tier === 'BASIC') return {};

  // Premium members need active subscription
  const status = await getMembershipStatus(userId);
  if (!status.isActive) {
    if (status.isExpired) {
      return {
        error: 'Your Premium membership has expired. Please renew to continue.',
        status: 402,
      };
    }
    return {
      error: 'Active membership required for this action.',
      status: 402,
    };
  }

  return {};
}

/**
 * Require Premium membership for an API route.
 * Returns an error if the user is on Basic tier or their Premium has expired.
 */
export async function requirePremiumMembership(userId: string): Promise<{ error?: string; status?: number }> {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { role: true, membership_tier: true },
  });

  if (user?.role === 'ADMIN') return {};

  if (user?.membership_tier !== 'PREMIUM') {
    return {
      error: 'This feature requires a Premium membership. Upgrade to Premium for £25/year to unlock all features.',
      status: 403,
    };
  }

  // Ensure subscription is still active
  const status = await getMembershipStatus(userId);
  if (!status.isActive) {
    return {
      error: 'Your Premium membership has expired. Please renew to continue using Premium features.',
      status: 402,
    };
  }

  return {};
}

/**
 * Get membership info for display in UI
 */
export async function getMembershipInfo(userId: string) {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { role: true, email: true, membership_tier: true },
  });

  const tier = (user?.membership_tier as MembershipTier) || 'BASIC';

  if (user?.role === 'ADMIN') {
    return {
      isAdmin: true,
      tier: 'PREMIUM' as MembershipTier,
      isPremium: true,
      status: 'active',
      message: 'Admin account - unlimited access',
    };
  }

  const status = await getMembershipStatus(userId);

  if (tier === 'BASIC') {
    return {
      isAdmin: false,
      tier,
      isPremium: false,
      status: 'active',
      message: 'Basic membership (Free)',
      upgradeUrl: '/auth/membership',
    };
  }

  // Premium tier
  if (status.isActive) {
    return {
      isAdmin: false,
      tier,
      isPremium: true,
      status: 'active',
      expiresAt: status.expiresAt,
      daysRemaining: status.daysRemaining,
      message: `Premium membership expires in ${status.daysRemaining} day${status.daysRemaining !== 1 ? 's' : ''}`,
    };
  }

  if (status.isExpired) {
    return {
      isAdmin: false,
      tier,
      isPremium: false, // Expired Premium = no premium access
      status: 'expired',
      expiresAt: status.expiresAt,
      message: 'Your Premium membership has expired',
      renewUrl: '/auth/membership',
    };
  }

  return {
    isAdmin: false,
    tier,
    isPremium: false,
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
  _action: 'create_studio' | 'edit_studio' | 'send_message' | 'write_review'
): Promise<boolean> {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { role: true, membership_tier: true },
  });

  if (user?.role === 'ADMIN') return true;

  // Both Basic and Premium can perform these actions
  // (edit_studio within their tier limits is handled at the endpoint level)
  return true;
}

