/**
 * POST /api/admin/emails/campaigns/[id]/retry
 * Reset all FAILED deliveries back to PENDING and resume the campaign.
 * Accepts optional { autoRetry: boolean } to enable automatic 24h retries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    let autoRetry = false;
    let maxRetries = 3;
    try {
      const body = await request.json();
      autoRetry = body.autoRetry === true;
      if (typeof body.maxRetries === 'number' && body.maxRetries >= 1 && body.maxRetries <= 50) {
        maxRetries = body.maxRetries;
      }
    } catch {
      // No body or invalid JSON — defaults apply
    }

    const campaign = await db.email_campaigns.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status === 'SENDING') {
      return NextResponse.json(
        { error: 'Campaign is already sending' },
        { status: 400 }
      );
    }

    const failedCount = await db.email_deliveries.count({
      where: { campaign_id: id, status: 'FAILED' },
    });

    if (failedCount === 0) {
      return NextResponse.json(
        { error: 'No failed deliveries to retry' },
        { status: 400 }
      );
    }

    await db.email_deliveries.updateMany({
      where: {
        campaign_id: id,
        status: 'FAILED',
      },
      data: {
        status: 'PENDING',
        failed_at: null,
        error_message: null,
      },
    });

    await db.email_campaigns.update({
      where: { id },
      data: {
        status: 'SENDING',
        completed_at: null,
        auto_retry: autoRetry,
        max_retries: maxRetries,
        retry_count: 0,
        retry_after: null,
      },
    });

    console.log(`🔄 Retrying ${failedCount} failed deliveries for campaign: ${campaign.name} (auto_retry=${autoRetry})`);

    return NextResponse.json({
      success: true,
      retriedCount: failedCount,
      autoRetry,
      maxRetries,
    });
  } catch (error) {
    console.error('Error retrying campaign:', error);
    return NextResponse.json(
      { error: 'Failed to retry campaign' },
      { status: 500 }
    );
  }
}
