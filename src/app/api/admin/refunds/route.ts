import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { z } from 'zod';

const refundSchema = z.object({
  paymentIntentId: z.string(),
  amount: z.number().positive().optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
  refundApplicationFee: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentIntentId, amount, reason, refundApplicationFee } = refundSchema.parse(body);

    // Create refund in Stripe
    const refundParams: any = {
      payment_intent: paymentIntentId,
      metadata: {
        admin_user_id: session.user.id,
        processed_at: new Date().toISOString(),
      },
    };

    // Only include amount if specified (otherwise refunds full amount)
    if (amount !== undefined) {
      refundParams.amount = amount;
    }
    
    if (reason !== undefined) {
      refundParams.reason = reason;
    }
    
    if (refundApplicationFee !== undefined) {
      refundParams.refund_application_fee = refundApplicationFee;
    }

    const refund = await stripe.refunds.create(refundParams);

    // Log the refund in our database
    await db.refund.create({
      data: {
        stripeRefundId: refund.id,
        stripePaymentIntentId: paymentIntentId,
        amount: refund.amount,
        currency: refund.currency,
        reason: reason || 'requested_by_customer',
        status: (refund.status || 'PENDING').toUpperCase() as any,
        processedBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error('Refund processing error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [refunds, totalCount] = await Promise.all([
      db.refund.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          processedByUser: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      }),
      db.refund.count(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      refunds,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching refunds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch refunds' },
      { status: 500 }
    );
  }
}
