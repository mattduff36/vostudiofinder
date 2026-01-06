import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/payments/[id]
 * Get detailed payment information including refunds and associated subscription
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    // Check admin authorization
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Get payment with all related data
    const payment = await db.payments.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            role: true,
            created_at: true,
          },
        },
        refunds: {
          orderBy: { created_at: 'desc' },
          include: {
            users_refunds_processed_byTousers: {
              select: {
                id: true,
                email: true,
                username: true,
                display_name: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Get associated subscription(s)
    let subscriptions = null;
    if (payment.user_id !== 'PENDING') {
      subscriptions = await db.subscriptions.findMany({
        where: {
          user_id: payment.user_id,
          created_at: {
            gte: payment.created_at,
            lte: new Date(payment.created_at.getTime() + 60000), // Within 1 minute of payment
          },
        },
        orderBy: { created_at: 'desc' },
      });
    }

    return NextResponse.json({
      payment,
      subscriptions,
    });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment details' },
      { status: 500 }
    );
  }
}

