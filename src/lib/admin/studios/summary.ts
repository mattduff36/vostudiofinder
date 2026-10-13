import type { Prisma } from '@prisma/client';
import { getProfileCompletion, type CompletionInput } from '@/lib/utils/profile-completion';
import type { Studio } from '@/components/admin/studios/types';

export const ADMIN_STUDIO_SELECT = {
          id: true,
          name: true,
          description: true,
          short_about: true,
          about_me: true,
          about: true,
          phone: true,
          location: true,
          equipment_list: true,
          services_offered: true,
          website_url: true,
          facebook_url: true,
          x_url: true,
          linkedin_url: true,
          instagram_url: true,
          youtube_url: true,
          tiktok_url: true,
          threads_url: true,
          soundcloud_url: true,
          vimeo_url: true,
          bluesky_url: true,
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
          rate_tier_1: true,
          status: true,
          is_verified: true,
          is_premium: true,
          is_featured: true,
          featured_until: true,
          is_spotlight: true,
          is_profile_visible: true,
          admin_review: true,
          created_at: true,
          updated_at: true,
          latitude: true,
          longitude: true,
          users: {
            select: {
              id: true,
              email_verified: true,
              display_name: true,
              email: true,
              username: true,
              avatar_url: true,
              created_at: true,
              updated_at: true,
              last_login: true,
              membership_tier: true,
              subscriptions: {
                orderBy: { created_at: 'desc' },
                take: 1,
                select: {
                  id: true,
                  current_period_end: true,
                  status: true,
                }
              }
            }
          },
          studio_studio_types: {
            select: {
              studio_type: true
            }
          },
          studio_images: {
            select: {
              id: true,
            }
          },
        } satisfies Prisma.studio_profilesSelect;
export type SelectedAdminStudio = Prisma.studio_profilesGetPayload<{ select: typeof ADMIN_STUDIO_SELECT }>;

export function studioCompletionInput(studio: SelectedAdminStudio): CompletionInput {
  return {
    ...studio, ...studio.users, studio_name: studio.name,
    images_count: studio.studio_images.length,
    studio_types_count: studio.studio_studio_types.length,
    rate_tier_1: studio.rate_tier_1,
  };
}

export function serializeAdminStudio(studio: SelectedAdminStudio): Studio {
  const completion = getProfileCompletion(studioCompletionInput(studio));
  return {
    ...studio,
    users: {
      id: studio.users.id,
      username: studio.users.username, display_name: studio.users.display_name,
      email: studio.users.email, email_verified: studio.users.email_verified,
      avatar_url: studio.users.avatar_url,
    },
    created_at: studio.created_at.toISOString(), updated_at: studio.updated_at.toISOString(),
    featured_until: studio.featured_until?.toISOString() ?? null,
    latitude: studio.latitude === null ? null : Number(studio.latitude),
    longitude: studio.longitude === null ? null : Number(studio.longitude),
    rate_tier_1: studio.rate_tier_1,
    last_login: studio.users.last_login?.toISOString() ?? null,
    membership_expires_at: studio.users.subscriptions[0]?.current_period_end?.toISOString() ?? null,
    membership_tier: studio.users.membership_tier || 'BASIC',
    images_count: studio.studio_images.length,
    studio_types_count: studio.studio_studio_types.length,
    profile_completion: completion.overall.percentage,
    completion,
  };
}

/** Keep display identity out of the established GET enforcement input. Adding a
 * users.id field to the DTO must never activate membership downgrade-on-read. */
export function studioListEnforcementInput(studio: SelectedAdminStudio) {
  return {
    id: studio.id, status: studio.status, is_featured: studio.is_featured,
    featured_until: studio.featured_until,
    users: { email: studio.users.email, membership_tier: studio.users.membership_tier,
      subscriptions: studio.users.subscriptions.map(sub => ({ current_period_end: sub.current_period_end })) },
  };
}
