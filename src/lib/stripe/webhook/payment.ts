import { db } from '@/lib/db';
import { randomBytes } from 'crypto';
import type Stripe from 'stripe';

/**
 * Creates zero-amount payment record for 100% discounted checkouts
 */
export async function createZeroAmountPayment(
  userId: string,
  session: Stripe.Checkout.Session
): Promise<string> {
  const zeroPaymentId = randomBytes(12).toString('base64url');
  await db.payments.create({
    data: {
      id: zeroPaymentId,
      user_id: userId,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: null,
      stripe_charge_id: null,
      amount: 0,
      currency: session.currency || 'gbp',
      status: 'SUCCEEDED',
      refunded_amount: 0,
      metadata: session.metadata || {},
      created_at: new Date(session.created * 1000),
      updated_at: new Date(),
    },
  });
  
  return zeroPaymentId;
}

/**
 * Records payment from successful payment intent (idempotent)
 */
export async function recordPaymentIfNeeded(
  userId: string,
  session: Stripe.Checkout.Session,
  paymentIntent: Stripe.PaymentIntent
): Promise<{ alreadyExists: boolean; paymentId: string | null }> {
  
  // Check if already recorded
  const existingPayment = await db.payments.findUnique({
    where: { stripe_checkout_session_id: session.id },
  });

  if (existingPayment) {
    return { alreadyExists: true, paymentId: existingPayment.id };
  }

  // Create new payment record
  const paymentId = randomBytes(12).toString('base64url');
  const chargeId = (paymentIntent as any).latest_charge as string || null;
  
  await db.payments.create({
    data: {
      id: paymentId,
      user_id: userId,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: chargeId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'SUCCEEDED',
      refunded_amount: 0,
      metadata: session.metadata || {},
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  return { alreadyExists: false, paymentId };
}

/**
 * Records payment but marks it with verification bypass warning
 */
export async function recordPaymentWithVerificationWarning(
  userId: string,
  session: Stripe.Checkout.Session,
  paymentIntent: Stripe.PaymentIntent
): Promise<string> {
  const paymentId = randomBytes(12).toString('base64url');
  const chargeId = (paymentIntent as any).latest_charge as string || null;
  
  await db.payments.create({
    data: {
      id: paymentId,
      user_id: userId,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: chargeId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'SUCCEEDED',
      refunded_amount: 0,
      metadata: {
        ...session.metadata,
        verification_bypass_detected: true,
        warning: 'Payment succeeded for unverified email',
      },
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  
  return paymentId;
}
