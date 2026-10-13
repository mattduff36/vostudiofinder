import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { refundRequestSchema, RefundError, refundActivationEnabled, refundLifecycleEnabled, REFUND_PAUSED_MESSAGE } from '@/lib/payments/refunds/contracts';
import { getRefundEligibility } from '@/lib/payments/refunds/eligibility';
import { operationSummary, prepareRefund, reconcilePaymentRefunds, submitRefundMoney } from '@/lib/payments/refunds/service';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  try { return NextResponse.json(await getRefundEligibility((await params).id)); }
  catch (error) { return failure(error); }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  if (!refundLifecycleEnabled() || !refundActivationEnabled()) return NextResponse.json({ error: REFUND_PAUSED_MESSAGE, code: 'REFUND_INITIATION_PAUSED' }, { status: 503 });
  let operationId: string | null = null;
  try {
    const parsed = refundRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid refund details', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    const operation = await prepareRefund((await params).id, session.user.id, parsed.data);
    operationId = operation.id;
    const outcome = await submitRefundMoney(operation.id);
    return NextResponse.json({ operation: operationSummary(outcome) }, { status: outcome.money_status === 'SUCCEEDED' ? 200 : 202 });
  } catch (error) { return failure(error, operationId); }
}

/** Explicit bookkeeping recovery; this method does not initiate a new refund. */
export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  if (!refundLifecycleEnabled()) return NextResponse.json({ error: REFUND_PAUSED_MESSAGE }, { status: 503 });
  try { await reconcilePaymentRefunds((await params).id); return NextResponse.json({ reconciled: true }); }
  catch (error) { return failure(error); }
}

function failure(error: unknown, operationId: string | null = null) {
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  if (error instanceof RefundError) return NextResponse.json({ error: error.message, code: error.code, operationId }, { status: error.status });
  console.error('[Refund] Request failed; operation recovery may be required', { operationId });
  return NextResponse.json({ error: operationId ? 'Refund outcome needs reconciliation. Recover this operation before starting another refund.' : 'Unable to prepare this refund.', code: 'REFUND_RECONCILIATION_REQUIRED', operationId }, { status: 502 });
}
