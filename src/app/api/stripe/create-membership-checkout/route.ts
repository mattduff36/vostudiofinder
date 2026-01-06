import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleApiError } from '@/lib/sentry';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: NextRequest) {
  try {
    const { email, name, username } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

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
      return_url: `${process.env.NEXTAUTH_URL}/auth/membership/success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        user_email: email,
        user_name: name,
        user_username: username || '',
        purpose: 'membership', // Standardized key for webhook routing
      },
      // CRITICAL: Propagate metadata to payment intent for failed payment tracking
      payment_intent_data: {
        metadata: {
          user_email: email,
          user_name: name,
          user_username: username || '',
          purpose: 'membership',
        },
      },
      allow_promotion_codes: true,
    });

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
