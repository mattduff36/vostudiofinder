import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserStatus } from '@prisma/client';
import { sendTemplatedEmail } from '@/lib/email/send-templated';
import { getBaseUrl } from '@/lib/seo/site';

/**
 * Cron Job: Expire Username Reservations
 * 
 * Runs: Daily at 02:00 UTC
 * Purpose: Mark PENDING users as EXPIRED if their reservation has passed
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-reservations",
 *     "schedule": "0 2 * * *"
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

    console.log('🕐 [CRON] Starting reservation expiry job...');

    const baseUrl = getBaseUrl(request);
    const now = new Date();

    // Find all PENDING users with expired reservations
    const expiredUsers = await db.users.findMany({
      where: {
        status: UserStatus.PENDING,
        reservation_expires_at: {
          lt: now, // Less than current time
        },
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

    console.log(`📊 [CRON] Found ${expiredUsers.length} expired reservations`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const user of expiredUsers) {
      try {
        // Mark user as EXPIRED and clear username (unique constraint)
        const expiredUsername = `expired_${user.username}_${Date.now()}_${user.id.substring(0, 4)}`;
        await db.users.update({
          where: { id: user.id },
          data: {
            status: UserStatus.EXPIRED,
            username: expiredUsername, // Free up username for reuse
            updated_at: now,
          },
        });

        console.log(`✅ [CRON] Expired: ${user.username} → ${expiredUsername} (${user.email})`);

        // Send expiration notification email
        try {
          await sendTemplatedEmail({
            to: user.email,
            templateKey: 'reservation-expired',
            variables: {
              displayName: user.display_name,
              username: user.username,
              signupUrl: `${baseUrl}/auth/signup`,
            },
          });

          console.log(`📧 [CRON] Expiration email sent to ${user.email}`);
        } catch (emailError) {
          console.error(`⚠️  [CRON] Failed to send email to ${user.email}:`, emailError);
          // Don't fail the job if email fails
        }

        successCount++;
      } catch (error) {
        console.error(`❌ [CRON] Error expiring user ${user.id}:`, error);
        errors.push(`${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    // Optional: Clean up very old EXPIRED users (e.g., 30+ days old)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedCount = await db.users.deleteMany({
      where: {
        status: UserStatus.EXPIRED,
        updated_at: {
          lt: thirtyDaysAgo,
        },
      },
    });

    console.log(`🗑️  [CRON] Deleted ${deletedCount.count} old EXPIRED users (30+ days)`);

    console.log(`✅ [CRON] Reservation expiry job complete:`, {
      found: expiredUsers.length,
      expired: successCount,
      errors: errorCount,
      deleted: deletedCount.count,
    });

    return NextResponse.json({
      success: true,
      processed: expiredUsers.length,
      expired: successCount,
      errors: errorCount,
      deleted: deletedCount.count,
      errorMessages: errors,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('❌ [CRON] Reservation expiry job failed:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

