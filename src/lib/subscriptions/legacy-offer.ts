import { randomBytes } from 'crypto';
import { db } from '@/lib/db';

export const LEGACY_OFFER_KEY = 'legacy_premium_offer_state';
export const LEGACY_CUTOFF = new Date('2026-01-01T00:00:00Z');

/** Historic dates alone do not prove that the advertised first-login offer was used. */
export function initialLegacyOfferState(lastLogin: Date | null, expiry: Date | null, now: Date): string {
  if (!lastLogin) return 'unclaimed';
  return expiry && expiry > now ? 'claimed' : 'review';
}

/** Claim once, under the same user lock used by expiry. Never shorten an existing grant. */
export async function recordLoginAndClaimLegacyOffer(userId: string): Promise<void> {
  const now = new Date();
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.users.findUnique({
      where: { id: userId },
      include: {
        studio_profiles: true,
        subscriptions: { orderBy: { created_at: 'desc' } },
        payments: { where: { status: 'SUCCEEDED' }, take: 1 },
        refunds_refunds_user_idTousers: { take: 1 },
        user_metadata: { where: { key: LEGACY_OFFER_KEY } },
      },
    });
    if (!user) return;
    await tx.users.update({ where: { id: userId }, data: { last_login: now } });
    if (user.role === 'ADMIN' || user.status !== 'ACTIVE' || user.deletion_status !== 'ACTIVE'
      || user.deletion_requested_at || user.deletion_scheduled_for
      || !user.studio_profiles || user.studio_profiles.created_at >= LEGACY_CUTOFF
      || user.payments.length || user.refunds_refunds_user_idTousers.length
      || user.subscriptions.some(s => s.stripe_customer_id || s.stripe_subscription_id || s.paypal_subscription_id)) return;

    const latest = user.subscriptions[0];
    const state = user.user_metadata[0]?.value
      ?? initialLegacyOfferState(user.last_login, latest?.current_period_end ?? null, now);
    const claim = state === 'unclaimed';
    await tx.user_metadata.upsert({
      where: { user_id_key: { user_id: userId, key: LEGACY_OFFER_KEY } },
      create: { id: randomBytes(12).toString('base64url'), user_id: userId, key: LEGACY_OFFER_KEY,
        value: claim ? 'claimed' : state, updated_at: now },
      update: { value: claim ? 'claimed' : state, updated_at: now },
    });
    if (!claim) return;
    const end = new Date(now);
    end.setUTCMonth(end.getUTCMonth() + 6);
    if (latest?.current_period_end && latest.current_period_end > end) end.setTime(latest.current_period_end.getTime());
    await tx.subscriptions.create({ data: {
      id: randomBytes(12).toString('base64url'), user_id: userId, status: 'ACTIVE',
      payment_method: 'STRIPE', current_period_start: now, current_period_end: end, updated_at: now,
    } });
    await tx.users.update({ where: { id: userId }, data: {
      membership_tier: 'PREMIUM', updated_at: now,
      renewal_reminder_30_sent_at: null, renewal_reminder_14_sent_at: null,
      renewal_reminder_7_sent_at: null, renewal_reminder_1_sent_at: null,
    } });
    await tx.user_metadata.create({ data: {
      id: randomBytes(12).toString('base64url'), user_id: userId,
      key: 'legacy_premium_claimed_at', value: now.toISOString(), updated_at: now,
    } });
    await tx.studio_profiles.update({ where: { user_id: userId }, data: { is_premium: true, updated_at: now } });
    // Membership never overrides owner visibility, moderation or deletion choices.
  });
}
