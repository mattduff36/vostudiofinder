import { StudioStatus } from '@prisma/client';
import { z } from 'zod';
import { STUDIO_MAX_WINDOW, type Studio } from '@/components/admin/studios/types';

export const studioListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(STUDIO_MAX_WINDOW).default(12),
  offset: z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - STUDIO_MAX_WINDOW).default(0),
  search: z.string().max(500).default(''),
  status: z.union([z.nativeEnum(StudioStatus), z.literal('all'), z.literal('')]).default('all'),
  sortBy: z.enum(['name', 'owner', 'status', 'updated_at', 'is_profile_visible', 'is_verified', 'is_featured', 'admin_review', 'last_login', 'profile_completion', 'membership_expires_at']).default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  studioId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/).optional(),
});

export function sortDerivedStudios(studios: Studio[], field: 'profile_completion' | 'membership_expires_at', direction: 'asc' | 'desc') {
  const sign = direction === 'asc' ? 1 : -1;
  return studios.sort((a, b) => {
    if (field === 'profile_completion') return sign * (a.profile_completion - b.profile_completion) || a.id.localeCompare(b.id);
    const aa = a.membership_expires_at, bb = b.membership_expires_at;
    if (!aa || !bb) return aa ? -1 : bb ? 1 : a.id.localeCompare(b.id);
    return sign * (Date.parse(aa) - Date.parse(bb)) || a.id.localeCompare(b.id);
  });
}
