import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleApiError } from '@/lib/sentry';
import { db } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
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

    // Verify real Stripe session
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe configuration not available' },
        { status: 500 }
      );
    }

    // Check if payment already recorded in database (idempotency check)
    const existingPayment = await db.payments.findUnique({
      where: { stripe_checkout_session_id: sessionId },
    });

    if (existingPayment && existingPayment.status === 'SUCCEEDED') {
      // Payment already processed
      return NextResponse.json({
        verified: true,
        already_processed: true,
        paymentId: existingPayment.id,
        customerData: {
          email: (existingPayment.metadata as any)?.user_email || '',
          name: (existingPayment.metadata as any)?.user_name || '',
          username: (existingPayment.metadata as any)?.user_username || '',
        },
      });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify payment was completed
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed', payment_status: session.payment_status },
        { status: 400 }
      );
    }

    // Verify it's a membership payment (mode should be 'payment', not 'subscription')
    if (session.mode !== 'payment') {
      return NextResponse.json(
        { error: 'Invalid session mode', mode: session.mode },
        { status: 400 }
      );
    }

    // Get customer data from metadata
    const customerData = {
      email: session.metadata?.user_email || session.customer_email || '',
      name: session.metadata?.user_name || '',
      username: session.metadata?.user_username || '',
    };

    // If payment exists but status is not SUCCEEDED, update it
    if (existingPayment) {
      await db.payments.update({
        where: { id: existingPayment.id },
        data: {
          status: 'SUCCEEDED',
          updated_at: new Date(),
        },
      });
    }

    return NextResponse.json({
      verified: true,
      customerData,
      paymentId: existingPayment?.id || null,
      sessionId: session.id,
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
