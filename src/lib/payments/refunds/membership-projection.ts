import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { refundLifecycleEnabled } from './contracts';

export interface RecordedSubscriptionInterval {
  status: string;
  current_period_start: Date | null;
  current_period_end: Date | null;
}

/** Only surviving, presently active intervals provide access; future gaps stay gaps. */
export function survivingMembershipEnd(subscriptions: RecordedSubscriptionInterval[], now: Date) {
  const active = subscriptions.filter(s => s.status === 'ACTIVE' && s.current_period_end && s.current_period_end > now
    && (!s.current_period_start || s.current_period_start <= now));
  const ends = active.flatMap(s => s.current_period_end ? [s.current_period_end.getTime()] : []);
  return ends.length ? new Date(Math.max(...ends)) : null;
}

/** Untouched accounts keep the existing membership helper's behaviour. */
export async function refundAdjustedMembershipEnd(userId: string, now: Date, client: Pick<Prisma.TransactionClient, 'refund_operations' | 'subscriptions'> = db): Promise<{ expiresAt: Date | null } | null> {
  if (!refundLifecycleEnabled()) return null;
  const applied = await client.refund_operations.findFirst({ where: {
    user_reference: userId, benefit_action: 'END',
    // A later provider return keeps the access hold until an explicit review.
    OR: [{ benefit_status: 'APPLIED' }, { benefit_status: 'REVIEW', benefit_grant: { status: 'REVOKED' } }],
    benefit_grant: { kind: 'PREMIUM' },
  }, select: { id: true } });
  if (!applied) return null;
  const subscriptions = await client.subscriptions.findMany({ where: { user_id: userId }, select: {
    status: true, current_period_start: true, current_period_end: true,
  } });
  return { expiresAt: survivingMembershipEnd(subscriptions, now) };
}

/** Bounded public reads resolve overlapping access in two queries, never one per card. */
export async function refundAdjustedMembershipEnds(userIds: readonly string[], now: Date,
  client: Pick<Prisma.TransactionClient, 'refund_operations' | 'subscriptions'> = db): Promise<Map<string, Date | null>> {
  const result = new Map<string, Date | null>();
  if (!refundLifecycleEnabled() || !userIds.length) return result;
  const adjusted = await client.refund_operations.findMany({ where: {
    user_reference: { in: [...new Set(userIds)] }, benefit_action: 'END',
    OR: [{ benefit_status: 'APPLIED' }, { benefit_status: 'REVIEW', benefit_grant: { status: 'REVOKED' } }],
    benefit_grant: { kind: 'PREMIUM' },
  }, distinct: ['user_reference'], select: { user_reference: true } });
  if (!adjusted.length) return result;
  const subscriptions = await client.subscriptions.findMany({ where: { user_id: { in: adjusted.map(row => row.user_reference) } }, select: {
    user_id: true, status: true, current_period_start: true, current_period_end: true,
  } });
  const grouped = new Map<string, RecordedSubscriptionInterval[]>();
  for (const subscription of subscriptions) {
    const records = grouped.get(subscription.user_id) ?? [];
    records.push(subscription); grouped.set(subscription.user_id, records);
  }
  for (const row of adjusted) result.set(row.user_reference, survivingMembershipEnd(grouped.get(row.user_reference) ?? [], now));
  return result;
}
