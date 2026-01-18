import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { getBaseUrl } from '@/lib/seo/site';
import {
  calculateDaysUntilExpiry,
  isEligibleForEarlyRenewal,
  isEligibleForStandardRenewal,
} from '@/lib/membership-renewal';
import { authOptions } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

/**
 * POST /api/membership/renew-early
 * Create Stripe checkout session for annual renewal (£25)
 * - Early renewal (6+ months): £25 + 30 day bonus
 * - Standard renewal (<6 months): £25, no bonus
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

    // Fetch user's current subscription
    const subscription = await db.subscriptions.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active membership found. Please contact support.' },
        { status: 400 }
      );
    }

    // Check if subscription has an expiry date
    if (!subscription.current_period_end) {
      return NextResponse.json(
        { error: 'Invalid membership status. Please contact support.' },
        { status: 400 }
      );
    }

    // Calculate days remaining
    const daysRemaining = calculateDaysUntilExpiry(subscription.current_period_end);

    // Determine renewal type based on days remaining
    let renewalType: 'early' | 'standard';
    if (isEligibleForEarlyRenewal(daysRemaining)) {
      renewalType = 'early'; // 6+ months remaining, gets bonus
    } else if (isEligibleForStandardRenewal(daysRemaining)) {
      renewalType = 'standard'; // <6 months remaining, no bonus
    } else {
      return NextResponse.json(
        {
          error: 'Membership expired or invalid. Please use 5-year renewal option.',
          daysRemaining,
        },
        { status: 400 }
      );
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

    // Get price ID from environment
    const priceId = process.env.STRIPE_MEMBERSHIP_PRICE_ID;
    if (!priceId) {
      console.error('STRIPE_MEMBERSHIP_PRICE_ID not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
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
        renewal_type: renewalType, // 'early' or 'standard'
        days_remaining: daysRemaining.toString(),
        current_expiry: subscription.current_period_end.toISOString(),
        purpose: 'membership_renewal',
      },
      payment_intent_data: {
        metadata: {
          user_id: userId,
          user_email: user.email,
          renewal_type: renewalType, // 'early' or 'standard'
          days_remaining: daysRemaining.toString(),
          current_expiry: subscription.current_period_end.toISOString(),
          purpose: 'membership_renewal',
        },
      },
      allow_promotion_codes: true,
    });

    console.log(`[SUCCESS] ${renewalType === 'early' ? 'Early' : 'Standard'} renewal checkout created: ${stripeSession.id} for user ${userId}`);

    return NextResponse.json({ clientSecret: stripeSession.client_secret });
  } catch (error) {
    console.error('Early renewal checkout error:', error);
    handleApiError(error, 'Early renewal checkout failed');

    return NextResponse.json(
      { error: 'Failed to create renewal checkout' },
      { status: 500 }
    );
  }
}
