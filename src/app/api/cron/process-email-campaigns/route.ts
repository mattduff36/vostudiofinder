import { NextRequest, NextResponse } from 'next/server';
import { processCampaignQueue } from '@/lib/email/campaign-worker';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { return NextResponse.json({ success: true, ...await processCampaignQueue() }); }
  catch { return NextResponse.json({ error: 'Failed to process campaigns' }, { status: 500 }); }
}
