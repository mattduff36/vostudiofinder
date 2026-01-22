import { db } from '@/lib/db';
import { calculateCompletionStats, type CompletionStats } from '@/lib/utils/profile-completion';

export interface ProfileVisibilityEligibility {
  allRequiredComplete: boolean;
  stats: CompletionStats;
  currentVisibility: boolean;
}

/**
 * Server-side helper to determine whether a user is eligible to enable public profile visibility.
 * Eligibility is based on the same "required fields" logic used by the dashboard completion widget.
 */
export async function getProfileVisibilityEligibility(userId: string): Promise<ProfileVisibilityEligibility> {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: {
      username: true,
      display_name: true,
      email: true,
      avatar_url: true,
    },
  });

  const studio = await db.studio_profiles.findUnique({
    where: { user_id: userId },
    select: {
      name: true,
      website_url: true,
      short_about: true,
      about: true,
      location: true,
      is_profile_visible: true,
      connection1: true,
      connection2: true,
      connection3: true,
      connection4: true,
      connection5: true,
      connection6: true,
      connection7: true,
      connection8: true,
      connection9: true,
      connection10: true,
      connection11: true,
      connection12: true,
      studio_studio_types: {
        select: { studio_type: true },
      },
      studio_images: {
        select: { id: true },
      },
    },
  });

  const stats = calculateCompletionStats({
    user: {
      username: user?.username || '',
      display_name: user?.display_name || '',
      email: user?.email || '',
      avatar_url: user?.avatar_url || null,
    },
    profile: {
      short_about: studio?.short_about || null,
      about: studio?.about || null,
      location: studio?.location || null,
      connection1: studio?.connection1 || null,
      connection2: studio?.connection2 || null,
      connection3: studio?.connection3 || null,
      connection4: studio?.connection4 || null,
      connection5: studio?.connection5 || null,
      connection6: studio?.connection6 || null,
      connection7: studio?.connection7 || null,
      connection8: studio?.connection8 || null,
      connection9: studio?.connection9 || null,
      connection10: studio?.connection10 || null,
      connection11: studio?.connection11 || null,
      connection12: studio?.connection12 || null,
    },
    studio: {
      name: studio?.name || null,
      studio_types: studio?.studio_studio_types?.map((t) => t.studio_type) || [],
      images: studio?.studio_images || [],
      website_url: studio?.website_url || null,
    },
  });

  return {
    allRequiredComplete: stats.required.completed === stats.required.total,
    stats,
    currentVisibility: studio?.is_profile_visible === true,
  };
}

