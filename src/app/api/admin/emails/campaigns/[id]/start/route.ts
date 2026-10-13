import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startCampaignSchema, startCampaign, campaignForAdmin } from '@/lib/email/campaigns';
import { emailAdminFailure } from '@/lib/email/admin-api';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const input = startCampaignSchema.parse(await request.json());
    const campaign = await startCampaign((await params).id, input);
    return NextResponse.json({ success: true, recipientCount: campaign.recipient_count, campaign: campaignForAdmin(campaign) });
  } catch (error) { return emailAdminFailure(error, 'Failed to start campaign'); }
}
