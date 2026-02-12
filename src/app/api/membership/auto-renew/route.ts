import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';

/**
 * PUT /api/membership/auto-renew
 * Toggle auto-renew for Premium membership.
 * Requires Stripe subscription for full functionality; for one-time payments, just updates the flag.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const autoRenew = body.autoRenew === true;

    const user = await db.users.findUnique({
      where: { id: session.user.id },
      select: {
        membership_tier: true,
        subscriptions: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { stripe_subscription_id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.membership_tier !== 'PREMIUM') {
      return NextResponse.json(
        { error: 'Auto-renew is only available for Premium members' },
        { status: 400 }
      );
    }

    const stripeSubscriptionId = user.subscriptions[0]?.stripe_subscription_id;

    // For Stripe Subscriptions: update cancel_at_period_end
    // For one-time payments: stripe_subscription_id is null, so we only update the DB flag
    if (stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      try {
        await stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: !autoRenew,
        });
      } catch (stripeError) {
        console.error('[Auto-renew] Stripe update failed:', stripeError);
        return NextResponse.json(
          { error: 'Failed to update subscription with Stripe' },
          { status: 500 }
        );
      }
    }

    await db.users.update({
      where: { id: session.user.id },
      data: { auto_renew: autoRenew, updated_at: new Date() },
    });

    return NextResponse.json({
      success: true,
      autoRenew,
    });
  } catch (error) {
    console.error('[Auto-renew] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update auto-renew setting' },
      { status: 500 }
    );
  }
}
