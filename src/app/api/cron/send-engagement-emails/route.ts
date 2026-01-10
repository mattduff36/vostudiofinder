import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserStatus } from '@prisma/client';
import { sendEmail } from '@/lib/email/email-service';
import { 
  reservationReminderDay2Template,
  reservationUrgencyDay5Template,
  paymentFailedReservationTemplate
} from '@/lib/email/templates/username-reservation';
import { getBaseUrl } from '@/lib/seo/site';

/**
 * Cron Job: Send Re-engagement Emails
 * 
 * Runs: Every hour
 * Purpose: Send reminder emails to PENDING users
 * 
 * Email Schedule:
 * - Day 2: "Complete your signup" reminder
 * - Day 5: "Only 2 days left" urgency email
 * - Failed payment: Immediate email with retry link
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/send-engagement-emails",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (REQUIRED security measure)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // CRITICAL: Always require CRON_SECRET to be configured
    if (!cronSecret) {
      console.error('❌ [CRON] CRON_SECRET environment variable not configured');
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    // CRITICAL: Always verify the secret matches
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ [CRON] Unauthorized attempt to access cron endpoint');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('📧 [CRON] Starting re-engagement email job...');

    const baseUrl = getBaseUrl(request);
    const now = new Date();
    let totalSent = 0;
    let totalErrors = 0;
    const errors: string[] = [];

    // Calculate target dates (with 1-hour buffer to avoid sending multiple times)
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 1); // 47-49 hours ago

    const twoDaysAgoPlus1Hour = new Date(twoDaysAgo);
    twoDaysAgoPlus1Hour.setHours(twoDaysAgoPlus1Hour.getHours() + 1); // 1-hour window

    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    fiveDaysAgo.setHours(fiveDaysAgo.getHours() - 1); // 119-121 hours ago

    const fiveDaysAgoPlus1Hour = new Date(fiveDaysAgo);
    fiveDaysAgoPlus1Hour.setHours(fiveDaysAgoPlus1Hour.getHours() + 1); // 1-hour window

    // ==========================================
    // 1. DAY 2 REMINDERS
    // ==========================================
    console.log('📨 [CRON] Finding Day 2 reminder candidates...');

    const day2Users = await db.users.findMany({
      where: {
        status: UserStatus.PENDING,
        reservation_expires_at: {
          gte: now, // Not expired
        },
        created_at: {
          gte: twoDaysAgo,
          lte: twoDaysAgoPlus1Hour,
        },
        payment_attempted_at: null, // Haven't attempted payment yet
        day2_reminder_sent_at: null, // Haven't sent Day 2 reminder yet
      },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        reservation_expires_at: true,
        created_at: true,
      },
    });

    console.log(`📊 [CRON] Found ${day2Users.length} Day 2 candidates`);

    for (const user of day2Users) {
      try {
        if (!user.reservation_expires_at) continue;

        const daysRemaining = Math.ceil(
          (user.reservation_expires_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        await sendEmail({
          to: user.email,
          subject: `Complete Your Signup - @${user.username} is Reserved for You`,
          html: reservationReminderDay2Template({
            displayName: user.display_name,
            username: user.username,
            reservationExpiresAt: user.reservation_expires_at.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }),
            daysRemaining,
            signupUrl: `${baseUrl}/api/auth/retry-payment?userId=${user.id}`,
          }),
        });

        // Mark Day 2 reminder as sent to prevent duplicates
        await db.users.update({
          where: { id: user.id },
          data: { day2_reminder_sent_at: now },
        });

        console.log(`✅ [CRON] Day 2 email sent to ${user.email}`);
        totalSent++;
      } catch (error) {
        console.error(`❌ [CRON] Failed to send Day 2 email to ${user.email}:`, error);
        errors.push(`Day 2 - ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        totalErrors++;
      }
    }

    // ==========================================
    // 2. DAY 5 URGENCY EMAILS
    // ==========================================
    console.log('📨 [CRON] Finding Day 5 urgency candidates...');

    const day5Users = await db.users.findMany({
      where: {
        status: UserStatus.PENDING,
        reservation_expires_at: {
          gte: now, // Not expired
        },
        created_at: {
          gte: fiveDaysAgo,
          lte: fiveDaysAgoPlus1Hour,
        },
        day5_reminder_sent_at: null, // Haven't sent Day 5 reminder yet
      },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        reservation_expires_at: true,
        payment_retry_count: true,
      },
    });

    console.log(`📊 [CRON] Found ${day5Users.length} Day 5 candidates`);

    for (const user of day5Users) {
      try {
        if (!user.reservation_expires_at) continue;

        const daysRemaining = Math.ceil(
          (user.reservation_expires_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        await sendEmail({
          to: user.email,
          subject: `⏰ Only ${daysRemaining} Days Left to Claim @${user.username}`,
          html: reservationUrgencyDay5Template({
            displayName: user.display_name,
            username: user.username,
            reservationExpiresAt: user.reservation_expires_at.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }),
            daysRemaining,
            signupUrl: `${baseUrl}/api/auth/retry-payment?userId=${user.id}`,
          }),
        });

        // Mark Day 5 reminder as sent to prevent duplicates
        await db.users.update({
          where: { id: user.id },
          data: { day5_reminder_sent_at: now },
        });

        console.log(`✅ [CRON] Day 5 urgency email sent to ${user.email}`);
        totalSent++;
      } catch (error) {
        console.error(`❌ [CRON] Failed to send Day 5 email to ${user.email}:`, error);
        errors.push(`Day 5 - ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        totalErrors++;
      }
    }

    // ==========================================
    // 3. FAILED PAYMENT FOLLOW-UPS
    // ==========================================
    console.log('📨 [CRON] Finding failed payment follow-up candidates...');

    // Find users who had a failed payment in the last 24 hours and haven't been sent a retry email
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const failedPaymentUsers = await db.users.findMany({
      where: {
        status: UserStatus.PENDING,
        reservation_expires_at: {
          gte: now, // Not expired
        },
        // NOTE: Don't filter by payment_attempted_at here!
        // payment_attempted_at stores the FIRST attempt timestamp (preserved across retries)
        // We need to find users with recent failed payments, not just recent first attempts
        // The payments.created_at filter below handles finding recent failures
        payment_retry_count: {
          gte: 1, // At least one failed attempt
        },
        failed_payment_email_sent_at: null, // Haven't sent failed payment email yet
      },
      include: {
        payments: {
          where: {
            status: 'FAILED',
            created_at: {
              gte: oneDayAgo, // This correctly finds recent failed payment attempts
            },
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 1,
        },
      },
    });

    console.log(`📊 [CRON] Found ${failedPaymentUsers.length} failed payment candidates`);

    for (const user of failedPaymentUsers) {
      try {
        if (!user.reservation_expires_at || user.payments.length === 0) continue;

        const failedPayment = user.payments[0];
        if (!failedPayment) continue; // TypeScript safety check
        
        const metadata = failedPayment.metadata as any;
        const errorMessage = metadata?.error || 'Payment was declined';

        // Use actual payment amount and currency from failed payment
        const amount = (failedPayment.amount / 100).toFixed(2);
        const currency = failedPayment.currency.toUpperCase();

        await sendEmail({
          to: user.email,
          subject: `Payment Issue - Complete Your Signup to Claim @${user.username}`,
          html: paymentFailedReservationTemplate({
            displayName: user.display_name,
            username: user.username,
            amount,
            currency,
            errorMessage,
            reservationExpiresAt: user.reservation_expires_at.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }),
            retryUrl: `${baseUrl}/api/auth/retry-payment?userId=${user.id}`,
          }),
        });

        // Mark failed payment email as sent to prevent duplicates
        await db.users.update({
          where: { id: user.id },
          data: { failed_payment_email_sent_at: now },
        });

        console.log(`✅ [CRON] Failed payment email sent to ${user.email}`);
        totalSent++;
      } catch (error) {
        console.error(`❌ [CRON] Failed to send payment retry email to ${user.email}:`, error);
        errors.push(`Failed Payment - ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        totalErrors++;
      }
    }

    console.log(`✅ [CRON] Re-engagement email job complete:`, {
      day2Sent: day2Users.length,
      day5Sent: day5Users.length,
      failedPaymentSent: failedPaymentUsers.length,
      totalSent,
      totalErrors,
    });

    return NextResponse.json({
      success: true,
      sent: totalSent,
      errors: totalErrors,
      breakdown: {
        day2: day2Users.length,
        day5: day5Users.length,
        failedPayment: failedPaymentUsers.length,
      },
      errorMessages: errors,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('❌ [CRON] Re-engagement email job failed:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

