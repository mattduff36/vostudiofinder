import { NextRequest } from 'next/server';
import { paypal } from '@/lib/paypal';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscription_id');

    if (!subscriptionId) {
      return redirect('/billing?error=missing_subscription_id');
    }

    // Get subscription details from PayPal
    const subscription = await paypal.getSubscription(subscriptionId);

    if (subscription.status !== 'ACTIVE') {
      return redirect('/billing?error=subscription_not_active');
    }

    // Find pending subscription in database
    const pendingSubscription = await db.pending_subscriptions.findUnique({
      where: { paypal_subscription_id: subscriptionId },
    });

    if (!pendingSubscription) {
      return redirect('/billing?error=subscription_not_found');
    }

    // Create active subscription and update studio
    await db.$transaction(async (tx) => {
      // Create subscription record
      await tx.subscriptions.create({
        data: {
          user_id: pendingSubscription.userId,
          paypal_subscription_id: subscriptionId,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          paymentMethod: 'PAYPAL',
        },
      });

      // Update studio to premium
      await tx.studio.update({
        where: { id: pendingSubscription.studioId },
        data: { is_premium: true },
      });

      // Remove pending subscription
      await tx.pendingSubscription.delete({
        where: { id: pendingSubscription.id },
      });
    });

    return redirect('/billing?success=subscription_activated');
  } catch (error) {
    console.error('PayPal success handler error:', error);
    return redirect('/billing?error=processing_failed');
  }
}


