import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get dashboard statistics
    const [
      totalStudios,
      activeStudios,
      totalFaqs,
      totalUsers
    ] = await Promise.all([
      db.studio.count(),
      db.studio.count({
        where: {
          status: 'ACTIVE'
        }
      }),
      db.faq.count(),
      db.user.count()
    ]);

    const dashboardData = {
      studios: {
        total: totalStudios,
        active: activeStudios
      },
      faqs: {
        total: totalFaqs
      },
      users: {
        total: totalUsers
      }
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
