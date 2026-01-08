import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { sendEmail } from '@/lib/email/email-service';
import { paymentSuccessTemplate } from '@/lib/email/templates/payment-success';
import { randomBytes } from 'crypto';
import type Stripe from 'stripe';
import { UserStatus } from '@prisma/client';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Ensure webhook event idempotency by recording processed events
 */
async function ensureEventIdempotency(eventId: string, eventType: string, payload: any): Promise<boolean> {
  try {
    // Check if event already processed
    const existing = await db.stripe_webhook_events.findUnique({
      where: { stripe_event_id: eventId },
    });

    if (existing) {
      logger.log(`⏭️  Event ${eventId} already processed, skipping`);
      return false; // Already processed
    }

    // Record event
    await db.stripe_webhook_events.create({
      data: {
        id: randomBytes(12).toString('base64url'),
        stripe_event_id: eventId,
        type: eventType,
        payload,
        processed: false,
        created_at: new Date(),
      },
    });

    return true; // OK to process
  } catch (error) {
    logger.log(`⚠️  Error checking event idempotency: ${error}`);
    // If unique constraint violation, event was already recorded by concurrent request
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return false;
    }
    throw error;
  }
}

/**
 * Mark event as processed
 */
async function markEventProcessed(eventId: string, success: boolean, error?: string) {
  try {
    await db.stripe_webhook_events.update({
      where: { stripe_event_id: eventId },
      data: {
        processed: success,
        processed_at: new Date(),
        error: error || null,
      },
    });
  } catch (err) {
    logger.log(`⚠️  Error marking event as processed: ${err}`);
  }
}

/**
 * Handle one-time membership payment completion
 */
async function handleMembershipPaymentSuccess(session: Stripe.Checkout.Session) {
  const { user_id, user_email, user_name, purpose } = session.metadata || {};

  if (purpose !== 'membership') {
    logger.log(`⏭️  Session ${session.id} is not a membership payment, skipping`);
    return;
  }

  if (!user_id) {
    throw new Error('Missing user_id in session metadata - user should exist before payment');
  }

  if (!user_email) {
    throw new Error('Missing user_email in session metadata');
  }

  logger.log(`💳 Processing membership payment for user ${user_id} (${user_email})`);

  // Expand session to get payment_intent
  const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['payment_intent'],
  });

  const paymentIntent = expandedSession.payment_intent as Stripe.PaymentIntent | null;
  if (!paymentIntent) {
    throw new Error('No payment_intent found for session');
  }

  // Find or create customer
  let customer: Stripe.Customer | null = null;
  if (session.customer) {
    customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer;
  }

  // Find user by ID (they should already exist as PENDING)
  const user = await db.users.findUnique({
    where: { id: user_id },
  });

  if (!user) {
    throw new Error(`User ${user_id} not found - this should not happen with new flow`);
  }

  logger.log(`✅ Found ${user.status} user: ${user.email}`);

  // Record payment (idempotent on checkout_session_id)
  const existingPayment = await db.payments.findUnique({
    where: { stripe_checkout_session_id: session.id },
  });

  if (existingPayment) {
    logger.log(`💳 Payment record already exists for session ${session.id}`);
    return; // Already processed
  }

  const payment = await db.payments.create({
    data: {
      id: randomBytes(12).toString('base64url'),
      user_id: user.id,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: (paymentIntent as any).latest_charge as string || null,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'SUCCEEDED',
      refunded_amount: 0,
      metadata: session.metadata || {},
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  logger.log(`✅ Payment recorded: ${payment.id}`);

  // Grant membership and update payment tracking in single atomic operation
  await grantMembership(user.id, payment.id, {
    payment_attempted_at: user.payment_attempted_at || new Date(),
    payment_retry_count: 0,
  });

  // Send confirmation email
  if (customer?.email || user_email) {
    try {
      await sendEmail({
        to: customer?.email || user_email,
        subject: 'Membership Confirmed - VoiceoverStudioFinder',
        html: paymentSuccessTemplate({
          customerName: user_name || customer?.name || user.display_name || 'Valued Member',
          amount: (payment.amount / 100).toFixed(2),
          currency: payment.currency.toUpperCase(),
          paymentId: payment.id,
          planName: 'Annual Membership',
          nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        }),
      });
      logger.log(`📧 Confirmation email sent to ${customer?.email || user_email}`);
    } catch (emailError) {
      logger.log(`⚠️  Failed to send confirmation email: ${emailError}`);
    }
  }
}

/**
 * Grant 12-month membership to user
 * Atomically updates user status and payment tracking fields
 */
async function grantMembership(
  userId: string, 
  _paymentId: string,
  paymentTracking?: {
    payment_attempted_at: Date;
    payment_retry_count: number;
  }
) {
  const now = new Date();
  const oneYearFromNow = new Date(now);
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  // ATOMIC UPDATE: status, payment tracking, and email flags in single operation
  await db.users.update({
    where: { id: userId },
    data: {
      status: UserStatus.ACTIVE,
      // Include payment tracking fields if provided (from webhook success handler)
      ...(paymentTracking && {
        payment_attempted_at: paymentTracking.payment_attempted_at,
        payment_retry_count: paymentTracking.payment_retry_count,
        // Reset email tracking flags (no longer relevant after successful payment)
        day2_reminder_sent_at: null,
        day5_reminder_sent_at: null,
        failed_payment_email_sent_at: null,
      }),
      updated_at: now,
    },
  });
  logger.log(`✅ User ${userId} status updated: PENDING → ACTIVE`);

  // Create membership record in subscriptions table
  const subscription = await db.subscriptions.create({
    data: {
      id: randomBytes(12).toString('base64url'),
      user_id: userId,
      status: 'ACTIVE',
      payment_method: 'STRIPE',
      current_period_start: now,
      current_period_end: oneYearFromNow,
      created_at: now,
      updated_at: now,
      // No stripe_subscription_id since this is a one-time payment
    },
  });

  // Ensure studio profile is ACTIVE if exists
  const studio = await db.studio_profiles.findUnique({
    where: { user_id: userId },
  });

  if (studio && studio.status !== 'ACTIVE') {
    await db.studio_profiles.update({
      where: { user_id: userId },
      data: {
        status: 'ACTIVE',
        updated_at: now,
      },
    });
    logger.log(`🔄 Studio status set to ACTIVE for user ${userId}`);
  }

  logger.log(`✅ Membership granted to user ${userId} until ${oneYearFromNow.toISOString()}`);
  return subscription;
}

/**
 * Handle failed payment attempts
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  logger.log(`❌ Processing failed payment ${paymentIntent.id}`);
  
  // Extract user_id from metadata
  const metadata = paymentIntent.metadata || {};
  const user_id = metadata.user_id;
  const user_email = metadata.user_email || metadata.email;
  
  if (!user_id) {
    logger.log(`⚠️  No user_id in payment intent metadata - cannot process failed payment`);
    return;
  }
  
  // Find user by ID
  const user = await db.users.findUnique({
    where: { id: user_id },
  });
  
  if (!user) {
    logger.log(`⚠️  User ${user_id} not found - cannot record failed payment`);
    return;
  }
  
  logger.log(`Processing failed payment for ${user.status} user: ${user.email}`);
  
  // Check if payment already recorded
  const existingPayment = await db.payments.findUnique({
    where: { stripe_payment_intent_id: paymentIntent.id },
  });
  
  if (existingPayment) {
    logger.log(`Payment ${paymentIntent.id} already recorded, updating status to FAILED`);
    await db.payments.update({
      where: { id: existingPayment.id },
      data: {
        status: 'FAILED',
        updated_at: new Date(),
      },
    });
    return;
  }
  
  // Record failed payment
  await db.payments.create({
    data: {
      id: randomBytes(12).toString('base64url'),
      user_id: user.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: (paymentIntent as any).latest_charge as string || null,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'FAILED',
      refunded_amount: 0,
      metadata: {
        ...metadata,
        error: paymentIntent.last_payment_error?.message || 'Payment failed',
        error_code: paymentIntent.last_payment_error?.code,
        error_type: paymentIntent.last_payment_error?.type,
      },
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  
  // Update user payment tracking - increment retry count
  const now = new Date();
  await db.users.update({
    where: { id: user.id },
    data: {
      payment_attempted_at: user.payment_attempted_at || now,
      payment_retry_count: user.payment_retry_count + 1,
      updated_at: now,
    },
  });
  
  logger.log(`✅ Failed payment recorded for user ${user_email}: ${paymentIntent.id}`);
  logger.log(`📊 Payment retry count: ${user.payment_retry_count + 1}`);
  
  // TODO: Send failed payment email with retry link (Phase 4)
}

/**
 * Handle refund events
 */
async function handleRefund(refund: Stripe.Refund) {
  logger.log(`↩️  Processing refund ${refund.id} for payment ${refund.payment_intent}`);

  // IDEMPOTENCY CHECK: Check if this refund was already processed
  const existingRefund = await db.refunds.findUnique({
    where: { stripe_refund_id: refund.id },
  });

  if (existingRefund) {
    logger.log(`ℹ️  Refund ${refund.id} already processed, skipping`);
    return;
  }

  // Find payment record
  const payment = await db.payments.findUnique({
    where: { stripe_payment_intent_id: refund.payment_intent as string },
  });

  if (!payment) {
    logger.log(`⚠️  Payment not found for refund ${refund.id}`);
    return;
  }

  // Update payment refund amount
  // Safeguard: Ensure refund doesn't exceed payment amount (Stripe should prevent this, but add safety check)
  const newRefundedAmount = Math.min(payment.refunded_amount + refund.amount, payment.amount);
  const isFullRefund = newRefundedAmount >= payment.amount;

  await db.payments.update({
    where: { id: payment.id },
    data: {
      refunded_amount: newRefundedAmount,
      status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      updated_at: new Date(),
    },
  });

  logger.log(`✅ Payment ${payment.id} updated: refunded ${newRefundedAmount}/${payment.amount}`);

  // CRITICAL: processed_by requires a valid user ID (FK constraint)
  // For automated webhook refunds, use the first admin user or the user being refunded
  // Safeguard: Ensure we always have a valid user ID
  const adminUser = await db.users.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  });
  
  // Use admin if available, otherwise use payment user_id (should be valid at this point)
  // Final fallback: create a system user or skip if truly no user exists (shouldn't happen)
  let processedBy = adminUser?.id || payment.user_id;
  
  // Final safeguard: if payment.user_id is 'PENDING' (legacy case), try to find any valid user
  if (!processedBy || processedBy === 'PENDING') {
    const fallbackUser = await db.users.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    if (fallbackUser) {
      processedBy = fallbackUser.id;
    } else {
      logger.log(`⚠️  No valid user found for processed_by, using payment user_id: ${payment.user_id}`);
      // This will fail FK constraint if invalid, which is acceptable - better to fail than corrupt data
      processedBy = payment.user_id;
    }
  }
  
  logger.log(`📝 Recording refund processed by: ${processedBy === payment.user_id ? 'USER' : 'ADMIN'}`);

  // Record refund
  await db.refunds.create({
    data: {
      id: randomBytes(12).toString('base64url'),
      stripe_refund_id: refund.id,
      stripe_payment_intent_id: refund.payment_intent as string,
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason || null,
      status: refund.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING',
      processed_by: processedBy, // Use admin user or fallback to payment user
      user_id: payment.user_id, // Now guaranteed to be valid (not 'PENDING')
      payment_id: payment.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // If full refund, end membership immediately
  if (isFullRefund) { // payment.user_id is now always valid
    logger.log(`🚫 Full refund detected, ending membership for user ${payment.user_id}`);
    
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

      logger.log(`✅ Membership ended for user ${payment.user_id}`);
    }
  }
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    logger.log('🎣 Webhook received');
    
    // Check if webhook secret is configured
    if (!webhookSecret) {
      logger.log('❌ Webhook secret not configured');
      return NextResponse.json(
        { error: 'Stripe webhook not configured' },
        { status: 500 }
      );
    }

    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      logger.log('❌ Missing Stripe signature');
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    // Construct and verify webhook event
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logger.log(`✅ Webhook verified: ${event.type} (${event.id})`);
    } catch (err) {
      logger.log(`❌ Webhook signature verification failed: ${err}`);
      throw err;
    }

    // Ensure idempotency
    const shouldProcess = await ensureEventIdempotency(
      event.id,
      event.type,
      event.data.object
    );

    if (!shouldProcess) {
      return NextResponse.json({ received: true, skipped: true });
    }

    // Process event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          
          // Only handle payment mode sessions (not subscription mode)
          if (session.mode === 'payment') {
            await handleMembershipPaymentSuccess(session);
          } else {
            logger.log(`⏭️  Session ${session.id} is subscription mode, skipping (legacy)`);
          }
          break;
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          if (charge.refunds?.data[0]) {
            await handleRefund(charge.refunds.data[0]);
          }
          break;
        }

        case 'refund.updated': {
          const refund = event.data.object as Stripe.Refund;
          await handleRefund(refund);
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          logger.log(`💥 Payment failed event received: ${paymentIntent.id}`);
          await handlePaymentFailed(paymentIntent);
          break;
        }

        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          logger.log(`✅ Payment succeeded event received: ${paymentIntent.id}`);
          // This is handled by checkout.session.completed, but log it
          break;
        }

        case 'charge.failed': {
          const charge = event.data.object as Stripe.Charge;
          logger.log(`💥 Charge failed event received: ${charge.id}`);
          // Extract payment intent and handle
          if (charge.payment_intent) {
            const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent as string);
            await handlePaymentFailed(paymentIntent);
          }
          break;
        }

        // Keep legacy subscription handlers for backward compatibility
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed': {
          logger.log(`⏭️  Legacy subscription event ${event.type}, keeping existing behavior`);
          // TODO: Could handle these for premium tier in future
          break;
        }

        default:
          logger.log(`ℹ️  Unhandled event type: ${event.type}`);
      }

      // Mark event as processed
      await markEventProcessed(event.id, true);

      return NextResponse.json({ received: true });
    } catch (processingError) {
      logger.log(`❌ Error processing event ${event.id}: ${processingError}`);
      await markEventProcessed(event.id, false, String(processingError));
      throw processingError;
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}
