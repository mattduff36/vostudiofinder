import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { UserStatus } from '@prisma/client';

/**
 * GET /api/admin/reservations
 * List all pending/expired user reservations
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check admin authorization
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as UserStatus | null;
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {};

    // Status filter
    const statusFilter = status
      ? { status }
      : {
          status: {
            in: [UserStatus.PENDING, UserStatus.EXPIRED],
          },
        };

    // Search filter
    const searchFilter = search
      ? {
          OR: [
            {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              username: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {};

    // Combine filters properly with AND logic
    if (search) {
      where.AND = [statusFilter, searchFilter];
    } else {
      Object.assign(where, statusFilter);
    }

    // Get users with payment counts
    const users = await db.users.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        status: true,
        reservation_expires_at: true,
        payment_attempted_at: true,
        payment_retry_count: true,
        created_at: true,
        _count: {
          select: {
            payments: true,
          },
        },
      },
      orderBy: [
        { reservation_expires_at: 'asc' }, // Expiring soon first
        { created_at: 'desc' },
      ],
    });

    // Calculate stats
    const now = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const stats = {
      pending: await db.users.count({
        where: { status: UserStatus.PENDING },
      }),
      expiringSoon: await db.users.count({
        where: {
          status: UserStatus.PENDING,
          reservation_expires_at: {
            lte: twoDaysFromNow,
            gte: now,
          },
        },
      }),
      failedPayments: await db.users.count({
        where: {
          status: UserStatus.PENDING,
          payment_retry_count: {
            gte: 1,
          },
        },
      }),
      expired: await db.users.count({
        where: { status: UserStatus.EXPIRED },
      }),
    };

    return NextResponse.json({
      users,
      stats,
    });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}

