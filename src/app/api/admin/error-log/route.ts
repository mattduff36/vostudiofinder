import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth-guards';
import { Prisma, Role, type ErrorLogStatus } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { effectiveStatusSql, triageJoinSql, projectTriage } from '@/lib/admin/error-log/triage';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(['ALL', 'OPEN', 'RESOLVED', 'IGNORED']).default('ALL'),
  level: z.enum(['ALL', 'fatal', 'error', 'warning', 'info', 'debug']).default('ALL'),
  search: z.string().max(500).default(''),
  dateFrom: z.iso.datetime({ offset: true }).optional(),
  dateTo: z.iso.datetime({ offset: true }).optional(),
  sortBy: z.enum(['last_seen_at', 'event_count', 'first_seen_at']).default('last_seen_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

function failure(error: unknown, message: string) {
  const status = error instanceof Error && error.message === 'Unauthorized' ? 401
    : error instanceof Error && error.message === 'Insufficient permissions' ? 403 : 500;
  return NextResponse.json({ error: status === 500 ? message : status === 401 ? 'Unauthorized' : 'Insufficient permissions' }, { status });
}

interface ErrorRow {
  id: string; sentry_issue_id: string; title: string; level: string; status: ErrorLogStatus;
  source_status: ErrorLogStatus; local_status: ErrorLogStatus | null; decided_at: Date | null;
  first_seen_at: Date; last_seen_at: Date; event_count: number; environment: string | null;
  release: string | null; last_event_id: string | null; created_at: Date; updated_at: Date;
}

export async function GET(request: NextRequest) {
  try {
    await requireApiRole(Role.ADMIN);
    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid error-log query' }, { status: 400 });
    const q = parsed.data;
    if (q.dateFrom && q.dateTo && new Date(q.dateFrom) > new Date(q.dateTo)) {
      return NextResponse.json({ error: 'dateFrom must not follow dateTo' }, { status: 400 });
    }
    const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (q.status !== 'ALL') conditions.push(Prisma.sql`${effectiveStatusSql} = ${q.status}::"ErrorLogStatus"`);
    if (q.level !== 'ALL') conditions.push(Prisma.sql`g.level = ${q.level}`);
    if (q.search) conditions.push(Prisma.sql`POSITION(LOWER(${q.search}) IN LOWER(g.title)) > 0`);
    if (q.dateFrom) conditions.push(Prisma.sql`g.last_seen_at >= ${new Date(q.dateFrom)}`);
    if (q.dateTo) conditions.push(Prisma.sql`g.last_seen_at <= ${new Date(q.dateTo)}`);
    const where = Prisma.join(conditions, ' AND ');
    const sort = { last_seen_at: Prisma.sql`g.last_seen_at`, first_seen_at: Prisma.sql`g.first_seen_at`, event_count: Prisma.sql`g.event_count` }[q.sortBy];
    const direction = q.sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const result = await db.$transaction(async (tx) => {
      const counts = await tx.$queryRaw<Array<{ count: number }>>(Prisma.sql`SELECT COUNT(*)::int AS count FROM error_log_groups g ${triageJoinSql} WHERE ${where}`);
      const totalCount = counts[0]?.count ?? 0;
      const totalPages = Math.ceil(totalCount / q.limit);
      const page = Math.min(q.page, Math.max(1, totalPages));
      const rows = await tx.$queryRaw<ErrorRow[]>(Prisma.sql`
        SELECT g.id, g.sentry_issue_id, g.title, g.level, ${effectiveStatusSql} AS status,
          g.status AS source_status, t.local_status, t.decided_at,
          g.first_seen_at, g.last_seen_at, g.event_count, g.environment, g.release,
          g.last_event_id, g.created_at, g.updated_at
        FROM error_log_groups g ${triageJoinSql} WHERE ${where}
        ORDER BY ${sort} ${direction}, g.id ASC LIMIT ${q.limit} OFFSET ${(page - 1) * q.limit}`);
      return {
        errorLogGroups: rows.map(({ local_status, decided_at, ...row }) => ({
          ...row, local_triage: local_status ? { status: local_status, decided_at } : null,
        })),
        pagination: { page, limit: q.limit, totalCount, totalPages },
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return NextResponse.json(result);
  } catch (error) { return failure(error, 'Failed to fetch error logs'); }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireApiRole(Role.ADMIN);
    const parsed = z.object({ id: z.string().min(1).max(200), status: z.enum(['OPEN', 'RESOLVED', 'IGNORED']) }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'A group ID and valid status are required' }, { status: 400 });
    const { id, status } = parsed.data;
    const errorLogGroup = await db.$transaction(async (tx) => {
      // Update/lock the disposable group before recording the independent decision.
      const group = await tx.error_log_groups.update({ where: { id }, data: { updated_at: new Date() } });
      const decision = await tx.error_log_triage.upsert({
        where: { sentry_issue_id: group.sentry_issue_id },
        create: { sentry_issue_id: group.sentry_issue_id, local_status: status, deciding_admin_id: session.user.id },
        update: { local_status: status, decided_at: new Date(), deciding_admin_id: session.user.id },
      });
      const { sample_event_json: _sample, ...summary } = group;
      return projectTriage(summary, decision);
    });
    return NextResponse.json({ success: true, errorLogGroup });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Error log group not found' }, { status: 404 });
    }
    return failure(error, 'Failed to update error log');
  }
}
