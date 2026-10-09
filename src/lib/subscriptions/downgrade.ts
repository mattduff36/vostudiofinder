import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { sendTemplatedEmail } from '@/lib/email/send-templated';
import { getBaseUrl } from '@/lib/seo/site';

interface DowngradeOptions {
  sendEmail?: boolean;
}

/** All callers recheck entitlement under a lock. Expiry changes benefits, not consent. */
export async function performDowngrade(userId: string, options: DowngradeOptions = {}) {
  try {
    const now = new Date();
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM subscriptions WHERE user_id = ${userId} FOR UPDATE`;
      const user = await tx.users.findUnique({ where: { id: userId }, include: {
        subscriptions: { orderBy: { created_at: 'desc' }, take: 1 },
        studio_profiles: { include: { studio_studio_types: true } },
      } });
      if (!user || user.membership_tier === 'BASIC' || user.role === 'ADMIN'
        || user.status !== 'ACTIVE' || user.deletion_status !== 'ACTIVE'
        || user.deletion_requested_at || user.deletion_scheduled_for) return null;
      const expiry = user.subscriptions[0]?.current_period_end;
      // Missing entitlement records require review; do not guess that a grant expired.
      if (!expiry || expiry > now) return null;
      const studio = user.studio_profiles;
      const hasVoiceover = studio?.studio_studio_types.some(t => t.studio_type === 'VOICEOVER') ?? false;
      await tx.users.update({ where: { id: userId }, data: { membership_tier: 'BASIC', updated_at: now } });
      if (studio) await tx.studio_profiles.update({ where: { id: studio.id }, data: {
        show_phone: false, show_directions: false, is_verified: false,
        is_featured: false, featured_until: null, is_premium: false,
        // Retain the saved category; never invent a Home Studio for an artist.
        ...(hasVoiceover ? { is_profile_visible: false } : {}), updated_at: now,
      } });
      await tx.user_metadata.upsert({
        where: { user_id_key: { user_id: userId, key: 'membership_downgraded_at' } },
        create: { id: randomBytes(12).toString('base64url'), user_id: userId,
          key: 'membership_downgraded_at', value: now.toISOString(), updated_at: now },
        update: { value: now.toISOString(), updated_at: now },
      });
      return { email: user.email, displayName: user.display_name,
        visible: !!studio && studio.status === 'ACTIVE' && studio.is_profile_visible && !hasVoiceover,
        voiceoverRemoved: hasVoiceover, expiredAt: expiry };
    });
    if (!result) return { downgraded: false };
    // Recovery and historic catch-up never send bulk expiry mail. Only a recent transition winner can send.
    if (options.sendEmail !== false && now.getTime() - result.expiredAt.getTime() <= 48 * 60 * 60 * 1000) {
      try {
        const sent = await sendTemplatedEmail({
          to: result.email, templateKey: 'downgrade-confirmation',
          variables: { displayName: result.displayName || 'there',
            visibilityMessage: result.visible
              ? 'Your studio remains live and searchable on the Basic plan.'
              : 'Your profile is not currently public. Review its visibility and studio category in your dashboard. Basic does not include Voiceover artist listings.',
            renewUrl: `${getBaseUrl()}/dashboard/settings?section=membership` },
          skipMarketingCheck: true,
        });
        if (!sent.success) console.error('[Downgrade] Confirmation delivery failed');
      } catch { console.error('[Downgrade] Confirmation delivery failed'); }
    }
    return { downgraded: true, voiceoverRemoved: result.voiceoverRemoved };
  } catch (error) {
    console.error('[Downgrade] Transition failed', error);
    return { downgraded: false, error: 'Membership transition failed' };
  }
}
