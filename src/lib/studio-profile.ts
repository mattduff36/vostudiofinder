import { randomBytes } from 'crypto';
import { db } from '@/lib/db';

/**
 * Ensures a studio_profiles row exists for the given user and is ACTIVE.
 *
 * - If no profile exists, creates a blank one (name='', is_profile_visible=false)
 *   so the user appears on /admin/studios immediately after activation.
 * - If a profile exists but is not ACTIVE, sets it to ACTIVE.
 * - Handles unique-constraint race conditions gracefully.
 */
export async function ensureStudioProfile(userId: string): Promise<void> {
  try {
    const existing = await db.studio_profiles.findUnique({
      where: { user_id: userId },
      select: { id: true, status: true },
    });

    const now = new Date();

    if (!existing) {
      await db.studio_profiles.create({
        data: {
          id: randomBytes(12).toString('base64url'),
          user_id: userId,
          name: '',
          city: '',
          is_profile_visible: false,
          show_email: true,
          created_at: now,
          updated_at: now,
        },
      });
      console.log(`[PROFILE] Created blank studio profile for user ${userId}`);
      return;
    }

    if (existing.status !== 'ACTIVE') {
      await db.studio_profiles.update({
        where: { user_id: userId },
        data: { status: 'ACTIVE', updated_at: now },
      });
      console.log(`[PROFILE] Studio status set to ACTIVE for user ${userId}`);
    }
  } catch (error: any) {
    // P2002 = unique constraint violation — another request already created the profile
    if (error?.code === 'P2002') {
      console.log(`[PROFILE] Race condition handled: profile already exists for user ${userId}`);
      return;
    }
    // Non-fatal: the user is already activated; log but don't throw
    console.error(`[PROFILE] Failed to ensure studio profile for user ${userId}:`, error);
  }
}
