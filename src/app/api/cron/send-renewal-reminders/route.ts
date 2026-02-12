import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendTemplatedEmail } from '@/lib/email/send-templated';
import { getBaseUrl } from '@/lib/seo/site';

/**
 * Cron Job: Send Premium Renewal Reminder Emails
 *
 * Runs: Daily at 9:00 UTC
 * Purpose: Send transactional renewal reminders (30, 14, 7, 1 days before expiry)
 * These cannot be opted out of — they are service emails.
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const xCronSecret = request.headers.get('x-cron-secret');
    const isAuthorized =
      authHeader === `Bearer ${cronSecret}` || xCronSecret === cronSecret;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const baseUrl = getBaseUrl(request);
    const renewUrl = `${baseUrl}/dashboard/settings?section=membership`;
    const now = new Date();
    let totalSent = 0;
    const errors: string[] = [];

    // Windows: expiry within 29-31, 13-15, 6-8, 0-1 days from now
    const windows = [
      { daysMin: 29, daysMax: 31, templateKey: 'renewal-reminder-30', sentField: 'renewal_reminder_30_sent_at' as const },
      { daysMin: 13, daysMax: 15, templateKey: 'renewal-reminder-14', sentField: 'renewal_reminder_14_sent_at' as const },
      { daysMin: 6, daysMax: 8, templateKey: 'renewal-reminder-7', sentField: 'renewal_reminder_7_sent_at' as const },
      { daysMin: 0, daysMax: 1, templateKey: 'renewal-reminder-1', sentField: 'renewal_reminder_1_sent_at' as const },
    ];

    for (const { daysMin, daysMax, templateKey, sentField } of windows) {
      const start = new Date(now);
      start.setDate(start.getDate() + daysMin);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setDate(end.getDate() + daysMax);
      end.setHours(23, 59, 59, 999);

      const users = await db.users.findMany({
        where: {
          membership_tier: 'PREMIUM',
          [sentField]: null,
          subscriptions: {
            some: {
              current_period_end: {
                gte: start,
                lte: end,
              },
            },
          },
        },
        select: {
          id: true,
          email: true,
          display_name: true,
          subscriptions: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: { current_period_end: true },
          },
        },
      });

      for (const user of users) {
        const expiry = user.subscriptions[0]?.current_period_end;
        if (!expiry) continue;

        try {
          const expiryDateStr = expiry.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          await sendTemplatedEmail({
            to: user.email,
            templateKey,
            variables: {
              displayName: user.display_name || 'there',
              expiryDate: expiryDateStr,
              renewUrl,
            },
            skipMarketingCheck: true,
          });

          await db.users.update({
            where: { id: user.id },
            data: { [sentField]: now, updated_at: now },
          });

          totalSent++;
        } catch (err) {
          errors.push(`${user.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalSent,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Renewal reminders error:', error);
    return NextResponse.json(
      {
        error: 'Renewal reminders failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
