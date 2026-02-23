/**
 * GET /api/admin/emails/campaigns/[id]
 * Get a single campaign with delivery stats
 *
 * PATCH /api/admin/emails/campaigns/[id]
 * Cancel a campaign (set status to CANCELLED)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const campaign = await db.email_campaigns.findUnique({
      where: { id },
      include: {
        created_by: {
          select: {
            display_name: true,
            email: true,
          },
        },
        template: {
          select: {
            key: true,
            name: true,
            is_marketing: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const deliveryStats = await db.email_deliveries.groupBy({
      by: ['status'],
      where: { campaign_id: campaign.id },
      _count: true,
    });

    const stats = {
      pending: deliveryStats.find(s => s.status === 'PENDING')?._count || 0,
      sending: deliveryStats.find(s => s.status === 'SENDING')?._count || 0,
      sent: deliveryStats.find(s => s.status === 'SENT')?._count || 0,
      failed: deliveryStats.find(s => s.status === 'FAILED')?._count || 0,
      bounced: deliveryStats.find(s => s.status === 'BOUNCED')?._count || 0,
    };

    return NextResponse.json({ campaign, deliveryStats: stats });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const campaign = await db.email_campaigns.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status === 'SENT' || campaign.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Campaign cannot be cancelled in its current state' },
        { status: 400 }
      );
    }

    await db.email_campaigns.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        completed_at: new Date(),
      },
    });

    if (campaign.status === 'SENDING') {
      await db.email_deliveries.updateMany({
        where: {
          campaign_id: id,
          status: 'PENDING',
        },
        data: {
          status: 'FAILED',
          failed_at: new Date(),
          error_message: 'Campaign cancelled',
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling campaign:', error);
    return NextResponse.json(
      { error: 'Failed to cancel campaign' },
      { status: 500 }
    );
  }
}
