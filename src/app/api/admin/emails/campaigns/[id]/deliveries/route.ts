/**
 * GET /api/admin/emails/campaigns/[id]/deliveries
 * List delivery records for a campaign with pagination and status filter
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { emailAdminFailure } from '@/lib/email/admin-api';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const { status, page, limit } = z.object({
      status: z.enum(['PENDING', 'SENDING', 'SENT', 'FAILED', 'BOUNCED', 'SKIPPED', 'UNCERTAIN']).optional(),
      page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(200).default(50),
    }).strict().parse(Object.fromEntries(searchParams));

    const campaign = await db.email_campaigns.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const where: Prisma.email_deliveriesWhereInput = {
      campaign_id: id,
    };

    if (status) {
      where.status = status;
    }

    const [deliveries, total] = await Promise.all([
      db.email_deliveries.findMany({
        where,
        select: {
          id: true, to_email: true, status: true, resend_id: true, error_message: true,
          sent_at: true, failed_at: true, opened_at: true, clicked_at: true, created_at: true,
          outcome_reason: true, attempt_count: true, retryable: true, next_attempt_at: true,
          user: {
            select: {
              display_name: true,
              username: true,
            },
          },
        },
        orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.email_deliveries.count({ where }),
    ]);

    return NextResponse.json({
      deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return emailAdminFailure(error, 'Failed to fetch deliveries');
  }
}
