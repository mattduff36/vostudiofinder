import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/error-logging';
import { isFreeSignupPromoActive } from '@/lib/promo';
import { UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

/**
 * Activate a free promo membership
 * This endpoint is only available when the promo is active (NEXT_PUBLIC_PROMO_FREE_SIGNUP=true)
 * It activates the user's membership without requiring payment
 */
export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Check if promo is active
    if (!isFreeSignupPromoActive()) {
      console.error('[ERROR] Promo membership activation attempted while promo is not active');
      return NextResponse.json(
        { error: 'This promotion is no longer available' },
        { status: 403 }
      );
    }

    const { email, name, username, userId } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify the user exists and is in PENDING status
    console.log(`🎁 Activating promo membership for user: ${userId} (${email})`);
    
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        email_verified: true,
        status: true,
        display_name: true,
      },
    });

    if (!user) {
      console.error(`[ERROR] User not found: ${userId}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already active
    if (user.status === UserStatus.ACTIVE) {
      console.log(`[INFO] User ${userId} is already active, redirecting to dashboard`);
      return NextResponse.json({
        success: true,
        message: 'Membership already active',
        alreadyActive: true,
      });
    }

    // Verify email is verified
    if (!user.email_verified) {
      console.error(`[ERROR] Email not verified for user: ${userId} (${email})`);
      return NextResponse.json(
        { error: 'Email must be verified before activation', verified: false },
        { status: 403 }
      );
    }

    const now = new Date();
    
    // Calculate membership expiry (1 year from now)
    const expiryDate = new Date(now);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Generate IDs for new records
    const paymentId = randomBytes(12).toString('base64url');
    const subscriptionId = randomBytes(12).toString('base64url');

    // Activate the membership (same pattern as grantMembership in webhook)
    await db.users.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        // Reset payment tracking fields
        payment_attempted_at: now,
        payment_retry_count: 0,
        day2_reminder_sent_at: null,
        day5_reminder_sent_at: null,
        failed_payment_email_sent_at: null,
        updated_at: now,
      },
    });
    console.log(`[SUCCESS] User ${userId} status updated: PENDING → ACTIVE`);

    // Create subscription record (same pattern as grantMembership)
    await db.subscriptions.create({
      data: {
        id: subscriptionId,
        user_id: userId,
        status: 'ACTIVE',
        payment_method: 'STRIPE', // Keep consistency, though no actual Stripe payment
        current_period_start: now,
        current_period_end: expiryDate,
        created_at: now,
        updated_at: now,
      },
    });
    console.log(`[SUCCESS] Subscription created for user ${userId}, expires: ${expiryDate.toISOString()}`);

    // Create a £0 payment record for audit trail
    await db.payments.create({
      data: {
        id: paymentId,
        user_id: userId,
        stripe_checkout_session_id: null,
        stripe_payment_intent_id: null,
        stripe_charge_id: null,
        amount: 0, // £0 promo
        currency: 'gbp',
        status: 'SUCCEEDED',
        refunded_amount: 0,
        metadata: {
          promo_type: 'free_signup_flash_sale',
          activated_at: now.toISOString(),
          user_email: email,
          user_name: name,
          user_username: username || null,
          source: 'promo_activation_api',
        },
        created_at: now,
        updated_at: now,
      },
    });
    console.log(`[SUCCESS] Promo payment record created: ${paymentId}`);

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
      console.log(`[SUCCESS] Studio profile activated for user ${userId}`);
    }

    console.log(`[SUCCESS] Promo membership fully activated for user ${userId} (${email})`);
    console.log(`[INFO] Membership expires: ${expiryDate.toISOString()}`);

    return NextResponse.json({
      success: true,
      message: 'Promo membership activated successfully',
      membershipExpiresAt: expiryDate.toISOString(),
    });
  } catch (error) {
    console.error('Promo activation error:', error);
    handleApiError(error, 'Promo membership activation failed');
    
    return NextResponse.json(
      { error: 'Failed to activate promo membership' },
      { status: 500 }
    );
  }
}
