import type { Prisma } from '@prisma/client';
import type { Studio, AdminStudioDetails } from '@/components/admin/studios/types';

export const adminNoteKey = (userId: string) => `studio-owner:${userId}`;
export function parseAdminNote(record: { content: string; updated_at: Date } | undefined): AdminStudioDetails['note'] {
  if (!record) return { text: '', updatedAt: null, version: null };
  try {
    const note: unknown = JSON.parse(record.content || '{}');
    if (note && typeof note === 'object' && 'text' in note && typeof note.text === 'string') {
      return { text: note.text.slice(0, 500), updatedAt: record.updated_at.toISOString(), version: record.updated_at.toISOString() };
    }
  } catch { /* Keep the stored version so an admin can deliberately replace invalid content. */ }
  return { text: 'Stored note could not be read.', updatedAt: record.updated_at.toISOString(), version: record.updated_at.toISOString() };
}

interface BillingRecord {
  auto_renew: boolean;
  subscriptions: Array<{ status: string; stripe_subscription_id: string | null; paypal_subscription_id: string | null }>;
  payments: Array<{ status: string }>;
}
const statusLabel = (status: string) => status.toLowerCase().replaceAll('_', ' ');
export function billingSummary(user: BillingRecord) {
  const current = user.subscriptions.filter(sub => sub.status !== 'CANCELLED');
  const sub = current[0] ?? user.subscriptions[0];
  let billing = 'No subscription recorded';
  let renewal = 'Not applicable';
  if (current.length > 1 || (sub?.stripe_subscription_id && sub.paypal_subscription_id)) {
    billing = 'Conflicting subscription records — review'; renewal = 'Needs review';
  } else if (sub) {
    const provider = sub.stripe_subscription_id ? 'Stripe subscription' : sub.paypal_subscription_id ? 'PayPal subscription' : 'Local/manual record';
    billing = `${provider} · ${statusLabel(sub.status)}`;
    renewal = sub.stripe_subscription_id || sub.paypal_subscription_id
      ? `${user.auto_renew ? 'On' : 'Off'} (recorded setting)` : 'No linked recurring billing';
    if (sub.status === 'CANCELLED' && user.auto_renew) renewal = 'Conflicting renewal setting — review';
  } else if (user.payments[0]?.status === 'SUCCEEDED') billing = 'Payment recorded · no subscription link';
  return { billing, renewal, latestPayment: user.payments[0] ? statusLabel(user.payments[0].status) : null };
}

export const outstandingRefundWhere: Prisma.refund_operationsWhereInput = { OR: [
  { money_status: { in: ['PREPARED', 'SUBMITTING', 'PENDING', 'UNKNOWN', 'ACTION_REQUIRED', 'REVIEW'] } },
  { benefit_status: { in: ['PENDING', 'REVIEW'] } },
  { billing_status: { in: ['PENDING', 'SUBMITTING', 'UNKNOWN', 'REVIEW'] } },
  { notification_status: { in: ['PENDING', 'SUBMITTING', 'UNKNOWN', 'RETRY', 'REVIEW', 'REJECTED'] } },
  { access_review_required: true },
] };

/** Batch only the final page within the list's existing read snapshot. No provider calls or writes. */
export async function addAdminStudioDetails(tx: Prisma.TransactionClient, studios: Studio[]): Promise<Studio[]> {
  const ids = [...new Set(studios.map(studio => studio.users.id))];
  if (!ids.length) return studios;
  const [users, support, refunds, notes] = await Promise.all([
    tx.users.findMany({ where: { id: { in: ids } }, select: {
      id: true, created_at: true, auto_renew: true,
      subscriptions: { orderBy: [{ created_at: 'desc' }, { id: 'asc' }], select: { status: true, stripe_subscription_id: true, paypal_subscription_id: true } },
      payments: { orderBy: [{ created_at: 'desc' }, { id: 'asc' }], take: 1, select: { status: true } },
    } }),
    tx.support_tickets.groupBy({ by: ['user_id'], where: { user_id: { in: ids }, type: 'ISSUE', status: { in: ['OPEN', 'IN_PROGRESS'] } }, _count: { _all: true } }),
    tx.refund_operations.groupBy({ by: ['user_reference'], where: { user_reference: { in: ids }, ...outstandingRefundWhere }, _count: { _all: true } }),
    tx.admin_sticky_notes.findMany({ where: { key: { in: ids.map(adminNoteKey) } }, select: { key: true, content: true, updated_at: true } }),
  ]);
  const byUser = new Map(users.map(user => [user.id, user]));
  const supportCounts = new Map(support.map(row => [row.user_id, row._count._all]));
  const refundCounts = new Map(refunds.map(row => [row.user_reference, row._count._all]));
  const byNote = new Map(notes.map(row => [row.key, row]));
  return studios.map(studio => {
    const user = byUser.get(studio.users.id);
    if (!user) return studio;
    return { ...studio, admin_details: {
      accountCreatedAt: user.created_at.toISOString(), ...billingSummary(user),
      openSupport: supportCounts.get(user.id) ?? 0, openRefunds: refundCounts.get(user.id) ?? 0,
      note: parseAdminNote(byNote.get(adminNoteKey(user.id))),
    } };
  });
}
