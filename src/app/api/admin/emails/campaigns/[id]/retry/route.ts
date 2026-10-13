import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { retryCampaignSchema, retryCampaign } from '@/lib/email/campaigns';
import { emailAdminFailure } from '@/lib/email/admin-api';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const input = retryCampaignSchema.parse(await request.json());
    return NextResponse.json({ success: true, ...await retryCampaign((await params).id, input) });
  } catch (error) { return emailAdminFailure(error, 'Failed to retry campaign'); }
}
