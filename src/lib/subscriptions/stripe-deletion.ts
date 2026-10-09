import { db } from '@/lib/db';
import { performDowngrade } from './downgrade';

/** A deleted old Stripe subscription cannot revoke a newer paid entitlement. */
export async function endStripeSubscription(stripeSubscriptionId: string): Promise<void> {
  const subscription = await db.subscriptions.findUnique({
    where: { stripe_subscription_id: stripeSubscriptionId }, select: { user_id: true },
  });
  if (!subscription) return;
  const endedAt = new Date();
  await db.subscriptions.updateMany({ where: { stripe_subscription_id: stripeSubscriptionId },
    data: { status: 'CANCELLED', cancelled_at: endedAt, current_period_end: endedAt, updated_at: endedAt } });
  const result = await performDowngrade(subscription.user_id);
  if (result.error) throw new Error(result.error);
}
