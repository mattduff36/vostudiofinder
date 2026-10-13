import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { createCampaignSchema, createCampaign, campaignForAdmin } from '@/lib/email/campaigns';
import { emailAdminFailure } from '@/lib/email/admin-api';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const records = await db.email_campaigns.findMany({ orderBy: [{ created_at: 'desc' }, { id: 'asc' }], include: {
      created_by: { select: { display_name: true, email: true } },
      template: { select: { name: true, is_marketing: true } }, _count: { select: { deliveries: true } },
    } });
    const campaigns = records.map(record => ({ ...campaignForAdmin(record), created_by: record.created_by, template: record.template, _count: record._count }));
    return NextResponse.json({ campaigns });
  } catch (error) { return emailAdminFailure(error, 'Failed to fetch campaigns'); }
}
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const input = createCampaignSchema.parse(await request.json());
    const campaign = await createCampaign(input, session.user.id);
    return NextResponse.json({ success: true, campaign: campaignForAdmin(campaign) });
  } catch (error) { return emailAdminFailure(error, 'Failed to create campaign'); }
}
