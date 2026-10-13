import { NextRequest, NextResponse } from 'next/server';
import { reconcileRefundQueue } from '@/lib/payments/refunds/worker';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { return NextResponse.json(await reconcileRefundQueue()); }
  catch { return NextResponse.json({ error: 'Refund reconciliation needs review' }, { status: 500 }); }
}
