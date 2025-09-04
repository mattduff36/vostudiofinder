import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleApiError } from '@/lib/sentry';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { email, name, priceId } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId || process.env.STRIPE_MEMBERSHIP_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/auth/membership/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/auth/membership?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`,
      metadata: {
        user_email: email,
        user_name: name,
        type: 'studio_membership',
      },
      subscription_data: {
        metadata: {
          user_email: email,
          user_name: name,
          type: 'studio_membership',
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    handleApiError(error, 'Stripe checkout failed');
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
