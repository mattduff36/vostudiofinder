import { db } from '@/lib/db';
import { refundLifecycleEnabled, RefundError } from './contracts';
import { processRefundEvent, submitRefundMoney, reconcileRefundBilling } from './service';
import { applyRefundBenefit } from './access-effects';
import { dispatchRefundNotification } from './notifications';

/** Bounded recovery only; provider keys and operation leases own every external effect. */
export async function reconcileRefundQueue(limit = 20) {
  if (!refundLifecycleEnabled()) return { paused: true, events: 0, operations: 0, failed: 0 };
  const budget = Math.min(50, Math.max(1, limit));
  const retryBefore = new Date(Date.now() - 5 * 60_000);
  const events = await db.stripe_webhook_events.findMany({ where: {
    type: { in: ['charge.refunded', 'refund.created', 'refund.updated', 'refund.failed'] }, processed: false,
    OR: [{ last_attempt_at: null }, { last_attempt_at: { lte: retryBefore } }],
  }, orderBy: [{ last_attempt_at: { sort: 'asc', nulls: 'first' } }, { created_at: 'asc' }], take: budget });
  let failed = 0;
  for (const event of events) {
    await db.stripe_webhook_events.update({ where: { id: event.id }, data: { last_attempt_at: new Date(), attempt_count: { increment: 1 } } });
    try {
      await processRefundEvent(event.type, event.payload);
      await db.stripe_webhook_events.update({ where: { id: event.id }, data: { processed: true, processed_at: new Date(), error: null } });
    } catch (error) {
      failed++;
      await db.stripe_webhook_events.update({ where: { id: event.id }, data: { error: error instanceof RefundError ? error.code : 'REFUND_RECONCILIATION_FAILED' } });
    }
  }
  const operations = await db.refund_operations.findMany({ where: {
    OR: [
      { money_status: { in: ['SUBMITTING', 'UNKNOWN', 'PENDING', 'ACTION_REQUIRED'] } },
      { money_status: 'SUCCEEDED', OR: [{ benefit_status: 'PENDING' }, { billing_status: { in: ['PENDING', 'SUBMITTING', 'UNKNOWN'] } },
        ...(process.env.REFUND_NOTIFICATIONS_ENABLED === 'true' ? [{ notification_status: { in: ['PENDING', 'SUBMITTING', 'UNKNOWN', 'RETRY'] } }] : [])] },
    ],
    AND: [{ OR: [{ lease_expires_at: null }, { lease_expires_at: { lte: new Date() } }] }],
  }, orderBy: [{ updated_at: 'asc' }, { id: 'asc' }], take: budget });
  for (const operation of operations) {
    try {
      if (['SUBMITTING', 'UNKNOWN', 'PENDING', 'ACTION_REQUIRED'].includes(operation.money_status)) await submitRefundMoney(operation.id);
      await applyRefundBenefit(operation.id);
      await reconcileRefundBilling(operation.id);
      await dispatchRefundNotification(operation.id);
    } catch { failed++; }
  }
  return { paused: false, events: events.length, operations: operations.length, failed };
}
