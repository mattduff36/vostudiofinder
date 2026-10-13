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
import { cancelCampaign, campaignForAdmin } from '@/lib/email/campaigns';
import { emailAdminFailure } from '@/lib/email/admin-api';

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
      skipped: deliveryStats.find(s => s.status === 'SKIPPED')?._count || 0,
      uncertain: deliveryStats.find(s => s.status === 'UNCERTAIN')?._count || 0,
      retryable: await db.email_deliveries.count({ where: {
        campaign_id: id, status: 'FAILED', retryable: true, resend_id: null,
        attempt_count: { lt: campaign.max_retries + 1 },
        OR: [{ next_attempt_at: null }, { next_attempt_at: { lte: new Date() } }],
      } }),
    };

    return NextResponse.json({ campaign: { ...campaignForAdmin(campaign), created_by: campaign.created_by, template: campaign.template }, deliveryStats: stats });
  } catch (error) { return emailAdminFailure(error, 'Failed to fetch campaign'); }
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

    const campaign = await cancelCampaign(id);
    return NextResponse.json({ success: true, campaign: campaignForAdmin(campaign) });
  } catch (error) { return emailAdminFailure(error, 'Failed to cancel campaign'); }
}
