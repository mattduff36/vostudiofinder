import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { getBaseUrl } from '@/lib/seo/site';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: NextRequest) {
  try {
    const { email, name, username, userId } = await request.json();

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

    // Use real Stripe with one-time payment
    // Server selects price ID (never accept from client for security)
    const priceId = process.env.STRIPE_MEMBERSHIP_PRICE_ID;
    
    if (!priceId) {
      console.error('STRIPE_MEMBERSHIP_PRICE_ID not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    // Create Stripe checkout session for one-time payment (embedded mode)
    const baseUrl = getBaseUrl(request);
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time annual fee
      ui_mode: 'embedded', // Embedded checkout stays on our site
      return_url: `${baseUrl}/auth/membership/success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}`,
      metadata: {
        user_id: userId, // CRITICAL: User always exists now (PENDING status)
        user_email: email,
        user_name: name,
        user_username: username || '',
        purpose: 'membership', // Standardized key for webhook routing
      },
      // CRITICAL: Propagate metadata to payment intent for failed payment tracking
      payment_intent_data: {
        metadata: {
          user_id: userId, // CRITICAL: This enables immediate webhook processing
          user_email: email,
          user_name: name,
          user_username: username || '',
          purpose: 'membership',
        },
      },
      allow_promotion_codes: true,
    });

    console.log(`[SUCCESS] Stripe checkout created: ${session.id} for user ${userId}`);

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
