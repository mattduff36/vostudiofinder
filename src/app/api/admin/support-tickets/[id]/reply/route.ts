import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { dispatchReply, getReplyOperation, prepareReply, recoverReplyStatus, replyInputSchema,
  replyOperationDto, requireSupportAdmin, SupportError, ticketUserInclude } from '@/lib/admin/support/replies';

type Context = { params: Promise<{ id: string }> };
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof SupportError ? error.message : 'Reply outcome unavailable. Keep the draft and recover the existing operation before sending again.' },
    { status: error instanceof SupportError ? error.status : 503 });
}

export async function GET(request: NextRequest, { params }: Context) {
  try {
    await requireSupportAdmin();
    const { id } = await params;
    const operationId = request.nextUrl.searchParams.get('operationId');
    if (operationId && !z.uuid().safeParse(operationId).success) return NextResponse.json({ error: 'Invalid operation ID' }, { status: 400 });
    const operation = operationId ? await getReplyOperation(id, operationId)
      : await db.support_reply_operations.findFirst({ where: { ticket_id: id }, orderBy: { created_at: 'desc' } });
    return NextResponse.json({ operation: operation ? replyOperationDto(operation) : null });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const actorId = await requireSupportAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const recovery = z.object({ action: z.literal('recover'), operationId: z.uuid() }).strict().safeParse(body);
    let operation;
    if (recovery.success) operation = await getReplyOperation(id, recovery.data.operationId);
    else {
      const parsed = replyInputSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: 'A valid reply, request key and reviewed recipient are required' }, { status: 400 });
      operation = await prepareReply(id, actorId, parsed.data);
    }
    const result = await dispatchReply(operation);
    const ticket = await db.support_tickets.findUnique({ where: { id }, include: ticketUserInclude });
    return NextResponse.json({ operation: replyOperationDto(result), ticket });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    await requireSupportAdmin();
    const { id } = await params;
    const parsed = z.object({ operationId: z.uuid() }).strict().safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'A valid reply operation ID is required' }, { status: 400 });
    await getReplyOperation(id, parsed.data.operationId);
    const result = await recoverReplyStatus(parsed.data.operationId);
    const ticket = await db.support_tickets.findUnique({ where: { id }, include: ticketUserInclude });
    return NextResponse.json({ operation: replyOperationDto(result), ticket });
  } catch (error) { return failure(error); }
}
