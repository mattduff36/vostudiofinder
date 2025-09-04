import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleApiError } from '@/lib/sentry';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Get customer data
    let customerData = null;
    if (session.customer_email) {
      customerData = {
        email: session.customer_email,
        name: session.metadata?.user_name || session.customer_email.split('@')[0],
      };
    }

    return NextResponse.json({
      verified: true,
      customerData,
      subscriptionId: session.subscription,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    handleApiError(error, 'Payment verification failed');
    
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
