import { Prisma, type ErrorLogStatus } from '@prisma/client';
import { db } from '@/lib/db';

export interface TriageDecision {
  local_status: ErrorLogStatus;
  decided_at: Date;
  deciding_admin_id: string;
}

/** Source events and local admin decisions have independent lifetimes. */
export function projectTriage<T extends { status: ErrorLogStatus }>(group: T, decision: TriageDecision | null) {
  return {
    ...group,
    source_status: group.status,
    status: decision?.local_status ?? group.status,
    local_triage: decision ? { status: decision.local_status, decided_at: decision.decided_at } : null,
  };
}

export async function withLocalTriage<T extends { sentry_issue_id: string; status: ErrorLogStatus }>(group: T) {
  const decision = await db.error_log_triage.findUnique({ where: { sentry_issue_id: group.sentry_issue_id } });
  return projectTriage(group, decision);
}

export const effectiveStatusSql = Prisma.sql`COALESCE(t.local_status, g.status)`;
export const triageJoinSql = Prisma.sql`LEFT JOIN error_log_triage t ON t.sentry_issue_id = g.sentry_issue_id`;

export function errorRetentionCutoffs(now: Date) {
  const day = 24 * 60 * 60 * 1000;
  return { open: new Date(now.getTime() - 90 * day), closed: new Date(now.getTime() - 30 * day) };
}

/** Lock groups first: admin triage uses the same group lock before its upsert. */
export async function cleanupErrorLogs(now = new Date()) {
  const cutoffs = errorRetentionCutoffs(now);
  const eligible = Prisma.sql`((${effectiveStatusSql} = 'OPEN' AND g.last_seen_at < ${cutoffs.open})
    OR (${effectiveStatusSql} IN ('RESOLVED', 'IGNORED') AND g.updated_at < ${cutoffs.closed}))`;
  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT g.id FROM error_log_groups g ${triageJoinSql} WHERE ${eligible} FOR UPDATE OF g`);
    if (!locked.length) return { deletedOld: 0, deletedResolved: 0 };
    // A fresh READ COMMITTED statement sees any triage committed while waiting
    // for a group lock. Re-evaluate retention before deleting only locked rows.
    const rows = await tx.$queryRaw<Array<{ status: ErrorLogStatus }>>(Prisma.sql`
      WITH candidates AS (
        SELECT g.id, ${effectiveStatusSql} AS status FROM error_log_groups g ${triageJoinSql}
        WHERE g.id IN (${Prisma.join(locked.map(row => row.id))}) AND ${eligible}
      )
      DELETE FROM error_log_groups g USING candidates c WHERE g.id = c.id RETURNING c.status`);
    return { deletedOld: rows.filter(row => row.status === 'OPEN').length,
      deletedResolved: rows.filter(row => row.status !== 'OPEN').length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
