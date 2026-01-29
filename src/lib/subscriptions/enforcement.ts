import { db } from '@/lib/db';

/**
 * Decision about a studio's status based on membership expiry
 */
export interface StudioStatusDecision {
  studioId: string;
  currentStatus: string;
  desiredStatus: 'ACTIVE' | 'INACTIVE';
  reason: 'admin_override' | 'expired' | 'active' | 'legacy';
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
  statusUpdate?: { status: 'ACTIVE' | 'INACTIVE' };
  unfeaturedUpdate?: boolean;
}

const ADMIN_EMAILS = ['admin@mpdee.co.uk', 'guy@voiceoverguy.co.uk'];

/**
 * Determines if an email belongs to an admin account
 */
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email);
}

/**
 * Computes desired status for a studio based on membership expiry
 */
export function computeStudioStatus(
  studio: {
    id: string;
    status: string;
    users: {
      email: string;
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
  
  // Check latest subscription
  const latestSubscription = studio.users.subscriptions?.[0];
  if (!latestSubscription?.current_period_end) {
    // Legacy profile: No subscription or no expiry date - keep ACTIVE
    // These are legacy profiles that should remain active and will get
    // a free 6-month membership when they first sign in
    return {
      studioId: studio.id,
      currentStatus: studio.status,
      desiredStatus: 'ACTIVE',
      reason: 'legacy',
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
      email: string;
      subscriptions?: Array<{ current_period_end: Date | null }>;
    };
  }>,
  now: Date = new Date()
): StudioEnforcementDecision[] {
  
  return studios
    .map(studio => {
      const statusDecision = computeStudioStatus(studio, now);
      const featuredDecision = computeFeaturedStatus(studio, now);
      
      const decision: StudioEnforcementDecision = {
        studioId: studio.id,
      };
      
      // Only include updates if status needs to change
      if (statusDecision.desiredStatus !== statusDecision.currentStatus) {
        decision.statusUpdate = { status: statusDecision.desiredStatus };
      }
      
      // Only include unfeature if needed
      if (featuredDecision.shouldUnfeature) {
        decision.unfeaturedUpdate = true;
      }
      
      return decision;
    })
    .filter(d => d.statusUpdate || d.unfeaturedUpdate); // Only return studios needing updates
}

/**
 * Applies enforcement decisions by updating the database
 */
export async function applyEnforcementDecisions(
  decisions: StudioEnforcementDecision[]
): Promise<{ statusUpdates: number; unfeaturedUpdates: number }> {
  
  if (decisions.length === 0) {
    return { statusUpdates: 0, unfeaturedUpdates: 0 };
  }
  
  const now = new Date();
  
  // Separate status updates and unfeature updates
  const statusUpdates = decisions.filter(d => d.statusUpdate);
  const unfeaturedUpdates = decisions.filter(d => d.unfeaturedUpdate);
  
  // Apply status updates
  if (statusUpdates.length > 0) {
    await Promise.all(
      statusUpdates.map(({ studioId, statusUpdate }) =>
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
    statusUpdates: statusUpdates.length,
    unfeaturedUpdates: unfeaturedUpdates.length,
  };
}
