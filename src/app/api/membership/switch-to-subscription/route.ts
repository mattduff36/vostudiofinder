import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/error-logging';
import { getBaseUrl } from '@/lib/seo/site';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

/**
 * POST /api/membership/switch-to-subscription
 * Creates a Stripe subscription checkout for a Premium pay-once user who wants to enable auto-renewal.
 * Sets trial_end to the user's current membership expiry so they aren't charged until then.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        display_name: true,
        username: true,
        membership_tier: true,
        auto_renew: true,
        subscriptions: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            stripe_subscription_id: true,
            current_period_end: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.membership_tier !== 'PREMIUM') {
      return NextResponse.json(
        { error: 'Only Premium members can switch to auto-renewal' },
        { status: 400 }
      );
    }

    // If user already has a Stripe subscription, they should use the toggle endpoint instead
    const existingSubId = user.subscriptions[0]?.stripe_subscription_id;
    if (existingSubId) {
      return NextResponse.json(
        { error: 'You already have an active subscription. Use the auto-renewal toggle instead.' },
        { status: 400 }
      );
    }

    const subscriptionPriceId = process.env.STRIPE_PREMIUM_SUBSCRIPTION_PRICE_ID;
    if (!subscriptionPriceId) {
      console.error('STRIPE_PREMIUM_SUBSCRIPTION_PRICE_ID not configured');
      return NextResponse.json(
        { error: 'Subscription payment not configured' },
        { status: 500 }
      );
    }

    // Calculate trial_end from current membership expiry
    const currentPeriodEnd = user.subscriptions[0]?.current_period_end;
    if (!currentPeriodEnd) {
      return NextResponse.json(
        { error: 'Could not determine your current membership expiry date' },
        { status: 400 }
      );
    }

    // Stripe requires trial_end to be at least 48 hours in the future
    const now = new Date();
    const minTrialEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const trialEndDate = currentPeriodEnd > minTrialEnd ? currentPeriodEnd : minTrialEnd;
    const trialEndTimestamp = Math.floor(trialEndDate.getTime() / 1000);

    const baseUrl = getBaseUrl(request);
    const metadata = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.display_name,
      user_username: user.username || '',
      purpose: 'switch_to_subscription' as const,
      auto_renew: 'true',
    };

    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card', 'link'],
      line_items: [{ price: subscriptionPriceId, quantity: 1 }],
      mode: 'subscription',
      ui_mode: 'custom',
      return_url: `${baseUrl}/dashboard/settings?section=membership&switch=success`,
      metadata,
      subscription_data: {
        metadata,
        trial_end: trialEndTimestamp,
      },
      allow_promotion_codes: true,
    });

    console.log(
      `[SwitchToSubscription] Checkout created: ${checkoutSession.id} for user ${user.id}, trial_end: ${trialEndDate.toISOString()}`
    );

    return NextResponse.json({ clientSecret: checkoutSession.client_secret });
  } catch (error) {
    console.error('[SwitchToSubscription] Error:', error);
    handleApiError(error, 'Switch to subscription checkout failed');
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
