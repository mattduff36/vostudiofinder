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
 * POST /api/membership/upgrade
 * Creates a Stripe checkout session for an existing Basic user to upgrade to Premium.
 * Requires authentication (session-based).
 */
export async function POST(request: NextRequest) {
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
        id: true,
        email: true,
        display_name: true,
        username: true,
        email_verified: true,
        membership_tier: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.email_verified) {
      return NextResponse.json(
        { error: 'Email must be verified before upgrading' },
        { status: 403 }
      );
    }

    if (user.membership_tier === 'PREMIUM') {
      return NextResponse.json(
        { error: 'You are already a Premium member. Use renewal options instead.' },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(request);
    const useSubscription = autoRenew;
    const subscriptionPriceId = process.env.STRIPE_PREMIUM_SUBSCRIPTION_PRICE_ID;
    const oneTimePriceId = process.env.STRIPE_MEMBERSHIP_PRICE_ID;

    if (useSubscription && !subscriptionPriceId) {
      console.error('STRIPE_PREMIUM_SUBSCRIPTION_PRICE_ID not configured');
      return NextResponse.json(
        { error: 'Subscription payment not configured' },
        { status: 500 }
      );
    }
    if (!useSubscription && !oneTimePriceId) {
      console.error('STRIPE_MEMBERSHIP_PRICE_ID not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const priceId = useSubscription ? subscriptionPriceId : oneTimePriceId;
    const metadata = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.display_name,
      user_username: user.username || '',
      purpose: 'membership_upgrade' as const,
      auto_renew: useSubscription ? 'true' : 'false',
    };

    const checkoutSession = useSubscription
      ? await stripe.checkout.sessions.create({
          customer_email: user.email,
          payment_method_types: ['card', 'link'],
          line_items: [{ price: priceId!, quantity: 1 }],
          mode: 'subscription',
          ui_mode: 'custom',
          return_url: `${baseUrl}/dashboard/settings?section=membership&upgrade=success`,
          metadata,
          subscription_data: {
            metadata,
          },
          allow_promotion_codes: true,
        })
      : await stripe.checkout.sessions.create({
          customer_email: user.email,
          payment_method_types: ['card', 'link'],
          line_items: [{ price: priceId!, quantity: 1 }],
          mode: 'payment',
          ui_mode: 'custom',
          return_url: `${baseUrl}/dashboard/settings?section=membership&upgrade=success`,
          metadata,
          payment_intent_data: { metadata },
          allow_promotion_codes: true,
        });

    console.log(`[Upgrade] Checkout created: ${checkoutSession.id} for user ${user.id} (${useSubscription ? 'subscription' : 'one-time'})`);

    return NextResponse.json({ clientSecret: checkoutSession.client_secret });
  } catch (error) {
    console.error('[Upgrade] Error:', error);
    handleApiError(error, 'Upgrade checkout failed');
    return NextResponse.json(
      { error: 'Failed to create upgrade checkout' },
      { status: 500 }
    );
  }
}
