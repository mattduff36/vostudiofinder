import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { nextTicketVersion, requireSupportAdmin, statusFields, SupportError, supportStatuses, ticketUserInclude } from '@/lib/admin/support/replies';

type Context = { params: Promise<{ id: string }> };
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof SupportError ? error.message : 'The suggestion could not be updated. Please retry.' },
    { status: error instanceof SupportError ? error.status : 500 });
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    await requireSupportAdmin();
    const { id } = await params;
    const parsed = z.object({ status: z.enum(supportStatuses).optional(), priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      assigned_to: z.string().min(1).max(200).nullable().optional() }).strict().refine(value => Object.keys(value).length > 0).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid suggestion update' }, { status: 400 });
    const ticket = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM support_tickets WHERE id = ${id} FOR UPDATE`;
      const current = await tx.support_tickets.findUnique({ where: { id } });
      if (!current) throw new SupportError(404, 'Suggestion not found');
      const now = nextTicketVersion(current.updated_at);
      return tx.support_tickets.update({ where: { id }, data: {
        updated_at: now,
        ...(parsed.data.status ? statusFields(parsed.data.status, now) : {}),
        ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
        ...(parsed.data.assigned_to !== undefined ? { assigned_to: parsed.data.assigned_to } : {}),
      }, include: ticketUserInclude });
    });
    return NextResponse.json({ success: true, ticket });
  } catch (error) { return failure(error); }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    await requireSupportAdmin();
    const { id } = await params;
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM support_tickets WHERE id = ${id} FOR UPDATE`;
      if (!await tx.support_tickets.findUnique({ where: { id }, select: { id: true } })) throw new SupportError(404, 'Suggestion not found');
      const pending = await tx.support_reply_operations.findFirst({ where: { ticket_id: id, provider_status: { in: ['PREPARED', 'SUBMITTING', 'UNKNOWN', 'REVIEW_REQUIRED'] } }, select: { id: true } });
      if (pending) throw new SupportError(409, 'Recover the pending reply before deleting this suggestion');
      await tx.support_tickets.delete({ where: { id } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return failure(error); }
}
