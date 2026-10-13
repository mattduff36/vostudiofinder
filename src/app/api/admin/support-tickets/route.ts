import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireSupportAdmin, SupportError, supportStatuses, ticketUserInclude } from '@/lib/admin/support/replies';

export async function GET(request: NextRequest) {
  try {
    await requireSupportAdmin();
    const parsed = z.object({ type: z.enum(['ISSUE', 'SUGGESTION']).optional(), status: z.enum(supportStatuses).optional(),
      category: z.string().max(200).optional(), sortBy: z.enum(['created_at', 'updated_at', 'status', 'priority']).default('created_at'),
      sortOrder: z.enum(['asc', 'desc']).default('desc') }).safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid suggestion filters' }, { status: 400 });
    const { type, status, category, sortBy, sortOrder } = parsed.data;
    const where: Prisma.support_ticketsWhereInput = { ...(type ? { type } : {}), ...(status ? { status } : {}), ...(category ? { category } : {}) };
    const [tickets, counts] = await Promise.all([
      db.support_tickets.findMany({ where, include: ticketUserInclude, orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' }] }),
      db.support_tickets.groupBy({ by: ['status', 'type'], _count: true }),
    ]);
    return NextResponse.json({ success: true, tickets, counts, total: tickets.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof SupportError ? error.message : 'Failed to fetch suggestions' },
      { status: error instanceof SupportError ? error.status : 500 });
  }
}
