/**
 * Premium to Basic Downgrade Logic
 *
 * Performs all database and profile changes when a Premium membership expires or is cancelled.
 * Does NOT delete any user data (images, social links, connections) — only hides/limits in UI.
 */

import { db } from '@/lib/db';
import { sendTemplatedEmail } from '@/lib/email/send-templated';
import { getBaseUrl } from '@/lib/seo/site';

/**
 * Perform downgrade from Premium to Basic for a user.
 * Idempotent: safe to call multiple times (no-op if already BASIC).
 */
export async function performDowngrade(userId: string): Promise<{ downgraded: boolean; error?: string }> {
  try {
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        display_name: true,
        membership_tier: true,
        studio_profiles: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return { downgraded: false, error: 'User not found' };
    }

    if (user.membership_tier === 'BASIC') {
      return { downgraded: false };
    }

    const studioId = user.studio_profiles?.id;
    const now = new Date();

    await db.$transaction(async (tx) => {
      // 1. Set membership_tier to BASIC
      await tx.users.update({
        where: { id: userId },
        data: { membership_tier: 'BASIC', updated_at: now },
      });

      if (studioId) {
        // 2. Remove Premium visibility flags
        await tx.studio_profiles.update({
          where: { id: studioId },
          data: {
            show_phone: false,
            show_directions: false,
            is_verified: false,
            is_featured: false,
            featured_until: null,
            is_premium: false,
            updated_at: now,
          },
        });

        // 3. Revert VOICEOVER to HOME if needed
        const studioTypes = await tx.studio_studio_types.findMany({
          where: { studio_id: studioId },
          select: { studio_type: true },
        });

        const hasVoiceover = studioTypes.some((t) => t.studio_type === 'VOICEOVER');
        if (hasVoiceover) {
          await tx.studio_studio_types.deleteMany({
            where: {
              studio_id: studioId,
              studio_type: 'VOICEOVER',
            },
          });
          // If VOICEOVER was the only type, add HOME
          const remaining = studioTypes.filter((t) => t.studio_type !== 'VOICEOVER');
          if (remaining.length === 0) {
            const { randomBytes } = await import('crypto');
            await tx.studio_studio_types.create({
              data: {
                id: randomBytes(12).toString('base64url'),
                studio_id: studioId,
                studio_type: 'HOME',
              },
            });
          }
        }
      }

      // 4. Clear custom meta title (Premium advanced SEO feature)
      await tx.user_metadata.deleteMany({
        where: {
          user_id: userId,
          key: 'custom_meta_title',
        },
      });
    });

    // 5. Send downgrade confirmation email (outside transaction)
    // Non-critical: a failed email must not mask the successful downgrade,
    // otherwise enforcement skips setting the studio back to ACTIVE.
    try {
      const baseUrl = getBaseUrl();
      const renewUrl = `${baseUrl}/dashboard/settings?section=membership`;

      await sendTemplatedEmail({
        to: user.email,
        templateKey: 'downgrade-confirmation',
        variables: {
          displayName: user.display_name || 'there',
          renewUrl,
        },
        skipMarketingCheck: true,
      });
    } catch (emailError) {
      console.error('[Downgrade] Confirmation email failed (downgrade still applied):', emailError);
    }

    console.log(`[Downgrade] User ${userId} downgraded to BASIC`);
    return { downgraded: true };
  } catch (error) {
    console.error('[Downgrade] Error:', error);
    return {
      downgraded: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
