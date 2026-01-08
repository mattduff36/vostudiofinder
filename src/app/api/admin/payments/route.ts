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
    
    // Handle email search - need to find user IDs first if searching by email
    if (search) {
      const users = await db.users.findMany({
        where: {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      const userIdsForSearch = users.map(u => u.id);
      if (userIdsForSearch.length === 0) {
        // No users found with this email, return empty results
        return NextResponse.json({
          payments: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
      // If userId is also provided, intersect the arrays
      if (userId) {
        if (userIdsForSearch.includes(userId)) {
          where.user_id = userId;
        } else {
          // User ID doesn't match search, return empty
          return NextResponse.json({
            payments: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          });
        }
      } else {
        where.user_id = { in: userIdsForSearch };
      }
    } else if (userId) {
      where.user_id = userId;
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
          refunds: {
            include: {
              users_refunds_processed_byTousers: {
                select: {
                  id: true,
                  email: true,
                  display_name: true,
                },
              },
            },
          },
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

