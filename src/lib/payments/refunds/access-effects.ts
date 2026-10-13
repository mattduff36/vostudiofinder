import { db } from '@/lib/db';
import { coveredUntil, maximumGrantEnd } from '@/lib/payments/benefit-grants';
import { metadataRecord } from './identity';
import type { payment_benefit_grants } from '@prisma/client';

/** A conservative read-only preview; the locked effect checks these facts again. */
export async function canEndBenefit(grant: payment_benefit_grants, userId: string, now = new Date()) {
  if (grant.user_reference !== userId || grant.mapping_source !== 'PURCHASE' || grant.status !== 'ACTIVE'
    || metadataRecord(grant.evidence).requires_review === true) return false;
  if (grant.kind === 'FEATURED' && grant.studio_id) {
    const studio = await db.studio_profiles.findUnique({ where: { id: grant.studio_id } });
    const grants = await db.payment_benefit_grants.findMany({ where: { studio_id: grant.studio_id, kind: 'FEATURED', status: 'ACTIVE' } });
    const expected = maximumGrantEnd(grants);
    if (!studio || studio.user_id !== userId || (studio.is_featured && studio.featured_until?.getTime() !== expected?.getTime())) return false;
    const survivors = grants.filter(g => g.id !== grant.id);
    const remaining = coveredUntil(survivors, now);
    return !survivors.some(g => g.ends_at > now && (!remaining || g.ends_at > remaining));
  }
  if (grant.kind === 'PREMIUM' && grant.subscription_id) {
    const subscriptions = await db.subscriptions.findMany({ where: { user_id: userId } });
    const target = subscriptions.find(s => s.id === grant.subscription_id);
    const grants = await db.payment_benefit_grants.findMany({ where: { subscription_id: grant.subscription_id, kind: 'PREMIUM', status: 'ACTIVE' } });
    const expected = maximumGrantEnd(grants);
    if (!target || target.current_period_end?.getTime() !== expected?.getTime()
      || subscriptions.some(s => s.id !== target.id && s.status === 'ACTIVE'
        && (!s.current_period_end || (!!s.current_period_start && s.current_period_start > now && s.current_period_end > now)))) return false;
    const survivors = grants.filter(g => g.id !== grant.id);
    const remaining = coveredUntil(survivors, now);
    return !survivors.some(g => g.ends_at > now && (!remaining || g.ends_at > remaining));
  }
  return false;
}

/** Access effects never publish a profile, cancel billing, send mail or issue money. */
export async function applyRefundBenefit(operationId: string) {
  const initial = await db.refund_operations.findUnique({ where: { id: operationId } });
  if (!initial) return;
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${initial.user_reference} FOR UPDATE`;
    if (initial.payment_id) await tx.$queryRaw`SELECT id FROM payments WHERE id = ${initial.payment_id} FOR UPDATE`;
    const operation = await tx.refund_operations.findUnique({ where: { id: operationId }, include: { benefit_grant: true, payment: true } });
    if (!operation || operation.money_status !== 'SUCCEEDED' || operation.benefit_status !== 'PENDING') return;
    const review = () => tx.refund_operations.update({ where: { id: operationId }, data: { benefit_status: 'REVIEW', access_review_required: true } });
    if (!operation.payment || operation.payment.refunded_amount !== operation.payment.amount) { await review(); return; }
    if (operation.benefit_action === 'KEEP') {
      await tx.refund_operations.update({ where: { id: operationId }, data: { benefit_status: 'APPLIED' } });
      return;
    }
    const grant = operation.benefit_grant;
    if (operation.benefit_action !== 'END' || !grant || grant.payment_id !== operation.payment_id
      || grant.user_reference !== operation.user_reference || grant.mapping_source !== 'PURCHASE' || grant.status !== 'ACTIVE'
      || metadataRecord(grant.evidence).requires_review === true) {
      await review(); return;
    }
    const now = new Date();
    if (grant.kind === 'FEATURED' && grant.studio_id) {
      await tx.$queryRaw`SELECT id FROM studio_profiles WHERE id = ${grant.studio_id} FOR UPDATE`;
      const studio = await tx.studio_profiles.findUnique({ where: { id: grant.studio_id } });
      const grants = await tx.payment_benefit_grants.findMany({ where: { studio_id: grant.studio_id, kind: 'FEATURED', status: 'ACTIVE' } });
      const expected = maximumGrantEnd(grants);
      if (!studio || studio.user_id !== operation.user_reference || (studio.is_featured && studio.featured_until?.getTime() !== expected?.getTime())) {
        await review(); return;
      }
      const remaining = coveredUntil(grants.filter(g => g.id !== grant.id), now);
      if (grants.some(g => g.id !== grant.id && g.ends_at > now && (!remaining || g.ends_at > remaining))) { await review(); return; }
      await tx.payment_benefit_grants.update({ where: { id: grant.id }, data: { status: 'REVOKED', revoked_at: now } });
      // Never turn on an already disabled placement, or touch membership/publication.
      if (studio.is_featured) await tx.studio_profiles.update({ where: { id: studio.id }, data: {
        is_featured: !!remaining, featured_until: remaining, updated_at: now,
      } });
    } else if (grant.kind === 'PREMIUM' && grant.subscription_id) {
      await tx.$queryRaw`SELECT id FROM subscriptions WHERE user_id = ${operation.user_reference} FOR UPDATE`;
      const subscriptions = await tx.subscriptions.findMany({ where: { user_id: operation.user_reference } });
      const target = subscriptions.find(s => s.id === grant.subscription_id);
      const grants = await tx.payment_benefit_grants.findMany({ where: { subscription_id: grant.subscription_id, kind: 'PREMIUM', status: 'ACTIVE' } });
      const expected = maximumGrantEnd(grants);
      const surviving = grants.filter(g => g.id !== grant.id);
      const remaining = coveredUntil(surviving, now);
      // Unknown later extensions and future isolated periods need a reviewed transition.
      if (!target || target.current_period_end?.getTime() !== expected?.getTime()
        || surviving.some(g => g.ends_at > now && (!remaining || g.ends_at > remaining))) { await review(); return; }
      const user = await tx.users.findUnique({ where: { id: operation.user_reference }, include: { studio_profiles: { include: { studio_studio_types: true } } } });
      if (!user || user.deletion_status !== 'ACTIVE' || user.deletion_requested_at || user.deletion_scheduled_for) { await review(); return; }
      const other = subscriptions.filter(s => s.id !== target.id && s.status === 'ACTIVE');
      const hasOtherAccess = other.some(s => !!s.current_period_end && s.current_period_end > now
        && (!s.current_period_start || s.current_period_start <= now));
      // A future separate interval cannot preserve current access. Review before ending
      // the target rather than downgrade now and invent a later reactivation process.
      if (other.some(s => !s.current_period_end || (!!s.current_period_start && s.current_period_start > now && s.current_period_end > now))) { await review(); return; }
      await tx.payment_benefit_grants.update({ where: { id: grant.id }, data: { status: 'REVOKED', revoked_at: now } });
      await tx.subscriptions.update({ where: { id: target.id }, data: {
        current_period_end: remaining ?? now, status: remaining ? target.status : 'SUSPENDED', updated_at: now,
      } });
      if (!remaining && !hasOtherAccess && user.role !== 'ADMIN' && user.status === 'ACTIVE') {
        await tx.users.update({ where: { id: user.id }, data: { membership_tier: 'BASIC', updated_at: now } });
        const studio = user.studio_profiles;
        if (studio) await tx.studio_profiles.update({ where: { id: studio.id }, data: {
          is_premium: false, show_phone: false, show_directions: false, is_verified: false,
          ...(studio.studio_studio_types.some(t => t.studio_type === 'VOICEOVER') ? { is_profile_visible: false } : {}),
          updated_at: now,
        } });
      }
    } else { await review(); return; }
    await tx.refund_operations.update({ where: { id: operationId }, data: { benefit_status: 'APPLIED' } });
  });
}
