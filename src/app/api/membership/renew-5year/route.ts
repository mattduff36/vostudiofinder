import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { getBaseUrl } from '@/lib/seo/site';
import { calculateDaysUntilExpiry } from '@/lib/membership-renewal';
import { authOptions } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

/**
 * POST /api/membership/renew-5year
 * Create Stripe checkout session for 5-year renewal (£80)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch user's current subscription (can be expired)
    const subscription = await db.subscriptions.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    // Validate subscription exists (even if expired)
    if (!subscription) {
      return NextResponse.json(
        { error: 'No membership found. Please contact support.' },
        { status: 400 }
      );
    }

    // Calculate days remaining (may be negative if expired)
    let daysRemaining = 0;
    let currentExpiry: string | null = null;
    
    if (subscription.current_period_end) {
      daysRemaining = calculateDaysUntilExpiry(subscription.current_period_end);
      currentExpiry = subscription.current_period_end.toISOString();
    }

    // Get user details for checkout
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        email: true,
        display_name: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get 5-year price ID from environment
    const priceId = process.env.STRIPE_5YEAR_MEMBERSHIP_PRICE_ID;
    if (!priceId) {
      console.error('STRIPE_5YEAR_MEMBERSHIP_PRICE_ID not configured');
      return NextResponse.json(
        { error: 'Payment system not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const baseUrl = getBaseUrl(request);
    const stripeSession = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      ui_mode: 'embedded',
      return_url: `${baseUrl}/dashboard?tab=settings&section=membership&renewal=success`,
      metadata: {
        user_id: userId,
        user_email: user.email,
        renewal_type: '5year',
        days_remaining: daysRemaining.toString(),
        current_expiry: currentExpiry || 'none',
        purpose: 'membership_renewal',
      },
      payment_intent_data: {
        metadata: {
          user_id: userId,
          user_email: user.email,
          renewal_type: '5year',
          days_remaining: daysRemaining.toString(),
          current_expiry: currentExpiry || 'none',
          purpose: 'membership_renewal',
        },
      },
      allow_promotion_codes: true,
    });

    console.log(`[SUCCESS] 5-year renewal checkout created: ${stripeSession.id} for user ${userId}`);

    return NextResponse.json({ clientSecret: stripeSession.client_secret });
  } catch (error) {
    console.error('5-year renewal checkout error:', error);
    handleApiError(error, '5-year renewal checkout failed');

    return NextResponse.json(
      { error: 'Failed to create renewal checkout' },
      { status: 500 }
    );
  }
}
