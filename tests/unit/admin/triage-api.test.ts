/** @jest-environment node */
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireApiRole } from '@/lib/auth-guards';
import { GET, PATCH } from '@/app/api/admin/error-log/route';
import { cleanupErrorLogs, errorRetentionCutoffs, projectTriage, withLocalTriage } from '@/lib/admin/error-log/triage';
jest.mock('@/lib/auth-guards', () => ({ requireApiRole: jest.fn() }));
jest.mock('@/lib/db', () => ({ db: { $transaction: jest.fn(), $queryRaw: jest.fn(), error_log_groups: { update: jest.fn() }, error_log_triage: { upsert: jest.fn(), findUnique: jest.fn() } } }));
const database = db as any;
const now = new Date('2026-10-12T18:00:00.000Z');
const group = { id: 'group-fixture', sentry_issue_id: 'issue-fixture', title: 'Fixture error', status: 'OPEN' as const,
  sample_event_json: { private: 'must not appear in list response' }, updated_at: now };
const decision = { local_status: 'IGNORED' as const, deciding_admin_id: 'admin-fixture', decided_at: now };
beforeEach(() => { jest.clearAllMocks(); (requireApiRole as jest.Mock).mockResolvedValue({ user: { id: 'admin-fixture' } }); database.$transaction.mockImplementation((run: any) => run(database)); });
it('applies a local disposition while retaining source status and no decision actor in the DTO', async () => {
  database.error_log_triage.findUnique.mockResolvedValue(decision);
  const row = await withLocalTriage(group);
  expect(row.status).toBe('IGNORED'); expect(row.source_status).toBe('OPEN');
  expect(row.local_triage).toEqual({ status: 'IGNORED', decided_at: now });
  expect(projectTriage({ ...group, status: 'RESOLVED' as const }, { ...decision, local_status: 'OPEN' }).status).toBe('OPEN');
  expect(projectTriage(group, null).status).toBe('OPEN');
});
it.each(['page=0', 'page=1.5', 'limit=101', 'status=INVALID', 'level=sql', 'dateFrom=not-a-date', 'sortBy=title;drop', 'dateFrom=2026-10-13T00%3A00%3A00Z&dateTo=2026-10-12T00%3A00%3A00Z'])('rejects invalid query %s before database access', async query => {
  const response = await GET(new NextRequest(`http://fixture.test/api/admin/error-log?${query}`));
  expect(response.status).toBe(400); expect(database.$transaction).not.toHaveBeenCalled();
});
it('clamps pagination after a count change within one snapshot and parameterizes search text', async () => {
  database.$queryRaw.mockResolvedValueOnce([{ count: 55 }]).mockResolvedValueOnce([{ ...group, sample_event_json: undefined, source_status: 'OPEN', local_status: 'IGNORED', decided_at: now }]);
  const search = "x'); DROP TABLE users; --";
  const response = await GET(new NextRequest(`http://fixture.test/api/admin/error-log?page=999&status=IGNORED&search=${encodeURIComponent(search)}`));
  expect(response.status).toBe(200);
  expect((await response.json()).pagination).toEqual({ page: 2, limit: 50, totalCount: 55, totalPages: 2 });
  expect(database.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  const query = database.$queryRaw.mock.calls[1][0];
  expect(query.text).toContain('COALESCE(t.local_status, g.status)'); expect(query.text).toContain('g.id ASC');
  expect(query.text).not.toContain(search); expect(query.values).toContain(search); expect(query.values.slice(-2)).toEqual([50, 50]);
  expect(query.text).not.toContain('sample_event_json');
});
it('records an explicit local OPEN override without overwriting ingested source status', async () => {
  database.error_log_groups.update.mockResolvedValue({ ...group, status: 'RESOLVED' });
  database.error_log_triage.upsert.mockResolvedValue({ ...decision, local_status: 'OPEN' });
  const response = await PATCH(new NextRequest('http://fixture.test/api/admin/error-log', { method: 'PATCH', body: JSON.stringify({ id: group.id, status: 'OPEN' }) }));
  expect(response.status).toBe(200); const data = await response.json();
  expect(data.errorLogGroup.status).toBe('OPEN'); expect(data.errorLogGroup.source_status).toBe('RESOLVED');
  expect(data.errorLogGroup).not.toHaveProperty('sample_event_json');
  expect(database.error_log_groups.update.mock.calls[0][0].data).not.toHaveProperty('status');
  expect(database.error_log_triage.upsert.mock.calls[0][0].where).toEqual({ sentry_issue_id: group.sentry_issue_id });
});
it('returns actual auth/absence errors', async () => {
  (requireApiRole as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));
  expect((await GET(new NextRequest('http://fixture.test/api/admin/error-log'))).status).toBe(401);
  (requireApiRole as jest.Mock).mockRejectedValueOnce(new Error('Insufficient permissions'));
  expect((await GET(new NextRequest('http://fixture.test/api/admin/error-log'))).status).toBe(403);
  database.error_log_groups.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('missing', { code: 'P2025', clientVersion: '6' }));
  expect((await PATCH(new NextRequest('http://fixture.test/api/admin/error-log', { method: 'PATCH', body: JSON.stringify({ id: 'missing', status: 'OPEN' }) }))).status).toBe(404);
});
it('locks then rechecks retention using effective status and never deletes the disposition ledger', async () => {
  database.$queryRaw.mockResolvedValueOnce([{ id: group.id }]).mockResolvedValueOnce([{ status: 'IGNORED' }]);
  expect(await cleanupErrorLogs(now)).toEqual({ deletedOld: 0, deletedResolved: 1 });
  expect(database.$queryRaw.mock.calls[0][0].text).toContain('FOR UPDATE OF g');
  expect(database.$queryRaw.mock.calls[1][0].text).toContain('DELETE FROM error_log_groups');
  expect(database.$queryRaw.mock.calls[1][0].text).not.toContain('DELETE FROM error_log_triage');
  expect(errorRetentionCutoffs(now)).toEqual({ open: new Date('2026-07-14T18:00:00.000Z'), closed: new Date('2026-09-12T18:00:00.000Z') });
});
