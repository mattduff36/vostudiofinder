import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { randomBytes } from 'crypto';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/payments/[id]/refund
 * Issue a full or partial refund for a payment
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    // Check admin authorization
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: paymentId } = await params;
    const body = await request.json();
    const { amount, reason } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid refund amount is required' },
        { status: 400 }
      );
    }

    // Get payment
    const payment = await db.payments.findUnique({
      where: { id: paymentId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (!payment.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: 'Cannot refund: No payment intent ID' },
        { status: 400 }
      );
    }

    // Check if amount exceeds available refundable amount
    const maxRefundable = payment.amount - payment.refunded_amount;
    if (amount > maxRefundable) {
      return NextResponse.json(
        {
          error: `Refund amount exceeds available balance (${maxRefundable / 100} ${payment.currency.toUpperCase()})`,
        },
        { status: 400 }
      );
    }

    // Issue refund via Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount,
      reason: reason || 'requested_by_customer',
      metadata: {
        admin_id: session.user.id,
        admin_email: session.user.email,
        payment_id: paymentId,
      },
    });

    // Update payment record
    const newRefundedAmount = payment.refunded_amount + amount;
    const isFullRefund = newRefundedAmount >= payment.amount;

    await db.payments.update({
      where: { id: paymentId },
      data: {
        refunded_amount: newRefundedAmount,
        status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        updated_at: new Date(),
      },
    });

    // Record refund in database
    const refundRecord = await db.refunds.create({
      data: {
        id: randomBytes(12).toString('base64url'),
        stripe_refund_id: refund.id,
        stripe_payment_intent_id: payment.stripe_payment_intent_id,
        amount,
        currency: payment.currency,
        reason: reason || null,
        status: refund.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING',
        processed_by: session.user.id,
        user_id: payment.user_id === 'PENDING' ? null : payment.user_id,
        payment_id: paymentId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // If full refund, end membership
    if (isFullRefund && payment.user_id !== 'PENDING') {
      console.log(`🚫 Full refund issued, ending membership for user ${payment.user_id}`);

      // Find active subscription
      const activeSubscription = await db.subscriptions.findFirst({
        where: {
          user_id: payment.user_id,
          status: 'ACTIVE',
        },
        orderBy: { created_at: 'desc' },
      });

      if (activeSubscription) {
        await db.subscriptions.update({
          where: { id: activeSubscription.id },
          data: {
            status: 'CANCELLED',
            cancelled_at: new Date(),
            current_period_end: new Date(), // End immediately
            updated_at: new Date(),
          },
        });

        // Set studio to INACTIVE
        await db.studio_profiles.updateMany({
          where: { user_id: payment.user_id },
          data: {
            status: 'INACTIVE',
            updated_at: new Date(),
          },
        });

        console.log(`✅ Membership ended for user ${payment.user_id}`);
      }
    }

    // Log the admin action
    console.log(
      `✅ Refund issued by ${session.user.email}: ${amount / 100} ${payment.currency.toUpperCase()} ` +
      `for payment ${paymentId} (${isFullRefund ? 'FULL' : 'PARTIAL'} refund)`
    );

    return NextResponse.json({
      success: true,
      refund: {
        id: refundRecord.id,
        stripe_refund_id: refund.id,
        amount,
        currency: payment.currency,
        status: refund.status,
        is_full_refund: isFullRefund,
      },
      payment: {
        id: payment.id,
        status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        refunded_amount: newRefundedAmount,
      },
    });
  } catch (error: any) {
    console.error('Error issuing refund:', error);

    // Handle Stripe-specific errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: error.message || 'Invalid refund request' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to issue refund' },
      { status: 500 }
    );
  }
}

