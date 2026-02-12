import { db } from '@/lib/db';
import { performDowngrade } from './downgrade';

/**
 * Decision about a studio's status based on membership expiry
 */
export interface StudioStatusDecision {
  studioId: string;
  currentStatus: string;
  desiredStatus: 'ACTIVE' | 'INACTIVE';
  reason: 'admin_override' | 'expired' | 'active' | 'basic_tier';
}

/**
 * Decision about a studio's featured status
 */
export interface FeaturedStatusDecision {
  studioId: string;
  shouldUnfeature: boolean;
  reason: 'expired_featured' | 'still_valid';
}

/**
 * Combined enforcement decisions for a single studio
 */
export interface StudioEnforcementDecision {
  studioId: string;
  userId?: string;
  statusUpdate?: { status: 'ACTIVE' | 'INACTIVE' };
  unfeaturedUpdate?: boolean;
  /** When true, Premium expired — perform downgrade then set ACTIVE */
  triggerDowngrade?: boolean;
}

const ADMIN_EMAILS = ['admin@mpdee.co.uk', 'guy@voiceoverguy.co.uk'];

/**
 * Determines if an email belongs to an admin account
 */
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email);
}

/**
 * Computes desired status for a studio based on membership tier + subscription expiry.
 *
 * Rules:
 *  - Admin accounts → always ACTIVE
 *  - Basic tier     → always ACTIVE (free tier, no subscription required)
 *  - Premium tier   → ACTIVE only if subscription has a future current_period_end
 */
export function computeStudioStatus(
  studio: {
    id: string;
    status: string;
    users: {
      email: string;
      membership_tier?: string;
      subscriptions?: Array<{ current_period_end: Date | null }>;
    };
  },
  now: Date
): StudioStatusDecision {
  const isAdmin = isAdminEmail(studio.users.email);
  
  // Admin accounts always ACTIVE
  if (isAdmin) {
    return {
      studioId: studio.id,
      currentStatus: studio.status,
      desiredStatus: 'ACTIVE',
      reason: 'admin_override',
    };
  }

  const membershipTier = studio.users.membership_tier || 'BASIC';
  
  // Basic tier: always ACTIVE (free tier, no subscription required)
  if (membershipTier === 'BASIC') {
    return {
      studioId: studio.id,
      currentStatus: studio.status,
      desiredStatus: 'ACTIVE',
      reason: 'basic_tier',
    };
  }
  
  // Premium tier: check subscription expiry
  const latestSubscription = studio.users.subscriptions?.[0];
  if (!latestSubscription?.current_period_end) {
    // Premium with no subscription = INACTIVE (expired Premium)
    return {
      studioId: studio.id,
      currentStatus: studio.status,
      desiredStatus: 'INACTIVE',
      reason: 'expired',
    };
  }
  
  const isExpired = latestSubscription.current_period_end < now;
  return {
    studioId: studio.id,
    currentStatus: studio.status,
    desiredStatus: isExpired ? 'INACTIVE' : 'ACTIVE',
    reason: isExpired ? 'expired' : 'active',
  };
}

/**
 * Computes whether a studio should be unfeatured due to expiry
 */
export function computeFeaturedStatus(
  studio: {
    id: string;
    is_featured: boolean;
    featured_until: Date | null;
  },
  now: Date
): FeaturedStatusDecision {
  if (!studio.is_featured) {
    return {
      studioId: studio.id,
      shouldUnfeature: false,
      reason: 'still_valid',
    };
  }
  
  if (studio.featured_until && studio.featured_until < now) {
    return {
      studioId: studio.id,
      shouldUnfeature: true,
      reason: 'expired_featured',
    };
  }
  
  return {
    studioId: studio.id,
    shouldUnfeature: false,
    reason: 'still_valid',
  };
}

/**
 * Computes enforcement decisions for a list of studios
 */
export function computeEnforcementDecisions(
  studios: Array<{
    id: string;
    status: string;
    is_featured: boolean;
    featured_until: Date | null;
    users: {
      id?: string;
      email: string;
      membership_tier?: string;
      subscriptions?: Array<{ current_period_end: Date | null }>;
    };
  }>,
  now: Date = new Date()
): StudioEnforcementDecision[] {
  
  return studios
    .map(studio => {
      const statusDecision = computeStudioStatus(studio, now);
      const featuredDecision = computeFeaturedStatus(studio, now);
      
      const userId = (studio.users as { id?: string }).id;
      const decision: StudioEnforcementDecision = {
        studioId: studio.id,
        ...(userId && { userId }),
      };
      
      // Status update: only when status needs to change (ACTIVE↔INACTIVE)
      if (statusDecision.desiredStatus !== statusDecision.currentStatus) {
        decision.statusUpdate = { status: statusDecision.desiredStatus };
      }

      // Downgrade: whenever Premium has expired, regardless of current studio status.
      // Handles the case where studio is already INACTIVE (e.g. manually set) but user
      // tier was never lowered — avoids leaving Premium users in an inconsistent state.
      if (statusDecision.reason === 'expired' && decision.userId) {
        decision.triggerDowngrade = true;
      }

      // Only include unfeature if needed
      if (featuredDecision.shouldUnfeature) {
        decision.unfeaturedUpdate = true;
      }

      return decision;
    })
    .filter(d => d.statusUpdate || d.unfeaturedUpdate || d.triggerDowngrade); // Only return studios needing updates
}

/**
 * Applies enforcement decisions by updating the database
 */
export async function applyEnforcementDecisions(
  decisions: StudioEnforcementDecision[]
): Promise<{ statusUpdates: number; unfeaturedUpdates: number; downgrades: number }> {
  
  if (decisions.length === 0) {
    return { statusUpdates: 0, unfeaturedUpdates: 0, downgrades: 0 };
  }
  
  const now = new Date();
  
  // Separate: downgrades (expired Premium), other status updates, unfeature updates
  const downgradeDecisions = decisions.filter(d => d.triggerDowngrade && d.userId);
  const otherStatusUpdates = decisions.filter(d => d.statusUpdate && !d.triggerDowngrade);
  const unfeaturedUpdates = decisions.filter(d => d.unfeaturedUpdate);
  
  let downgrades = 0;
  const successfulDowngradeStudioIds: string[] = [];

  // Perform downgrades first (expired Premium → BASIC, then studio stays ACTIVE)
  for (const d of downgradeDecisions) {
    const result = await performDowngrade(d.userId!);
    if (result.downgraded) {
      downgrades++;
      successfulDowngradeStudioIds.push(d.studioId);
    }
  }

  // Only set ACTIVE for studios whose downgrade succeeded. If downgrade failed,
  // user remains PREMIUM with expired subscription — studio should stay INACTIVE.
  if (successfulDowngradeStudioIds.length > 0) {
    await db.studio_profiles.updateMany({
      where: { id: { in: successfulDowngradeStudioIds } },
      data: { status: 'ACTIVE', updated_at: now },
    });
  }
  
  // Apply other status updates (non-downgrade)
  if (otherStatusUpdates.length > 0) {
    await Promise.all(
      otherStatusUpdates.map(({ studioId, statusUpdate }) =>
        db.studio_profiles.update({
          where: { id: studioId },
          data: { 
            status: statusUpdate!.status,
            updated_at: now 
          }
        })
      )
    );
  }
  
  // Apply unfeature updates (can be batch)
  if (unfeaturedUpdates.length > 0) {
    await db.studio_profiles.updateMany({
      where: { id: { in: unfeaturedUpdates.map(d => d.studioId) } },
      data: { 
        is_featured: false,
        updated_at: now 
      }
    });
  }
  
  return {
    statusUpdates: successfulDowngradeStudioIds.length + otherStatusUpdates.length,
    unfeaturedUpdates: unfeaturedUpdates.length,
    downgrades,
  };
}
