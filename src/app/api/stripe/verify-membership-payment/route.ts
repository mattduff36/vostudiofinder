import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleApiError } from '@/lib/error-logging';
import { db } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: NextRequest) {
  const verifyTimestamp = new Date().toISOString();
  console.log(`[DEBUG ${verifyTimestamp}] ========== PAYMENT VERIFICATION API CALL START ==========`);
  
  try {
    const body = await request.json();
    const { sessionId } = body;
    
    console.log(`[DEBUG ${verifyTimestamp}] Request body:`, { sessionId: sessionId || 'MISSING' });

    if (!sessionId) {
      console.error(`[DEBUG ${verifyTimestamp}] ❌ ERROR: No sessionId provided`);
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify real Stripe session
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error(`[DEBUG ${verifyTimestamp}] ❌ ERROR: Stripe secret key not configured`);
      return NextResponse.json(
        { error: 'Stripe configuration not available' },
        { status: 500 }
      );
    }

    console.log(`[DEBUG ${verifyTimestamp}] ✅ Stripe secret key configured`);

    // Check if payment already recorded in database (idempotency check)
    console.log(`[DEBUG ${verifyTimestamp}] Checking database for existing payment with session_id: ${sessionId}`);
    const existingPayment = await db.payments.findUnique({
      where: { stripe_checkout_session_id: sessionId },
      select: {
        id: true,
        status: true,
        user_id: true,
        stripe_payment_intent_id: true,
        amount: true,
        currency: true,
        metadata: true,
        created_at: true,
        updated_at: true,
      },
    });

    console.log(`[DEBUG ${verifyTimestamp}] Database query result:`, existingPayment ? {
      id: existingPayment.id,
      status: existingPayment.status,
      user_id: existingPayment.user_id,
      payment_intent_id: existingPayment.stripe_payment_intent_id,
      amount: existingPayment.amount,
      currency: existingPayment.currency,
    } : 'NULL (not found)');

    if (existingPayment && existingPayment.status === 'SUCCEEDED') {
      console.log(`[DEBUG ${verifyTimestamp}] ✅ Payment already processed successfully`);
      const metadata = existingPayment.metadata as any || {};
      console.log(`[DEBUG ${verifyTimestamp}] Returning existing payment data:`, {
        paymentId: existingPayment.id,
        status: existingPayment.status,
        metadata: metadata,
      });
      
      // Payment already processed
      return NextResponse.json({
        verified: true,
        already_processed: true,
        paymentId: existingPayment.id,
        customerData: {
          email: metadata.user_email || '',
          name: metadata.user_name || '',
          username: metadata.user_username || '',
        },
      });
    }

    // Retrieve the checkout session from Stripe
    console.log(`[DEBUG ${verifyTimestamp}] Payment not found or not SUCCEEDED, retrieving session from Stripe...`);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log(`[DEBUG ${verifyTimestamp}] Stripe session retrieved:`, {
      id: session.id,
      mode: session.mode,
      payment_status: session.payment_status,
      customer: session.customer || 'NONE',
      customer_email: session.customer_email || 'NONE',
      metadata: session.metadata || {},
    });

    // Verify payment was completed
    if (session.payment_status !== 'paid') {
      console.error(`[DEBUG ${verifyTimestamp}] ❌ ERROR: Payment not completed. Status: ${session.payment_status}`);
      return NextResponse.json(
        { error: 'Payment not completed', payment_status: session.payment_status },
        { status: 400 }
      );
    }

    console.log(`[DEBUG ${verifyTimestamp}] ✅ Payment status is 'paid'`);

    // Verify it's a membership payment (mode should be 'payment', not 'subscription')
    if (session.mode !== 'payment') {
      console.error(`[DEBUG ${verifyTimestamp}] ❌ ERROR: Invalid session mode: ${session.mode}`);
      return NextResponse.json(
        { error: 'Invalid session mode', mode: session.mode },
        { status: 400 }
      );
    }

    console.log(`[DEBUG ${verifyTimestamp}] ✅ Session mode is 'payment'`);

    // Get customer data from metadata
    const customerData = {
      email: session.metadata?.user_email || session.customer_email || '',
      name: session.metadata?.user_name || '',
      username: session.metadata?.user_username || '',
    };

    console.log(`[DEBUG ${verifyTimestamp}] Customer data extracted:`, customerData);

    // If payment exists but status is not SUCCEEDED, update it
    if (existingPayment) {
      console.log(`[DEBUG ${verifyTimestamp}] Updating payment status from ${existingPayment.status} to SUCCEEDED...`);
      await db.payments.update({
        where: { id: existingPayment.id },
        data: {
          status: 'SUCCEEDED',
          updated_at: new Date(),
        },
      });
      console.log(`[DEBUG ${verifyTimestamp}] ✅ Payment status updated to SUCCEEDED`);
    } else {
      console.log(`[DEBUG ${verifyTimestamp}] ⚠️ No existing payment record found - webhook may not have processed yet`);
    }

    const response = {
      verified: true,
      customerData,
      paymentId: existingPayment?.id || null,
      sessionId: session.id,
    };
    
    console.log(`[DEBUG ${verifyTimestamp}] ✅ Verification successful, returning:`, response);
    return NextResponse.json(response);
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[DEBUG ${errorTimestamp}] ❌ ERROR: Payment verification failed:`, error);
    console.error(`[DEBUG ${errorTimestamp}] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    handleApiError(error, 'Payment verification failed');
    
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
