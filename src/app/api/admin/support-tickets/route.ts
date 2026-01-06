import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check admin authorization
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await db.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // ISSUE or SUGGESTION
    const status = searchParams.get('status'); // OPEN, IN_PROGRESS, RESOLVED, CLOSED
    const category = searchParams.get('category');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (category) where.category = category;

    // Fetch tickets
    const tickets = await db.support_tickets.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    // Get counts by status and type
    const counts = await db.support_tickets.groupBy({
      by: ['status', 'type'],
      _count: true,
    });

    return NextResponse.json({
      success: true,
      tickets,
      counts,
      total: tickets.length,
    });

  } catch (error) {
    logger.error('Error fetching support tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
}

