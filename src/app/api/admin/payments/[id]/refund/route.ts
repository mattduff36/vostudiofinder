import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/** Temporary containment: no money is submitted until reviewed recovery is available. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return NextResponse.json({
    error: 'Admin refunds are temporarily paused while refund processing is updated. No refund was submitted. Existing provider refunds require reconciliation before any new attempt.',
    code: 'REFUND_INITIATION_PAUSED',
  }, { status: 503 });
}
