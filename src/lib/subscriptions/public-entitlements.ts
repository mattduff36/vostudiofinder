import { getTierLimits } from '@/lib/membership-tiers';

interface EntitlementOwner {
  role?: string;
  membership_tier?: string;
  subscriptions?: Array<{ current_period_end: Date | null; status?: string }>;
}
export function effectivePublicTier(user: EntitlementOwner, now = new Date()): 'BASIC' | 'PREMIUM' {
  if (user.role === 'ADMIN') return 'PREMIUM';
  const sub = user.subscriptions?.[0];
  return user.membership_tier === 'PREMIUM' && sub?.current_period_end && sub.current_period_end > now
    && sub.status === 'ACTIVE' ? 'PREMIUM' : 'BASIC';
}

/** Project saved data into public entitlements; retain the originals for a later upgrade. */
export function applyPublicTierLimits<T extends Record<string, unknown>>(studio: T, tier: string): T {
  if (tier === 'PREMIUM') return studio;
  const limits = getTierLimits('BASIC');
  const result: Record<string, unknown> = { ...studio, is_premium: false, is_verified: false,
    is_featured: false, show_phone: false, show_directions: false, phone: null };
  if (Array.isArray(studio.studio_images)) result.studio_images = studio.studio_images.slice(0, limits.imagesMax);
  if (Array.isArray(studio.studio_studio_types)) result.studio_studio_types = studio.studio_studio_types
    .filter((t: { studio_type: string }) => !limits.studioTypesExcluded.includes(t.studio_type))
    .slice(0, limits.studioTypesMax ?? undefined);
  let connections = 0;
  for (let i = 1; i <= 12; i++) {
    const key = `connection${i}`;
    if (result[key] === '1' && ++connections > limits.connectionsMax) result[key] = '0';
  }
  result.custom_connection_methods = [];
  let socials = 0;
  for (const key of ['facebook_url', 'x_url', 'twitter_url', 'linkedin_url', 'instagram_url',
    'tiktok_url', 'threads_url', 'youtube_url', 'vimeo_url', 'bluesky_url', 'soundcloud_url']) {
    if (result[key] && ++socials > (limits.socialLinksMax ?? Infinity)) result[key] = null;
  }
  return result as T;
}

export const publicMembershipSelect = {
  role: true, membership_tier: true,
  subscriptions: { orderBy: { created_at: 'desc' as const }, take: 1,
    select: { current_period_end: true, status: true } },
} as const;

/** Never serialize entitlement records or roles into public owner data. */
export function publicOwner<T extends { username: string; avatar_url: string | null; id?: string; display_name?: string | null }>(user: T) {
  return { ...(user.id ? { id: user.id } : {}), username: user.username, avatar_url: user.avatar_url,
    ...(user.display_name ? { display_name: user.display_name } : {}) };
}
