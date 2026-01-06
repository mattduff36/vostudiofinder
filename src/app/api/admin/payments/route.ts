import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/admin/payments
 * List all payments with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check admin authorization
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const userId = searchParams.get('user_id');
    const search = searchParams.get('search'); // Email search

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (userId) {
      where.user_id = userId;
    }
    if (search) {
      where.users = {
        email: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }

    // Get payments with user info
    const [payments, total] = await Promise.all([
      db.payments.findMany({
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
          refunds: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      db.payments.count({ where }),
    ]);

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

