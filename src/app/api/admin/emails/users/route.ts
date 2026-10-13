import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseRecipientQuery, buildRecipientWhere } from '@/lib/email/recipients';
import { emailAdminFailure } from '@/lib/email/admin-api';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { filters, page, limit } = parseRecipientQuery(request.nextUrl.searchParams);
    const where = buildRecipientWhere({ mode: 'filters', filters });
    const [users, total] = await db.$transaction([
      db.users.findMany({ where, select: {
        id: true, email: true, username: true, display_name: true, email_verified: true,
        status: true, created_at: true, last_login: true,
        studio_profiles: { select: { id: true, name: true, is_featured: true, is_verified: true } },
        email_preferences: { select: { marketing_opt_in: true, unsubscribed_at: true } },
      }, orderBy: [{ created_at: 'desc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
      db.users.count({ where }),
    ], { isolationLevel: 'RepeatableRead' });
    return NextResponse.json({ users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { return emailAdminFailure(error, 'Failed to fetch users'); }
}

/** Count selected IDs inside a filter without sending ID/address lists in URLs. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { z } = await import('zod');
    const { recipientFiltersSchema, MAX_CAMPAIGN_RECIPIENTS } = await import('@/lib/email/recipients');
    const input = z.object({ userIds: z.array(z.string().min(1).max(100)).max(MAX_CAMPAIGN_RECIPIENTS), filters: recipientFiltersSchema }).strict().parse(await request.json());
    const matchingCount = await db.users.count({ where: { AND: [buildRecipientWhere({ mode: 'filters', filters: input.filters }), { id: { in: input.userIds } }] } });
    return NextResponse.json({ matchingCount });
  } catch (error) { return emailAdminFailure(error, 'Failed to check selected users'); }
}
