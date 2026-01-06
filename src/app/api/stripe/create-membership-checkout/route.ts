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

    // DEVELOPMENT MODE: Bypass Stripe and simulate successful payment
    if (process.env.NODE_ENV === 'development' || !process.env.STRIPE_SECRET_KEY) {
      console.log('🔧 DEV MODE: Simulating Stripe checkout for:', { email, name, username });
      
      // Create a mock session ID for development
      const mockSessionId = `cs_dev_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Return mock success URL with test session ID
      const mockSuccessUrl = `${process.env.NEXTAUTH_URL}/auth/membership/success?session_id=${mockSessionId}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&username=${encodeURIComponent(username || '')}`;
      
      return NextResponse.json({ 
        sessionId: mockSessionId, 
        url: mockSuccessUrl,
        dev_mode: true 
      });
    }

    // PRODUCTION MODE: Use real Stripe with one-time payment
    // Server selects price ID (never accept from client for security)
    const priceId = process.env.STRIPE_MEMBERSHIP_PRICE_ID;
    
    if (!priceId) {
      console.error('STRIPE_MEMBERSHIP_PRICE_ID not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    // Create Stripe checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment', // Changed from 'subscription' to 'payment' for one-time annual fee
      success_url: `${process.env.NEXTAUTH_URL}/auth/membership/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/auth/membership?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&username=${encodeURIComponent(username || '')}`,
      metadata: {
        user_email: email,
        user_name: name,
        user_username: username || '',
        purpose: 'membership', // Standardized key for webhook routing
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    handleApiError(error, 'Stripe checkout failed');
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
