import { endStripeSubscription } from '@/lib/subscriptions/stripe-deletion';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { sendTemplatedEmail } from '@/lib/email/send-templated';
import { randomBytes } from 'crypto';
import type Stripe from 'stripe';
import { UserStatus } from '@prisma/client';
import {
  calculateEarlyRenewalExpiry,
  calculateStandardRenewalExpiry,
  calculate5YearRenewalExpiry,
} from '@/lib/membership-renewal';
import { ingestRefundEvent, isRefundEvent } from '@/lib/payments/refunds/service';
import { refundLifecycleEnabled } from '@/lib/payments/refunds/contracts';
import { providerId, metadataRecord } from '@/lib/payments/refunds/identity';
import { grantPurchasedFeatured, grantPurchasedMembership, renewPurchasedMembership, recordRecurringInvoice } from '@/lib/payments/purchased-benefits';
import { initializeCheckoutBilling } from '@/lib/payments/subscription-checkout-billing';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

type SubscriptionWithPeriod = { current_period_end?: number; current_period_start?: number; cancel_at_period_end?: boolean };

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
      console.log(`[INFO] Event ${eventId} already processed, skipping`);
      return !existing.processed && ['checkout.session.completed', 'invoice.payment_succeeded', 'customer.subscription.updated'].includes(eventType) && refundLifecycleEnabled();
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
    console.warn(`[WARNING] Error checking event idempotency: ${error}`);
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
    console.warn(`[WARNING] Error marking event as processed: ${err}`);
  }
}

/**
 * Handle Featured Studio Upgrade payment completion (6 months)
 */
async function handleFeaturedUpgradePaymentSuccess(session: Stripe.Checkout.Session) {
  const timestamp = new Date().toISOString();
  console.log(`[DEBUG ${timestamp}] ========== WEBHOOK: handleFeaturedUpgradePaymentSuccess START ==========`);
  console.log(`[DEBUG ${timestamp}] Session ID: ${session.id}`);
  console.log(`[DEBUG ${timestamp}] Session metadata:`, JSON.stringify(session.metadata || {}, null, 2));
  
  const { user_id, user_email, studio_id, purpose } = session.metadata || {};

  if (purpose !== 'featured_upgrade') {
    console.log(`[DEBUG ${timestamp}] ❌ Session ${session.id} is not a featured upgrade (purpose: ${purpose}), skipping`);
    return;
  }

  if (!user_id || !user_email || !studio_id) {
    console.error(`[DEBUG ${timestamp}] ❌ ERROR: Missing required metadata`);
    console.error(`[DEBUG ${timestamp}] user_id: ${user_id}, studio_id: ${studio_id}, user_email: ${user_email}`);
    throw new Error('Missing required metadata for featured upgrade');
  }

  console.log(`[DEBUG ${timestamp}] ✅ Metadata validation passed`);
  console.log(`💳 Processing featured upgrade for user ${user_id}, studio ${studio_id}`);

  // Expand session to get payment_intent
  console.log(`[DEBUG ${timestamp}] Retrieving expanded session from Stripe...`);
  const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['payment_intent'],
  });

  const paymentIntent = expandedSession.payment_intent as Stripe.PaymentIntent | null;

  // Handle 100% discount (no payment_intent created by Stripe)
  if (!paymentIntent && expandedSession.amount_total === 0) {
    console.log(`[DEBUG ${timestamp}] 💰 Zero-amount checkout (100% discount applied)`);
    
    const zeroPaymentId = randomBytes(12).toString('base64url');
    await db.payments.upsert({
      where: { stripe_checkout_session_id: session.id }, update: {}, create: {
        id: zeroPaymentId,
        user_id: user_id,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: null,
        stripe_charge_id: null,
        amount: 0,
        currency: expandedSession.currency || 'gbp',
        status: 'SUCCEEDED',
        refunded_amount: 0,
        metadata: { ...session.metadata, ...(refundLifecycleEnabled() ? { grant_model: 'payment_benefit_v1' } : {}) },
        created_at: new Date(session.created * 1000),
        updated_at: new Date(),
      },
    });
    console.log(`[DEBUG ${timestamp}] ✅ Created zero-amount payment record: ${zeroPaymentId}`);
  } else if (!paymentIntent) {
    console.error(`[DEBUG ${timestamp}] ❌ ERROR: No payment_intent found for session ${session.id}`);
    throw new Error('No payment_intent found for session');
  }

  // Check if payment already recorded
  const existingPayment = await db.payments.findUnique({
    where: { stripe_checkout_session_id: session.id },
  });

  if (existingPayment) {
    console.log(`[DEBUG ${timestamp}] ⚠️ Payment record already exists for session ${session.id}`);
    console.log(`💳 Payment record already exists, skipping payment creation`);
  } else if (paymentIntent) {
    // Record payment
    console.log(`[DEBUG ${timestamp}] Creating payment record...`);
    const paymentId = randomBytes(12).toString('base64url');
    
    await db.payments.create({
      data: {
        id: paymentId,
        user_id: user_id,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: (paymentIntent as any).latest_charge as string || null,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'SUCCEEDED',
        refunded_amount: 0,
        metadata: { ...session.metadata, ...(refundLifecycleEnabled() ? { grant_model: 'payment_benefit_v1' } : {}) },
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log(`[DEBUG ${timestamp}] ✅ Payment record created: ${paymentId}`);
    console.log(`[SUCCESS] Payment recorded: ${paymentId}`);
  }

  // Grant featured status for 6 months
  console.log(`[DEBUG ${timestamp}] Granting featured status to studio ${studio_id}...`);
  
  const now = new Date();
  const featuredUntil = new Date(now);
  featuredUntil.setMonth(featuredUntil.getMonth() + 6);

  // Defensive check: ensure featured slots available
  const featuredCount = await db.studio_profiles.count({
    where: {
      is_featured: true,
      id: { not: studio_id }, // Exclude this studio from count
      OR: [
        { featured_until: null },
        { featured_until: { gte: now } }
      ]
    }
  });

  if (featuredCount >= 6) {
    console.error(`[DEBUG ${timestamp}] ❌ ERROR: All featured slots taken (${featuredCount}/6)`);
    console.error(`[DEBUG ${timestamp}] Payment was recorded but featured status NOT granted`);
    throw new Error('All featured studio slots are taken');
  }

  if (refundLifecycleEnabled()) {
    const payment = await db.payments.findUnique({ where: { stripe_checkout_session_id: session.id } });
    if (!payment || metadataRecord(payment.metadata).grant_model !== 'payment_benefit_v1') throw new Error('Historical Featured purchase requires reviewed attribution');
    const known = await db.payment_benefit_grants.findUnique({ where: { source_key: `payment/${payment.id}` } });
    if (known) return;
    await grantPurchasedFeatured(user_id, studio_id, payment.id, now, featuredUntil);
  } else {
    await db.studio_profiles.update({ where: { id: studio_id }, data: { is_featured: true, featured_until: featuredUntil, updated_at: now } });
  }

  console.log(`[DEBUG ${timestamp}] ✅ Studio ${studio_id} marked as featured until ${featuredUntil.toISOString()}`);
  console.log(`[SUCCESS] Featured status granted to studio ${studio_id} until ${featuredUntil.toISOString()}`);

  // Send confirmation email
  try {
    await sendTemplatedEmail({
      to: user_email,
      templateKey: 'featured-upgrade',
      variables: {
        featuredUntil: featuredUntil.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
      },
    });
    console.log(`[EMAIL] Featured upgrade confirmation sent to ${user_email}`);
  } catch (emailError) {
    console.warn(`[WARNING] Failed to send featured upgrade confirmation email: ${emailError}`);
  }

  console.log(`[DEBUG ${timestamp}] ========== WEBHOOK: handleFeaturedUpgradePaymentSuccess END ==========`);
}

/**
 * Handle one-time membership payment completion
 */
async function handleMembershipPaymentSuccess(session: Stripe.Checkout.Session) {
  const timestamp = new Date().toISOString();
  console.log(`[DEBUG ${timestamp}] ========== WEBHOOK: handleMembershipPaymentSuccess START ==========`);
  console.log(`[DEBUG ${timestamp}] Session ID: ${session.id}`);
  console.log(`[DEBUG ${timestamp}] Session mode: ${session.mode}`);
  console.log(`[DEBUG ${timestamp}] Payment status: ${session.payment_status}`);
  console.log(`[DEBUG ${timestamp}] Session metadata:`, JSON.stringify(session.metadata || {}, null, 2));
  
  const { user_id, user_email, user_name, purpose, renewal_type, current_expiry } = session.metadata || {};

  console.log(`[DEBUG ${timestamp}] Extracted metadata - user_id: ${user_id}, user_email: ${user_email}, purpose: ${purpose}, renewal_type: ${renewal_type || 'N/A'}`);

  // Accept 'membership' (initial signup), 'membership_renewal' (renewals), and 'membership_upgrade' (Basic→Premium)
  if (purpose !== 'membership' && purpose !== 'membership_renewal' && purpose !== 'membership_upgrade') {
    console.log(`[DEBUG ${timestamp}] ❌ Session ${session.id} is not a membership payment (purpose: ${purpose}), skipping`);
    console.log(`[INFO] Session ${session.id} is not a membership payment, skipping`);
    return;
  }
  
  // Check if this is a renewal
  const isRenewal = purpose === 'membership_renewal' && renewal_type;
  
  // DEFENSIVE CHECK: If purpose is renewal, renewal_type MUST be present
  if (purpose === 'membership_renewal' && !renewal_type) {
    console.error(`[DEBUG ${timestamp}] ❌ ERROR: Renewal payment missing renewal_type in metadata`);
    console.error(`[DEBUG ${timestamp}] This indicates malformed webhook metadata - payment will be recorded but membership will NOT be extended`);
    throw new Error('Renewal payment missing renewal_type in metadata');
  }

  if (!user_id) {
    console.error(`[DEBUG ${timestamp}] ❌ ERROR: Missing user_id in session metadata`);
    console.error(`[DEBUG ${timestamp}] Full metadata:`, JSON.stringify(session.metadata || {}, null, 2));
    throw new Error('Missing user_id in session metadata - user should exist before payment');
  }

  if (!user_email) {
    console.error(`[DEBUG ${timestamp}] ❌ ERROR: Missing user_email in session metadata`);
    console.error(`[DEBUG ${timestamp}] Full metadata:`, JSON.stringify(session.metadata || {}, null, 2));
    throw new Error('Missing user_email in session metadata');
  }

  console.log(`[DEBUG ${timestamp}] ✅ Metadata validation passed`);
  console.log(`💳 Processing membership payment for user ${user_id} (${user_email})`);

  // Expand session to get payment_intent and total_details.breakdown (for coupon metadata)
  console.log(`[DEBUG ${timestamp}] Retrieving expanded session from Stripe...`);
  const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['payment_intent', 'total_details.breakdown'],
  });
  console.log(`[DEBUG ${timestamp}] Expanded session retrieved. Payment intent: ${expandedSession.payment_intent ? 'EXISTS' : 'MISSING'}`);
  console.log(`[DEBUG ${timestamp}] Session amount_total: ${expandedSession.amount_total}`);
  console.log(`[DEBUG ${timestamp}] Session payment_status: ${expandedSession.payment_status}`);

  const paymentIntent = expandedSession.payment_intent as Stripe.PaymentIntent | null;
  
  // Extract coupon metadata for custom membership duration
  let membershipMonths = 12; // Default 12 months
  let couponCode: string | null = null;
  
  if (expandedSession.total_details?.breakdown?.discounts && expandedSession.total_details.breakdown.discounts.length > 0) {
    const discount = expandedSession.total_details.breakdown.discounts[0];
    couponCode = (discount as any)?.discount?.source?.coupon?.id || null;
    
    if (couponCode) {
      console.log(`[DEBUG ${timestamp}] 🎟️ Coupon applied: ${couponCode}`);
      
      // Retrieve full coupon object to access metadata
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        
        if (coupon.metadata?.membership_months) {
          const parsedMonths = parseInt(coupon.metadata.membership_months, 10);
          
          // Validate parsed value is a valid number and reasonable (1-60 months)
          if (!isNaN(parsedMonths) && parsedMonths > 0 && parsedMonths <= 60) {
            membershipMonths = parsedMonths;
            console.log(`[DEBUG ${timestamp}] 🎁 Custom membership duration from coupon: ${membershipMonths} months`);
          } else {
            console.warn(`[DEBUG ${timestamp}] ⚠️ Invalid membership_months value in coupon metadata: "${coupon.metadata.membership_months}" (parsed as: ${parsedMonths}). Using default: 12 months`);
          }
        } else {
          console.log(`[DEBUG ${timestamp}] ℹ️ Coupon has no membership_months metadata, using default: 12 months`);
        }
      } catch (err) {
        console.warn(`[DEBUG ${timestamp}] ⚠️ Could not retrieve coupon metadata:`, err);
      }
    }
  }
  
  // Handle 100% discount (no payment_intent created by Stripe)
  if (!paymentIntent && expandedSession.amount_total === 0) {
    console.log(`[DEBUG ${timestamp}] 💰 Zero-amount checkout (100% discount applied) - no payment_intent created`);
    
    // Still activate the membership, but create a special payment record
    const zeroPaymentId = randomBytes(12).toString('base64url');
    const zeroPayment = await db.payments.upsert({
      where: { stripe_checkout_session_id: session.id }, update: {}, create: {
        id: zeroPaymentId,
        user_id: user_id,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: null, // No payment intent for zero-amount
        stripe_charge_id: null,
        amount: 0,
        currency: expandedSession.currency || 'gbp',
        status: 'SUCCEEDED',
        refunded_amount: 0,
        metadata: { ...session.metadata, ...(refundLifecycleEnabled() ? { grant_model: 'payment_benefit_v1' } : {}) },
        created_at: new Date(session.created * 1000),
        updated_at: new Date(),
      },
    });
    console.log(`[DEBUG ${timestamp}] ✅ Created zero-amount payment record: ${zeroPaymentId}`);
    if (refundLifecycleEnabled()) {
      if (metadataRecord(zeroPayment.metadata).grant_model !== 'payment_benefit_v1') throw new Error('Historical free purchase requires review');
      if (isRenewal) await renewPurchasedMembership(user_id, zeroPayment.id, renewal_type as 'early' | 'standard' | '5year');
      else await grantPurchasedMembership(user_id, zeroPayment.id, membershipMonths, providerId(session.customer));
      if (membershipMonths >= 12) {
        const { setLegacyVoiceoverUnlocked } = await import('@/lib/membership');
        await setLegacyVoiceoverUnlocked(user_id);
      }
      return;
    }

    
    // Grant membership immediately (bypass payment intent processing)
    const user = await db.users.findUnique({
      where: { id: user_id },
      select: { id: true, email: true, status: true },
    });

    if (!user) {
      throw new Error(`User ${user_id} not found`);
    }

    // Activate user and grant membership with custom duration
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + membershipMonths);

    await db.users.update({
      where: { id: user_id },
      data: {
        status: 'ACTIVE',
        membership_tier: 'PREMIUM', // Grant Premium tier on payment
        email_verified: true,
        updated_at: now,
      },
    });

    const subscriptionId = randomBytes(12).toString('base64url');
    await db.subscriptions.create({
      data: {
        id: subscriptionId,
        user_id: user_id,
        stripe_subscription_id: null,
        stripe_customer_id: session.customer as string || null,
        payment_method: 'STRIPE',
        status: 'ACTIVE',
        current_period_start: now,
        current_period_end: expiryDate,
        created_at: now,
        updated_at: now,
      },
    });

    console.log(`[DEBUG ${timestamp}] ✅ User ${user_id} activated with ${membershipMonths}-month PREMIUM membership (zero-amount)${couponCode ? ` using coupon ${couponCode}` : ''}`);
    console.log(`[DEBUG ${timestamp}] Membership expires: ${expiryDate.toISOString()}`);
    if (membershipMonths >= 12) {
      const { setLegacyVoiceoverUnlocked } = await import('@/lib/membership');
      await setLegacyVoiceoverUnlocked(user_id);
    }
    console.log(`[DEBUG ${timestamp}] ========== WEBHOOK: handleMembershipPaymentSuccess END (zero-amount) ==========`);
    return; // Exit early, membership granted
  }
  
  if (!paymentIntent) {
    console.error(`[DEBUG ${timestamp}] ❌ ERROR: No payment_intent found for session ${session.id}`);
    console.error(`[DEBUG ${timestamp}] Expanded session data:`, JSON.stringify(expandedSession, null, 2));
    throw new Error('No payment_intent found for session');
  }

  console.log(`[DEBUG ${timestamp}] ✅ Payment intent found: ${paymentIntent.id}`);
  console.log(`[DEBUG ${timestamp}] Payment intent status: ${paymentIntent.status}`);
  console.log(`[DEBUG ${timestamp}] Payment intent amount: ${paymentIntent.amount} ${paymentIntent.currency}`);

  // Find or create customer
  let customer: Stripe.Customer | null = null;
  if (session.customer) {
    console.log(`[DEBUG ${timestamp}] Retrieving customer: ${session.customer}`);
    customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer;
    console.log(`[DEBUG ${timestamp}] Customer retrieved: ${customer.email || 'NO EMAIL'}`);
  } else {
    console.log(`[DEBUG ${timestamp}] No customer ID in session`);
  }

  // Find user by ID (they should already exist as PENDING)
  console.log(`[DEBUG ${timestamp}] Looking up user in database: ${user_id}`);
  const user = await db.users.findUnique({
    where: { id: user_id },
    select: {
      id: true,
      email: true,
      email_verified: true,
      status: true,
      display_name: true,
      payment_attempted_at: true,
      payment_retry_count: true,
    },
  });

  if (!user) {
    console.error(`[DEBUG ${timestamp}] ❌ ERROR: User ${user_id} not found in database`);
    throw new Error(`User ${user_id} not found - this should not happen with new flow`);
  }

  console.log(`[DEBUG ${timestamp}] ✅ User found in database:`);
  console.log(`[DEBUG ${timestamp}]   - ID: ${user.id}`);
  console.log(`[DEBUG ${timestamp}]   - Email: ${user.email}`);
  console.log(`[DEBUG ${timestamp}]   - Status: ${user.status}`);
  console.log(`[DEBUG ${timestamp}]   - Email verified: ${user.email_verified}`);
  console.log(`[SUCCESS] Found ${user.status} user: ${user.email}`);

  // DEFENSIVE CHECK: Verify email is verified before granting membership
  // This should never happen if payment guards are working, but protect against edge cases
  if (!user.email_verified) {
    console.warn(`[WARNING] WARNING: Payment succeeded for unverified email: ${user.email}`);
    console.warn(`[WARNING] This indicates a bypass of payment guards - investigate immediately`);
    console.warn(`[WARNING] Payment will be recorded but membership will NOT be granted`);
    
    // Record payment but don't grant membership
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
        metadata: {
          ...session.metadata,
          verification_bypass_detected: true,
          warning: 'Payment succeeded for unverified email',
        },
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    
    console.log(`[SUCCESS] Payment recorded (no membership granted): ${payment.id}`);
    
    // TODO: Send alert email to admin about verification bypass
    // TODO: Send email to user instructing them to verify email before accessing membership
    
    return; // Exit without granting membership
  }

  // Record payment (idempotent on checkout_session_id)
  console.log(`[DEBUG ${timestamp}] Checking for existing payment with session_id: ${session.id}`);
  const existingPayment = await db.payments.findUnique({
    where: { stripe_checkout_session_id: session.id },
  });

  if (existingPayment) {
    if (!refundLifecycleEnabled() || metadataRecord(existingPayment.metadata).grant_model !== 'payment_benefit_v1') return;
    if (await db.payment_benefit_grants.findUnique({ where: { source_key: `payment/${existingPayment.id}` } })) return;
  }

  console.log(`[DEBUG ${timestamp}] No existing payment found, creating new payment record...`);
  const paymentId = randomBytes(12).toString('base64url');
  const chargeId = (paymentIntent as any).latest_charge as string || null;
  
  console.log(`[DEBUG ${timestamp}] Payment data to create:`);
  console.log(`[DEBUG ${timestamp}]   - Payment ID: ${paymentId}`);
  console.log(`[DEBUG ${timestamp}]   - User ID: ${user.id}`);
  console.log(`[DEBUG ${timestamp}]   - Session ID: ${session.id}`);
  console.log(`[DEBUG ${timestamp}]   - Payment Intent ID: ${paymentIntent.id}`);
  console.log(`[DEBUG ${timestamp}]   - Charge ID: ${chargeId || 'NULL'}`);
  console.log(`[DEBUG ${timestamp}]   - Amount: ${paymentIntent.amount} ${paymentIntent.currency}`);
  console.log(`[DEBUG ${timestamp}]   - Status: SUCCEEDED`);

  const payment = existingPayment ?? await db.payments.create({
    data: {
      id: paymentId,
      user_id: user.id,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: chargeId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'SUCCEEDED',
      refunded_amount: 0,
      metadata: { ...session.metadata, ...(refundLifecycleEnabled() ? { grant_model: 'payment_benefit_v1' } : {}) },
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  console.log(`[DEBUG ${timestamp}] ✅ Payment record created successfully:`);
  console.log(`[DEBUG ${timestamp}]   - Payment ID: ${payment.id}`);
  console.log(`[DEBUG ${timestamp}]   - Status: ${payment.status}`);
  console.log(`[SUCCESS] Payment recorded: ${payment.id}`);

  // Handle renewal vs initial signup with error handling to ensure email is sent
  let membershipProcessingError: Error | null = null;
  
  try {
    if (isRenewal) {
      console.log(`[DEBUG ${timestamp}] Processing ${renewal_type} renewal for user ${user.id}...`);
      await handleMembershipRenewal(user.id, renewal_type as 'early' | 'standard' | '5year', current_expiry, payment.id);
      console.log(`[DEBUG ${timestamp}] ✅ Membership renewal processed successfully`);
      // All renewals are 12+ months — unlock legacy VOICEOVER restriction
      const { setLegacyVoiceoverUnlocked } = await import('@/lib/membership');
      await setLegacyVoiceoverUnlocked(user.id);
    } else {
      // Grant membership and update payment tracking in single atomic operation
      console.log(`[DEBUG ${timestamp}] Granting ${membershipMonths}-month membership to user ${user.id}${couponCode ? ` using coupon ${couponCode}` : ''}...`);
      await grantMembership(user.id, payment.id, {
        payment_attempted_at: user.payment_attempted_at || new Date(),
        payment_retry_count: 0,
      }, membershipMonths, session.customer as string || null);
      console.log(`[DEBUG ${timestamp}] ✅ Membership granted successfully`);
      if (membershipMonths >= 12) {
        const { setLegacyVoiceoverUnlocked } = await import('@/lib/membership');
        await setLegacyVoiceoverUnlocked(user.id);
      }
    }
  } catch (error) {
    // Store error but don't throw yet - we need to send confirmation email first
    membershipProcessingError = error instanceof Error ? error : new Error(String(error));
    console.error(`[ERROR ${timestamp}] Membership processing failed:`, error);
    console.error(`[ERROR ${timestamp}] Payment was recorded but membership was not granted/renewed`);
    console.error(`[ERROR ${timestamp}] Will attempt to send notification email before re-throwing error`);
  }

  if (refundLifecycleEnabled() && membershipProcessingError) throw membershipProcessingError;

  // The legacy fallback remains available only while the new lifecycle is disabled.
  if (customer?.email || user_email) {
    try {
      // Fetch actual expiry date from database after processing
      const updatedSubscription = await db.subscriptions.findFirst({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' },
        select: { current_period_end: true },
      });

      let actualExpiryDate: Date;
      
      if (!updatedSubscription?.current_period_end) {
        // ERROR: Subscription not found after successful payment/renewal
        // This should never happen, but we'll calculate a fallback date to still send the email
        console.error(`[ERROR] No subscription found for user ${user.id} after payment processing. Using fallback date calculation.`);
        
        // Calculate fallback expiry date based on renewal type or default to 1 year from now
        if (isRenewal && renewal_type) {
          if ((renewal_type === 'early' || renewal_type === 'standard') && current_expiry && current_expiry !== 'none') {
            const currentExpiryDate = new Date(current_expiry);
            if (renewal_type === 'early') {
              actualExpiryDate = calculateEarlyRenewalExpiry(currentExpiryDate);
              console.log(`[FALLBACK] Using calculated early renewal expiry: ${actualExpiryDate.toISOString()}`);
            } else {
              actualExpiryDate = calculateStandardRenewalExpiry(currentExpiryDate);
              console.log(`[FALLBACK] Using calculated standard renewal expiry: ${actualExpiryDate.toISOString()}`);
            }
          } else if (renewal_type === '5year') {
            const currentExpiryDate = (current_expiry && current_expiry !== 'none') ? new Date(current_expiry) : null;
            actualExpiryDate = calculate5YearRenewalExpiry(currentExpiryDate);
            console.log(`[FALLBACK] Using calculated 5-year renewal expiry: ${actualExpiryDate.toISOString()}`);
          } else {
            // Unknown renewal type, default to 1 year
            actualExpiryDate = new Date();
            actualExpiryDate.setFullYear(actualExpiryDate.getFullYear() + 1);
            console.log(`[FALLBACK] Using default 1-year expiry: ${actualExpiryDate.toISOString()}`);
          }
        } else {
          // Initial signup, calculate based on membership months
          actualExpiryDate = new Date();
          actualExpiryDate.setMonth(actualExpiryDate.getMonth() + (membershipMonths || 12));
          console.log(`[FALLBACK] Using ${membershipMonths || 12}-month expiry: ${actualExpiryDate.toISOString()}`);
        }
      } else {
        actualExpiryDate = updatedSubscription.current_period_end;
      }
      
      // Determine plan name based on renewal type
      let planName = 'Annual Membership';
      if (isRenewal) {
        if (renewal_type === 'early') {
          planName = 'Early Renewal (with 1-month bonus)';
        } else if (renewal_type === 'standard') {
          planName = 'Standard Renewal';
        } else if (renewal_type === '5year') {
          planName = '5-Year Membership';
        }
      }
      
      await sendTemplatedEmail({
        to: customer?.email || user_email,
        templateKey: 'payment-success',
        variables: {
          customerName: user_name || customer?.name || user.display_name || 'Valued Member',
          amount: (payment.amount / 100).toFixed(2),
          currency: payment.currency.toUpperCase(),
          paymentId: payment.id,
          planName,
          nextBillingDate: actualExpiryDate.toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }),
        },
      });
      console.log(`[EMAIL] Confirmation email sent to ${customer?.email || user_email} with expiry: ${actualExpiryDate.toISOString()}`);
    } catch (emailError) {
      console.warn(`[WARNING] Failed to send confirmation email: ${emailError}`);
    }
  }
  
  // If membership processing failed, re-throw error now that email has been sent
  if (membershipProcessingError) {
    console.error(`[ERROR ${timestamp}] Re-throwing membership processing error after email attempt`);
    throw membershipProcessingError;
  }
}

/**
 * Handle Stripe subscription checkout completion (membership with auto-renew option)
 */
async function handleMembershipSubscriptionCompleted(session: Stripe.Checkout.Session) {
  const { user_id, purpose, auto_renew } = session.metadata || {};
  if ((purpose !== 'membership' && purpose !== 'membership_upgrade' && purpose !== 'switch_to_subscription') || !user_id) {
    throw new Error('Missing user_id or purpose in subscription session metadata');
  }

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    throw new Error('No subscription ID in checkout session');
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (refundLifecycleEnabled()) {
    // A retried checkout must use its original invoice, not a later renewal.
    const invoiceId = providerId(session.invoice);
    if (!invoiceId) throw new Error('Subscription invoice identity is required');
    const purchase = await recordRecurringInvoice(invoiceId, subscription, user_id, session);
    await initializeCheckoutBilling({ userId: user_id, checkoutId: session.id,
      checkoutCreatedAt: new Date(session.created * 1000), invoiceId, subscriptionId,
      wantsRenewal: auto_renew === 'true', periodEnd: purchase.periodEnd });
    // The purchased-benefit transaction creates missing profiles without changing existing visibility.
    const { setLegacyVoiceoverUnlocked } = await import('@/lib/membership');
    await setLegacyVoiceoverUnlocked(user_id);
    return;
  }

  const periodEndTs = (subscription as { current_period_end?: number }).current_period_end;
  const periodEnd = periodEndTs
    ? new Date(periodEndTs * 1000)
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  // Honour user's choice: metadata auto_renew === 'true' means they checked the checkbox
  const userWantsAutoRenew = auto_renew === 'true';

  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: !userWantsAutoRenew,
  });

  const now = new Date();
  await db.users.update({
    where: { id: user_id },
    data: {
      status: UserStatus.ACTIVE,
      membership_tier: 'PREMIUM',
      auto_renew: userWantsAutoRenew,
      updated_at: now,
    },
  });

  const periodStartTs = (subscription as { current_period_start?: number }).current_period_start;

  await db.subscriptions.create({
    data: {
      id: randomBytes(12).toString('base64url'),
      user_id,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: (subscription as { customer?: string }).customer || null,
      payment_method: 'STRIPE',
      status: 'ACTIVE',
      current_period_start: periodStartTs ? new Date(periodStartTs * 1000) : now,
      current_period_end: periodEnd,
      created_at: now,
      updated_at: now,
    },
  });

  // Ensure studio profile exists and is ACTIVE
  const { ensureStudioProfile } = await import('@/lib/studio-profile');
  await ensureStudioProfile(user_id);

  // Record a payment so subscription revenue is visible on admin payments page.
  // Retrieve the initial invoice to get the actual charge and payment intent IDs.
  try {
    const latestInvoiceId = (subscription as any).latest_invoice as string | null;
    let paymentIntentId: string | null = null;
    let chargeId: string | null = null;
    let amountPaid = session.amount_total || 0;
    let currency = session.currency || 'gbp';

    if (latestInvoiceId) {
      const invoice = await stripe.invoices.retrieve(latestInvoiceId) as any;
      paymentIntentId = (invoice.payment_intent as string) || null;
      amountPaid = invoice.amount_paid || amountPaid;
      currency = invoice.currency || currency;
      if (paymentIntentId) {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        chargeId = (pi as any).latest_charge as string || null;
      }
    }

    await db.payments.create({
      data: {
        id: randomBytes(12).toString('base64url'),
        user_id,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_charge_id: chargeId,
        amount: amountPaid,
        currency,
        status: 'SUCCEEDED',
        refunded_amount: 0,
        metadata: { ...session.metadata, subscription_id: subscriptionId },
        created_at: now,
        updated_at: now,
      },
    });
    console.log(`[SUCCESS] Payment record created for subscription checkout (user ${user_id})`);
  } catch (paymentRecordError) {
    // Non-fatal: subscription and membership are already granted above.
    // Log loudly so the gap can be spotted, but don't fail the webhook.
    console.error(`[WARNING] Failed to create payment record for subscription (user ${user_id}):`, paymentRecordError);
  }

  // Subscription memberships are annual (12+ months) — unlock legacy VOICEOVER
  const { setLegacyVoiceoverUnlocked } = await import('@/lib/membership');
  await setLegacyVoiceoverUnlocked(user_id);

  console.log(`[SUCCESS] Subscription membership granted for user ${user_id} until ${periodEnd.toISOString()}`);
}

/**
 * Grant membership to user with custom duration
 * Atomically updates user status and payment tracking fields
 * @param userId - User ID to grant membership to
 * @param _paymentId - Payment ID (for logging/tracking)
 * @param paymentTracking - Payment tracking metadata
 * @param membershipMonths - Number of months to grant (default: 12)
 * @param stripeCustomerId - Stripe customer ID (marks the subscription as a real
 *   payment so the legacy-grant logic in auth.ts will not overwrite it)
 */
async function grantMembership(
  userId: string, 
  _paymentId: string,
  paymentTracking?: {
    payment_attempted_at: Date;
    payment_retry_count: number;
  },
  membershipMonths: number = 12,
  stripeCustomerId?: string | null,
) {
  if (refundLifecycleEnabled()) {
    const subscription = await grantPurchasedMembership(userId, _paymentId, membershipMonths, stripeCustomerId, paymentTracking);
    // Existing status/visibility was preserved by the purchased-benefit transaction.
    return subscription;
  }
  const now = new Date();
  const expiryDate = new Date(now);
  expiryDate.setMonth(expiryDate.getMonth() + membershipMonths);

  // ATOMIC UPDATE: status, tier, payment tracking, and email flags in single operation
  await db.users.update({
    where: { id: userId },
    data: {
      status: UserStatus.ACTIVE,
      membership_tier: 'PREMIUM', // Grant Premium tier on payment
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
  console.log(`[SUCCESS] User ${userId} status updated: PENDING → ACTIVE (PREMIUM tier)`);

  // Create membership record in subscriptions table
  const subscription = await db.subscriptions.create({
    data: {
      id: randomBytes(12).toString('base64url'),
      user_id: userId,
      stripe_customer_id: stripeCustomerId || null,
      status: 'ACTIVE',
      payment_method: 'STRIPE',
      current_period_start: now,
      current_period_end: expiryDate,
      created_at: now,
      updated_at: now,
      // No stripe_subscription_id since this is a one-time payment
    },
  });

  // Ensure studio profile exists and is ACTIVE
  const { ensureStudioProfile } = await import('@/lib/studio-profile');
  await ensureStudioProfile(userId);

  console.log(`[SUCCESS] Membership granted to user ${userId} for ${membershipMonths} months until ${expiryDate.toISOString()}`);
  return subscription;
}

/**
 * Handle membership renewal
 * Extends existing membership based on renewal type
 * @param userId - User ID to renew membership for
 * @param renewalType - Type of renewal ('early', 'standard', or '5year')
 * @param currentExpiryIso - Current expiry date from metadata (ISO string)
 */
async function handleMembershipRenewal(
  userId: string,
  renewalType: 'early' | 'standard' | '5year',
  currentExpiryIso?: string,
  paymentId?: string,
) {
  if (refundLifecycleEnabled()) {
    if (!paymentId) throw new Error('Renewal payment identity is required');
    return renewPurchasedMembership(userId, paymentId, renewalType);
  }
  console.log(`[INFO] Processing ${renewalType} renewal for user ${userId}`);

  // Find existing subscription
  const subscription = await db.subscriptions.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });

  // For early/standard renewals, subscription must exist
  if (!subscription && renewalType !== '5year') {
    console.error(`[ERROR] No subscription found for user ${userId} during ${renewalType} renewal`);
    throw new Error('No subscription found for renewal');
  }

  // Get current expiry (from metadata or database)
  let currentExpiry = subscription?.current_period_end ?? null;
  if (currentExpiryIso && currentExpiryIso !== 'none') {
    try {
      currentExpiry = new Date(currentExpiryIso);
    } catch (error) {
      console.warn(`[WARNING] Could not parse current_expiry from metadata, using database value`);
    }
  }

  // Calculate new expiry based on renewal type
  let newExpiry: Date;
  if (renewalType === 'early') {
    // Early renewal requires a current expiry date
    if (!currentExpiry) {
      console.error(`[ERROR] Early renewal requires a current expiry date for user ${userId}`);
      throw new Error('Early renewal requires a current expiry date');
    }
    newExpiry = calculateEarlyRenewalExpiry(currentExpiry);
    console.log(`[INFO] Early renewal (with bonus): ${currentExpiry.toISOString()} + 395 days = ${newExpiry.toISOString()}`);
  } else if (renewalType === 'standard') {
    // Standard renewal requires a current expiry date
    if (!currentExpiry) {
      console.error(`[ERROR] Standard renewal requires a current expiry date for user ${userId}`);
      throw new Error('Standard renewal requires a current expiry date');
    }
    newExpiry = calculateStandardRenewalExpiry(currentExpiry);
    console.log(`[INFO] Standard renewal (no bonus): ${currentExpiry.toISOString()} + 365 days = ${newExpiry.toISOString()}`);
  } else if (renewalType === '5year') {
    // 5-year renewal can handle null (defaults to today)
    newExpiry = calculate5YearRenewalExpiry(currentExpiry);
    const currentExpiryStr = currentExpiry ? currentExpiry.toISOString() : 'null (using today)';
    console.log(`[INFO] 5-year renewal: ${currentExpiryStr} + 1825 days = ${newExpiry.toISOString()}`);
  } else {
    throw new Error(`Invalid renewal type: ${renewalType}`);
  }

  // Update or create subscription
  const now = new Date();
  if (subscription) {
    // Update existing subscription with new expiry
    await db.subscriptions.update({
      where: { id: subscription.id },
      data: {
        current_period_end: newExpiry,
        status: 'ACTIVE', // Ensure status is active (in case was expired)
        updated_at: now,
      },
    });
  } else {
    // No subscription exists (Basic user upgrading via 5-year) — create one
    console.log(`[INFO] Creating new subscription for Basic user ${userId} via 5-year purchase`);
    const subscriptionId = randomBytes(12).toString('base64url');
    await db.subscriptions.create({
      data: {
        id: subscriptionId,
        user_id: userId,
        stripe_subscription_id: null,
        stripe_customer_id: null,
        payment_method: 'STRIPE',
        status: 'ACTIVE',
        current_period_start: now,
        current_period_end: newExpiry,
        created_at: now,
        updated_at: now,
      },
    });
  }

  // Ensure user status is ACTIVE and tier is PREMIUM (in case was EXPIRED)
  await db.users.update({
    where: { id: userId },
    data: {
      status: UserStatus.ACTIVE,
      membership_tier: 'PREMIUM', // Renewals always keep Premium tier
      updated_at: new Date(),
    },
  });

  // Ensure studio is ACTIVE if exists
  await db.studio_profiles.updateMany({
    where: { user_id: userId },
    data: {
      status: 'ACTIVE',
      updated_at: new Date(),
    },
  });

  console.log(`[SUCCESS] Premium membership renewed for user ${userId} until ${newExpiry.toISOString()}`);
}

/**
 * Handle failed payment attempts
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.error(`[ERROR] Processing failed payment ${paymentIntent.id}`);
  
  // Extract user_id from metadata
  const metadata = paymentIntent.metadata || {};
  const user_id = metadata.user_id;
  const user_email = metadata.user_email || metadata.email;
  
  if (!user_id) {
    console.warn(`[WARNING] No user_id in payment intent metadata - cannot process failed payment`);
    return;
  }
  
  // Find user by ID
  const user = await db.users.findUnique({
    where: { id: user_id },
  });
  
  if (!user) {
    console.warn(`[WARNING] User ${user_id} not found - cannot record failed payment`);
    return;
  }
  
  console.log(`Processing failed payment for ${user.status} user: ${user.email}`);
  
  // Check if payment already recorded
  const existingPayment = await db.payments.findUnique({
    where: { stripe_payment_intent_id: paymentIntent.id },
  });
  
  if (existingPayment) {
    console.log(`Payment ${paymentIntent.id} already recorded, updating status to FAILED`);
    await db.payments.updateMany({
      where: { id: existingPayment.id, status: 'PENDING', refunded_amount: 0 },
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
  
  console.log(`[SUCCESS] Failed payment recorded for user ${user_email}: ${paymentIntent.id}`);
  console.log(`[ANALYTICS] Payment retry count: ${user.payment_retry_count + 1}`);
  
  // TODO: Send failed payment email with retry link (Phase 4)
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  const requestTimestamp = new Date().toISOString();
  console.log(`[DEBUG ${requestTimestamp}] ========== WEBHOOK REQUEST RECEIVED ==========`);
  
  try {
    console.log('🎣 Webhook received');
    
    // Check if webhook secret is configured
    if (!webhookSecret) {
      console.error(`[DEBUG ${requestTimestamp}] ❌ ERROR: Webhook secret not configured`);
      console.error('[ERROR] Webhook secret not configured');
      return NextResponse.json(
        { error: 'Stripe webhook not configured' },
        { status: 500 }
      );
    }

    console.log(`[DEBUG ${requestTimestamp}] ✅ Webhook secret configured`);
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    console.log(`[DEBUG ${requestTimestamp}] Request headers:`, {
      'stripe-signature': signature ? 'PRESENT' : 'MISSING',
      'content-type': headersList.get('content-type'),
    });

    if (!signature) {
      console.error(`[DEBUG ${requestTimestamp}] ❌ ERROR: Missing Stripe signature`);
      console.error('[ERROR] Missing Stripe signature');
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    // Construct and verify webhook event
    let event;
    try {
      console.log(`[DEBUG ${requestTimestamp}] Constructing webhook event...`);
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log(`[DEBUG ${requestTimestamp}] ✅ Webhook verified:`);
      console.log(`[DEBUG ${requestTimestamp}]   - Event ID: ${event.id}`);
      console.log(`[DEBUG ${requestTimestamp}]   - Event type: ${event.type}`);
      console.log(`[DEBUG ${requestTimestamp}]   - Created: ${new Date(event.created * 1000).toISOString()}`);
      console.log(`[SUCCESS] Webhook verified: ${event.type} (${event.id})`);
    } catch (err) {
      console.error(`[DEBUG ${requestTimestamp}] ❌ ERROR: Webhook signature verification failed:`, err);
      console.error(`[ERROR] Webhook signature verification failed: ${err}`);
      throw err;
    }

    // Refund receipts remain durable even while lifecycle activation is paused.
    // An existing row is not proof of a settled provider outcome.
    if (isRefundEvent(event.type)) {
      const result = await ingestRefundEvent(event);
      return NextResponse.json({ received: true, reconciliation_pending: result.pending }, { status: result.pending ? 202 : 200 });
    }

    // Ensure idempotency
    console.log(`[DEBUG ${requestTimestamp}] Checking event idempotency for event ${event.id}...`);
    const shouldProcess = await ensureEventIdempotency(
      event.id,
      event.type,
      event.data.object
    );

    if (!shouldProcess) {
      console.log(`[DEBUG ${requestTimestamp}] ⚠️ Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true, skipped: true });
    }

    console.log(`[DEBUG ${requestTimestamp}] ✅ Event ${event.id} is new, proceeding with processing`);

    // Process event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const eventTimestamp = new Date().toISOString();
          console.log(`[DEBUG ${eventTimestamp}] ========== WEBHOOK EVENT: checkout.session.completed ==========`);
          console.log(`[DEBUG ${eventTimestamp}] Session ID: ${session.id}`);
          console.log(`[DEBUG ${eventTimestamp}] Session mode: ${session.mode}`);
          console.log(`[DEBUG ${eventTimestamp}] Payment status: ${session.payment_status}`);
          console.log(`[DEBUG ${eventTimestamp}] Customer: ${session.customer || 'NONE'}`);
          console.log(`[DEBUG ${eventTimestamp}] Customer email: ${session.customer_email || 'NONE'}`);
          console.log(`[DEBUG ${eventTimestamp}] Metadata:`, JSON.stringify(session.metadata || {}, null, 2));
          
          if (session.mode === 'payment') {
            console.log(`[DEBUG ${eventTimestamp}] ✅ Session is payment mode, processing...`);
            const purpose = session.metadata?.purpose;
            if (purpose === 'featured_upgrade') {
              await handleFeaturedUpgradePaymentSuccess(session);
            } else {
              await handleMembershipPaymentSuccess(session);
            }
          } else if (session.mode === 'subscription' && (session.metadata?.purpose === 'membership' || session.metadata?.purpose === 'membership_upgrade' || session.metadata?.purpose === 'switch_to_subscription')) {
            console.log(`[DEBUG ${eventTimestamp}] ✅ Session is subscription mode (${session.metadata?.purpose}), processing...`);
            await handleMembershipSubscriptionCompleted(session);
          } else {
            console.log(`[DEBUG ${eventTimestamp}] ⚠️ Session ${session.id} mode=${session.mode}, skipping`);
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.error(`💥 Payment failed event received: ${paymentIntent.id}`);
          await handlePaymentFailed(paymentIntent);
          break;
        }

        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(`[SUCCESS] Payment succeeded event received: ${paymentIntent.id}`);
          // This is handled by checkout.session.completed, but log it
          break;
        }

        case 'charge.failed': {
          const charge = event.data.object as Stripe.Charge;
          console.error(`💥 Charge failed event received: ${charge.id}`);
          // Extract payment intent and handle
          if (charge.payment_intent) {
            const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent as string);
            await handlePaymentFailed(paymentIntent);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription & SubscriptionWithPeriod;
          const dbSub = await db.subscriptions.findFirst({
            where: { stripe_subscription_id: sub.id },
            select: { id: true, user_id: true },
          });
          if (dbSub) {
            const updates: Record<string, unknown> = {
              updated_at: new Date(),
            };
            // Paid invoice/grant transactions own access dates for mapped purchases.
            const grantManaged = refundLifecycleEnabled() && !!await db.payment_benefit_grants.findFirst({ where: { subscription_id: dbSub.id }, select: { id: true } });
            if (!grantManaged && sub.current_period_end) {
              updates.current_period_end = new Date(sub.current_period_end * 1000);
            }
            if (!grantManaged && sub.current_period_start) {
              updates.current_period_start = new Date(sub.current_period_start * 1000);
            }
            await db.subscriptions.updateMany({
              where: { stripe_subscription_id: sub.id },
              data: updates,
            });
            await db.users.update({
              where: { id: dbSub.user_id },
              data: {
                auto_renew: sub.cancel_at_period_end === false,
                updated_at: new Date(),
              },
            });
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          await endStripeSubscription(sub.id);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice & { subscription?: string; billing_reason?: string };
          if (refundLifecycleEnabled() && invoice.billing_reason === 'subscription_cycle') {
            const subscriptionId = providerId(invoice.parent?.subscription_details?.subscription) ?? invoice.subscription;
            if (!subscriptionId) throw new Error('Renewal invoice subscription is unknown');
            const target = await db.subscriptions.findUnique({ where: { stripe_subscription_id: subscriptionId } });
            if (!target) throw new Error('Renewal subscription mapping is missing');
            await recordRecurringInvoice(invoice.id, await stripe.subscriptions.retrieve(subscriptionId), target.user_id);
            break;
          }
          if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
            // Renewal invoice - extend membership
            const sub = await stripe.subscriptions.retrieve(invoice.subscription) as Stripe.Subscription & SubscriptionWithPeriod;
            const dbSub = await db.subscriptions.findFirst({
              where: { stripe_subscription_id: sub.id },
            });
            if (dbSub) {
              const periodEnd = sub.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : null;
              if (periodEnd) {
                const updates: Record<string, unknown> = {
                  current_period_end: periodEnd,
                  updated_at: new Date(),
                };
                if (sub.current_period_start) {
                  updates.current_period_start = new Date(sub.current_period_start * 1000);
                }
                await db.subscriptions.updateMany({
                  where: { stripe_subscription_id: sub.id },
                  data: updates,
                });
                await db.users.update({
                  where: { id: dbSub.user_id },
                  data: { membership_tier: 'PREMIUM', updated_at: new Date() },
                });
              }
            }
          }
          break;
        }

        case 'customer.subscription.created':
        case 'invoice.payment_failed': {
          console.log(`[INFO] Subscription event ${event.type} (no action needed)`);
          break;
        }

        default:
          console.log(`[INFO] Unhandled event type: ${event.type}`);
      }

      // Mark event as processed
      await markEventProcessed(event.id, true);

      return NextResponse.json({ received: true });
    } catch (processingError) {
      console.error(`[ERROR] Error processing event ${event.id}: ${processingError}`);
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
