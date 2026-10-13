import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { applyRefundBenefit } from '@/lib/payments/refunds/access-effects';
import { getRefundOperation, operationSummary, reconcileRefundBilling, submitRefundMoney } from '@/lib/payments/refunds/service';
import { dispatchRefundNotification } from '@/lib/payments/refunds/notifications';
import { RefundError, refundLifecycleEnabled } from '@/lib/payments/refunds/contracts';

interface Context { params: Promise<{ id: string }> }
export async function GET(_request: NextRequest, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  try { return NextResponse.json({ operation: operationSummary(await getRefundOperation((await params).id)) }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: NextRequest, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  if (!refundLifecycleEnabled()) return NextResponse.json({ error: 'Refund recovery is not activated.' }, { status: 503 });
  try {
    const parsed = z.object({ action: z.enum(['reconcile_money', 'apply_benefit', 'reconcile_billing', 'reconcile_notification']) }).strict().safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Choose a supported recovery action' }, { status: 400 });
    const { id } = await params;
    if (parsed.data.action === 'reconcile_money') await submitRefundMoney(id);
    if (parsed.data.action === 'apply_benefit') await applyRefundBenefit(id);
    if (parsed.data.action === 'reconcile_billing') await reconcileRefundBilling(id);
    if (parsed.data.action === 'reconcile_notification') await dispatchRefundNotification(id);
    return NextResponse.json({ operation: operationSummary(await getRefundOperation(id)) });
  } catch (error) { return errorResponse(error); }
}
function errorResponse(error: unknown) {
  if (error instanceof RefundError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  return NextResponse.json({ error: 'The operation still needs reconciliation. Recover the same operation before starting another.' }, { status: 502 });
}
