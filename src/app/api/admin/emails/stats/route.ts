/**
 * GET /api/admin/emails/stats
 * Dashboard stats: campaign count, sent today, opt-in user count
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [campaignCount, sentToday, totalUsers, optedOutCount] = await Promise.all([
      db.email_campaigns.count(),
      db.email_deliveries.count({
        where: {
          status: 'SENT',
          sent_at: { gte: todayStart },
        },
      }),
      db.users.count(),
      db.email_preferences.count({
        where: {
          OR: [
            { marketing_opt_in: false },
            { unsubscribed_at: { not: null } },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      campaigns: campaignCount,
      sentToday,
      optInUsers: totalUsers - optedOutCount,
    });
  } catch (error) {
    console.error('Error fetching email stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
