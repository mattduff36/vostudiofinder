import { db } from '@/lib/db';
import { performDowngrade } from './downgrade';

interface EnforcementStudio {
  id: string;
  status: string;
  is_featured: boolean;
  featured_until: Date | null;
  users: {
    id?: string;
    email: string;
    role?: string;
    status?: string;
    deletion_status?: string;
    membership_tier?: string;
    subscriptions?: Array<{ current_period_end: Date | null }>;
  };
}
export interface StudioStatusDecision {
  studioId: string;
  currentStatus: string;
  desiredStatus: string;
  reason: 'admin_override' | 'expired' | 'active' | 'basic_tier' | 'review';
}
export interface FeaturedStatusDecision {
  studioId: string;
  shouldUnfeature: boolean;
  reason: 'expired_featured' | 'still_valid';
}
export interface StudioEnforcementDecision {
  studioId: string;
  userId?: string;
  unfeaturedUpdate?: boolean;
  triggerDowngrade?: boolean;
}
export function isAdminEmail(email: string): boolean {
  return ['admin@mpdee.co.uk', 'guy@voiceoverguy.co.uk'].includes(email.toLowerCase());
}
/** Publication status is independent of membership. Never reactivate a manual hold. */
export function computeStudioStatus(studio: Pick<EnforcementStudio, 'id' | 'status' | 'users'>, now: Date): StudioStatusDecision {
  const expiry = studio.users.subscriptions?.[0]?.current_period_end;
  const reason = studio.users.role === 'ADMIN' || isAdminEmail(studio.users.email) ? 'admin_override'
    : (studio.users.membership_tier || 'BASIC') === 'BASIC' ? 'basic_tier'
    : !expiry ? 'review' : expiry <= now ? 'expired' : 'active';
  return { studioId: studio.id, currentStatus: studio.status, desiredStatus: studio.status, reason };
}
export function computeFeaturedStatus(studio: Pick<EnforcementStudio, 'id' | 'is_featured' | 'featured_until'>, now: Date): FeaturedStatusDecision {
  const expired = !!(studio.is_featured && studio.featured_until && studio.featured_until <= now);
  return { studioId: studio.id, shouldUnfeature: expired, reason: expired ? 'expired_featured' : 'still_valid' };
}
export function computeEnforcementDecisions(studios: EnforcementStudio[], now = new Date()): StudioEnforcementDecision[] {
  return studios.flatMap(studio => {
    if ((studio.users.status && studio.users.status !== 'ACTIVE')
      || (studio.users.deletion_status && studio.users.deletion_status !== 'ACTIVE')) return [];
    const expired = computeStudioStatus(studio, now).reason === 'expired';
    const unfeature = computeFeaturedStatus(studio, now).shouldUnfeature;
    if ((!expired || !studio.users.id) && !unfeature) return [];
    return [{ studioId: studio.id, ...(studio.users.id ? { userId: studio.users.id } : {}),
      ...(expired && studio.users.id ? { triggerDowngrade: true } : {}),
      ...(unfeature ? { unfeaturedUpdate: true } : {}) }];
  });
}
export async function applyEnforcementDecisions(decisions: StudioEnforcementDecision[]): Promise<{
  statusUpdates: number; unfeaturedUpdates: number; downgrades: number;
}> {
  let downgrades = 0;
  let processed = 0;
  const deadline = Date.now() + 35_000;
  for (const decision of decisions) {
    if (decision.triggerDowngrade && decision.userId) {
      if (processed >= 25 || Date.now() >= deadline) break;
      processed++;
      const result = await performDowngrade(decision.userId);
      if (result.error) throw new Error(result.error);
      if (result.downgraded) downgrades++;
    }
  }
  const now = new Date();
  const ids = decisions.filter(d => d.unfeaturedUpdate).map(d => d.studioId);
  // Recheck the date in the write so a concurrent featured renewal wins.
  const updated = ids.length ? await db.studio_profiles.updateMany({
    where: { id: { in: ids }, is_featured: true, featured_until: { lte: now } },
    data: { is_featured: false, updated_at: now },
  }) : { count: 0 };
  return { statusUpdates: 0, unfeaturedUpdates: updated.count, downgrades };
}
