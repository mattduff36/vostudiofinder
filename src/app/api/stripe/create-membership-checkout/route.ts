import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/error-logging';
import { getBaseUrl } from '@/lib/seo/site';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: NextRequest) {
  try {
    const { email, name, username, userId, autoRenew } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // CRITICAL: Verify email before creating checkout session
    console.log(`🔐 Verifying email for user: ${userId} (${email})`);
    
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        email_verified: true,
      },
    });

    if (!user) {
      console.error(`[ERROR] User not found: ${userId}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.email_verified) {
      console.error(`[ERROR] Email not verified for user: ${userId} (${email})`);

      return NextResponse.json(
        { error: 'Email must be verified before payment', verified: false },
        { status: 403 }
      );
    }

    console.log(`[SUCCESS] Email verified for user: ${userId} (${email})`);
    console.log(`💳 Creating Stripe checkout for user: ${userId} (${email})`);

    // Server selects price ID (never accept from client for security)
    const baseUrl = getBaseUrl(request);
    const useSubscription = autoRenew === true;
    const subscriptionPriceId = process.env.STRIPE_PREMIUM_SUBSCRIPTION_PRICE_ID;
    const oneTimePriceId = process.env.STRIPE_MEMBERSHIP_PRICE_ID;

    if (useSubscription) {
      if (!subscriptionPriceId) {
        console.error('STRIPE_PREMIUM_SUBSCRIPTION_PRICE_ID not configured for auto-renew');
        return NextResponse.json(
          { error: 'Subscription payment not configured' },
          { status: 500 }
        );
      }
    } else {
      if (!oneTimePriceId) {
        console.error('STRIPE_MEMBERSHIP_PRICE_ID not configured');
        return NextResponse.json(
          { error: 'Payment system not configured' },
          { status: 500 }
        );
      }
    }

    const priceId = useSubscription ? subscriptionPriceId : oneTimePriceId;
    const metadata = {
      user_id: userId,
      user_email: email,
      user_name: name,
      user_username: username || '',
      purpose: 'membership' as const,
      // Preserve user's auto-renew preference for webhook (Stripe metadata values must be strings)
      auto_renew: useSubscription ? 'true' : 'false',
    };

    // Create Stripe checkout: subscription (auto-renew) or one-time payment
    const session = useSubscription
      ? await stripe.checkout.sessions.create({
          customer_email: email,
          payment_method_types: ['card', 'link'],
          line_items: [{ price: priceId!, quantity: 1 }],
          mode: 'subscription',
          ui_mode: 'custom',
          return_url: `${baseUrl}/auth/membership/success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}`,
          metadata,
          subscription_data: {
            metadata,
          },
          allow_promotion_codes: true,
        })
      : await stripe.checkout.sessions.create({
          customer_email: email,
          payment_method_types: ['card', 'link'],
          line_items: [{ price: priceId!, quantity: 1 }],
          mode: 'payment',
          ui_mode: 'custom',
          return_url: `${baseUrl}/auth/membership/success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}`,
          metadata,
          payment_intent_data: { metadata },
          allow_promotion_codes: true,
        });

    // Note: For subscription mode, cancel_at_period_end is set in the webhook
    // when subscription is created (default OFF per client spec).

    console.log(`[SUCCESS] Stripe checkout created: ${session.id} for user ${userId} (${useSubscription ? 'subscription' : 'one-time'})`);

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    handleApiError(error, 'Stripe checkout failed');
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
