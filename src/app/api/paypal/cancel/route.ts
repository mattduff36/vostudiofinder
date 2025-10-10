import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscription_id');

    if (subscriptionId) {
      // Clean up pending subscription if exists
      await db.pending_subscriptions.deleteMany({
        where: { paypalSubscriptionId: subscriptionId },
      });
    }

    return redirect('/billing?cancelled=true');
  } catch (error) {
    console.error('PayPal cancel handler error:', error);
    return redirect('/billing?error=cancel_failed');
  }
}

