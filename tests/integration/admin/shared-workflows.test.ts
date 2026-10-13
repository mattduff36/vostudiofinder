/**
 * Real PostgreSQL transactions. Providers are synthetic; no network send/sync.
 * Apply the reviewed additive schema to the explicitly disposable fixture first.
 * @jest-environment node
 */
import { createHmac, randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { prepareReply, dispatchReply, recoverReplyStatus, nextTicketVersion, type ReplyInput } from '@/lib/admin/support/replies';
import { submitFrozenEmail } from '@/lib/email/campaign-provider';
import { readStickyNote, saveStickyNote, StickyNoteConflict } from '@/lib/admin/sticky-notes';
import { cleanupErrorLogs, withLocalTriage } from '@/lib/admin/error-log/triage';
import { GET as listErrors, PATCH as decide } from '@/app/api/admin/error-log/route';
import { GET as manualSync } from '@/app/api/admin/sync-sentry/route';
import { GET as scheduledSync } from '@/app/api/cron/sentry-sync/route';
import { POST as sentryWebhook } from '@/app/api/webhooks/sentry/route';

jest.mock('@/lib/db', () => {
  const value = process.env.TEST_DATABASE_URL;
  const target = value ? new URL(value) : null;
  if (!target || target.hostname !== '127.0.0.1' || target.port !== '55432' || target.pathname !== '/vsf_admin_fixture_utf8') {
    throw new Error('Shared workflow integration fixtures require the reviewed disposable loopback target: 127.0.0.1:55432/vsf_admin_fixture_utf8. No DATABASE_URL fallback is permitted.');
  }
  const { PrismaClient } = require('@prisma/client');
  return { db: new PrismaClient({ datasourceUrl: value, log: [] }) };
});
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/auth-guards', () => ({ requireApiRole: jest.fn(async () => ({ user: { id: 'shared-fixture-admin', role: 'ADMIN' } })) }));
jest.mock('nanoid', () => ({ nanoid: () => `shared-fixture-${require('crypto').randomUUID()}` }));
jest.mock('@/lib/email/campaign-provider', () => ({ ...jest.requireActual('@/lib/email/campaign-provider'), submitFrozenEmail: jest.fn() }));

const fixture = `shared-fixture-${randomUUID()}`;
const userId = `${fixture}-user`;
const now = new Date('2026-10-12T18:00:00.000Z');
const provider = submitFrozenEmail as jest.Mock;
const previousFetch = global.fetch;
const envKeys = ['CRON_SECRET', 'SENTRY_WEBHOOK_SECRET', 'SENTRY_AUTH_TOKEN', 'SENTRY_ORG_SLUG', 'SENTRY_PROJECT_SLUG'] as const;
const previousEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
let importedIssue: any;
const signedHook = (payload: unknown) => {
  const body = JSON.stringify(payload);
  return new NextRequest('http://fixture.test/api/webhooks/sentry', { method: 'POST', body,
    headers: { 'sentry-hook-signature': createHmac('sha256', 'shared-fixture-secret').update(body).digest('hex') } });
};
const issue = (id: string, status = 'unresolved') => ({ id, status, title: `${fixture} error`, level: 'error', firstSeen: now.toISOString(), lastSeen: now.toISOString(), count: '3' });
const newTicket = async () => {
  const id = `${fixture}-${randomUUID()}`;
  await db.support_tickets.create({ data: { id, user_id: userId, type: 'SUGGESTION', category: 'Fixture', message: 'Synthetic support request', updated_at: now } });
  const input: ReplyInput = { requestKey: randomUUID(), message: 'Synthetic reply only', expectedUserId: userId,
    expectedRecipient: `${fixture}@example.test`, expectedUpdatedAt: now.toISOString(), updateStatus: 'IN_PROGRESS' };
  return { id, input };
};
const patchStatus = (id: string, status: 'OPEN' | 'RESOLVED' | 'IGNORED') => decide(new NextRequest('http://fixture.test/api/admin/error-log', { method: 'PATCH', body: JSON.stringify({ id, status }) }));
async function until(predicate: () => boolean) {
  const deadline = Date.now() + 2000;
  while (!predicate()) { if (Date.now() > deadline) throw new Error('Fixture barrier timed out'); await new Promise(resolve => setTimeout(resolve, 10)); }
}

beforeAll(async () => {
  for (const key of envKeys) process.env[key] = key === 'CRON_SECRET' || key === 'SENTRY_WEBHOOK_SECRET' ? 'shared-fixture-secret' : 'shared-fixture-config';
  global.fetch = jest.fn(async () => new Response(JSON.stringify([importedIssue]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  if (await db.admin_sticky_notes.findUnique({ where: { key: 'global' } })) throw new Error('Use a fresh disposable fixture: this test requires an absent global sticky note.');
  await db.users.create({ data: { id: userId, email: `${fixture}@example.test`, username: fixture, display_name: 'Synthetic Fixture User', status: 'ACTIVE', updated_at: now } });
});
beforeEach(() => { provider.mockReset(); provider.mockResolvedValue({ status: 'accepted', id: 'synthetic-provider-id' }); });
afterAll(async () => {
  await db.support_reply_operations.deleteMany({ where: { ticket_user_id: userId } });
  await db.support_tickets.deleteMany({ where: { user_id: userId } });
  await db.users.deleteMany({ where: { id: userId } });
  await db.error_log_groups.deleteMany({ where: { sentry_issue_id: { startsWith: fixture } } });
  await db.error_log_triage.deleteMany({ where: { sentry_issue_id: { startsWith: fixture } } });
  await db.admin_sticky_notes.deleteMany({ where: { id: { startsWith: 'shared-fixture-' } } });
  await db.$disconnect(); global.fetch = previousFetch;
  for (const key of envKeys) { const old = previousEnv[key]; if (old === undefined) delete process.env[key]; else process.env[key] = old; }
});

it('serializes two clients preparing/sending the same reply key into one provider attempt', async () => {
  const { id, input } = await newTicket();
  const [first, second] = await Promise.all([prepareReply(id, 'shared-fixture-admin', input), prepareReply(id, 'shared-fixture-admin', input)]);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  provider.mockImplementation(async () => { await gate; return { status: 'accepted', id: 'synthetic-one-send' }; });
  const results = Promise.all([dispatchReply(first), dispatchReply(second)]);
  await until(() => provider.mock.calls.length === 1); release(); await results;
  expect(provider).toHaveBeenCalledTimes(1);
  expect(await db.support_reply_operations.count({ where: { id: input.requestKey } })).toBe(1);
  expect(await db.support_reply_operations.findUniqueOrThrow({ where: { id: input.requestKey } })).toMatchObject({ provider_status: 'ACCEPTED', status_result: 'APPLIED' });
  expect(await db.support_tickets.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'IN_PROGRESS' });
});
it('serializes status-only recovery and preserves a later explicit reopening', async () => {
  const { id, input } = await newTicket(); const prepared = await prepareReply(id, 'shared-fixture-admin', input);
  await db.support_reply_operations.update({ where: { id: prepared.id }, data: { provider_status: 'ACCEPTED', provider_message_id: 'synthetic-accepted', status_result: 'FAILED' } });
  await db.support_tickets.update({ where: { id }, data: { status: 'OPEN', resolved_at: null, updated_at: nextTicketVersion(now) } });
  const [a, b] = await Promise.all([recoverReplyStatus(prepared.id), recoverReplyStatus(prepared.id)]);
  expect(a.status_result).toBe('CONFLICT'); expect(b.status_result).toBe('CONFLICT'); expect(provider).not.toHaveBeenCalled();
  expect(await db.support_tickets.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'OPEN', resolved_at: null });
});
it('atomically creates the first shared note, then rejects one of two conditional saves', async () => {
  expect(await readStickyNote()).toEqual({ content: '', updatedAt: null });
  const creates = await Promise.allSettled([saveStickyNote('First A', null, now), saveStickyNote('First B', null, now)]);
  expect(creates.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  const loser = creates.find(result => result.status === 'rejected') as PromiseRejectedResult;
  expect(loser.reason).toBeInstanceOf(StickyNoteConflict);
  const loaded = await readStickyNote();
  const edits = await Promise.allSettled([saveStickyNote('Edit A', loaded.updatedAt, now), saveStickyNote('Edit B', loaded.updatedAt, now)]);
  expect(edits.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(edits.filter(result => result.status === 'rejected')).toHaveLength(1);
  expect((await readStickyNote()).updatedAt).not.toBe(loaded.updatedAt);
});
it('keeps local triage through concurrent manual sync, scheduled sync and signed webhook updates', async () => {
  const sentryId = `${fixture}-triage`; importedIssue = issue(sentryId);
  expect((await manualSync(new NextRequest('http://fixture.test/api/admin/sync-sentry'))).status).toBe(200);
  const group = await db.error_log_groups.findUniqueOrThrow({ where: { sentry_issue_id: sentryId } });
  importedIssue = issue(sentryId, 'resolved');
  const [local, source] = await Promise.all([patchStatus(group.id, 'IGNORED'), manualSync(new NextRequest('http://fixture.test/api/admin/sync-sentry'))]);
  expect(local.status).toBe(200); expect(source.status).toBe(200);
  expect(await withLocalTriage(await db.error_log_groups.findUniqueOrThrow({ where: { id: group.id } }))).toMatchObject({ status: 'IGNORED', source_status: 'RESOLVED' });
  importedIssue = issue(sentryId);
  expect((await scheduledSync(new NextRequest('http://fixture.test/api/cron/sentry-sync', { headers: { authorization: 'Bearer shared-fixture-secret' } }))).status).toBe(200);
  expect((await sentryWebhook(signedHook({ action: 'issue.reopened', data: { issue: importedIssue } }))).status).toBe(200);
  expect(await withLocalTriage(await db.error_log_groups.findUniqueOrThrow({ where: { id: group.id } }))).toMatchObject({ status: 'IGNORED', source_status: 'OPEN' });
  expect((await patchStatus(group.id, 'OPEN')).status).toBe(200);
  expect((await sentryWebhook(signedHook({ action: 'issue.resolved', data: { issue: importedIssue } }))).status).toBe(200);
  expect(await withLocalTriage(await db.error_log_groups.findUniqueOrThrow({ where: { id: group.id } }))).toMatchObject({ status: 'OPEN', source_status: 'RESOLVED' });
});
it.each(['IGNORED', 'RESOLVED'] as const)('keeps %s disposition after payload retention and recovers it on signed event reimport', async status => {
  const sentryId = `${fixture}-retention-${status}`; importedIssue = issue(sentryId);
  await manualSync(new NextRequest('http://fixture.test/api/admin/sync-sentry'));
  const group = await db.error_log_groups.findUniqueOrThrow({ where: { sentry_issue_id: sentryId } });
  await patchStatus(group.id, status);
  await db.error_log_groups.update({ where: { id: group.id }, data: { updated_at: new Date(now.getTime() - 31 * 86400000), sample_event_json: { fixtureSensitive: 'purged-event' } } });
  await cleanupErrorLogs(now);
  expect(await db.error_log_groups.findUnique({ where: { id: group.id } })).toBeNull();
  expect(await db.error_log_triage.findUnique({ where: { sentry_issue_id: sentryId } })).toMatchObject({ local_status: status });
  expect((await sentryWebhook(signedHook({ action: 'event.created', data: { event: { id: 'fresh-fixture-event', issue: importedIssue, message: 'fresh safe event', timestamp: now.toISOString() } } }))).status).toBe(200);
  const reimport = await withLocalTriage(await db.error_log_groups.findUniqueOrThrow({ where: { sentry_issue_id: sentryId } }));
  expect(reimport.status).toBe(status); expect(JSON.stringify(reimport.sample_event_json)).not.toContain('purged-event');
  const response = await listErrors(new NextRequest(`http://fixture.test/api/admin/error-log?status=${status}&search=${encodeURIComponent(fixture)}`));
  expect(response.status).toBe(200); const data = await response.json();
  expect(data.errorLogGroups.some((row: any) => row.sentry_issue_id === sentryId && row.status === status)).toBe(true);
});
