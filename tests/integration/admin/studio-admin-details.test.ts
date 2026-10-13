/** @jest-environment node */
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { requireApiRole } from '@/lib/auth-guards';
import { GET } from '@/app/api/admin/studios/route';
import { PUT } from '@/app/api/admin/studios/[id]/note/route';
import { adminNoteKey } from '@/lib/admin/studios/admin-details';
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth-guards', () => ({ requireApiRole: jest.fn() }));
jest.mock('@/lib/db', () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Disposable database required');
  const target = new URL(url);
  if (target.hostname !== '127.0.0.1' || target.port !== '55432' || target.pathname !== '/vsf_admin_fixture_utf8') throw new Error('Wrong database');
  const { PrismaClient } = require('@prisma/client');
  return { db: new PrismaClient({ datasources: { db: { url } } }) };
});
const userId = randomUUID(), studioId = randomUUID();
const ctx = { params: Promise.resolve({ id: studioId }) };
const put = (body: unknown) => PUT(new NextRequest(`http://localhost/api/admin/studios/${studioId}/note`, { method: 'PUT', body: JSON.stringify(body) }), ctx);
async function summary() {
  const result = await GET(new NextRequest(`http://localhost/api/admin/studios?studioId=${studioId}`));
  expect(result.status).toBe(200);
  return (await result.json()).studios[0];
}
beforeAll(async () => {
  await db.users.create({ data: { id: userId, username: `glance${userId.replaceAll('-', '').slice(0, 12)}`, email: `${userId}@example.invalid`, display_name: 'Invented owner', created_at: new Date('2020-01-01'), updated_at: new Date(), auto_renew: true } });
  await db.studio_profiles.create({ data: { id: studioId, user_id: userId, name: 'Invented admin summary studio', custom_connection_methods: [], updated_at: new Date() } });
  await db.subscriptions.create({ data: { id: randomUUID(), user_id: userId, status: 'ACTIVE', updated_at: new Date() } });
  for (const status of ['OPEN', 'RESOLVED'] as const) await db.support_tickets.create({ data: { id: randomUUID(), user_id: userId, type: 'ISSUE', category: 'OTHER', message: 'Invented issue', status, updated_at: new Date() } });
  for (const accessReview of [true, false]) await db.refund_operations.create({ data: { id: randomUUID(), payload_hash: 'fixture', user_reference: userId, stripe_payment_intent_id: `pi_${randomUUID()}`, amount: 100, currency: 'gbp', idempotency_key: randomUUID(), billing_idempotency_key: randomUUID(), money_status: 'SUCCEEDED', access_review_required: accessReview } });
});
beforeEach(() => {
  const session = { user: { id: 'fixture-admin', role: 'ADMIN' } };
  (getServerSession as jest.Mock).mockResolvedValue(session);
  (requireApiRole as jest.Mock).mockResolvedValue(session);
});
afterAll(async () => {
  await db.admin_sticky_notes.deleteMany({ where: { key: adminNoteKey(userId) } });
  await db.refund_operations.deleteMany({ where: { user_reference: userId } });
  await db.subscriptions.deleteMany({ where: { user_id: userId } });
  await db.users.delete({ where: { id: userId } });
  await db.$disconnect();
});
it('uses account date, safe billing evidence, and only unresolved issues in the real list transaction', async () => {
  const studio = await summary();
  expect(studio.admin_details).toMatchObject({ accountCreatedAt: '2020-01-01T00:00:00.000Z', billing: 'Local/manual record · active', renewal: 'No linked recurring billing', openSupport: 1, openRefunds: 1, note: { text: '', version: null } });
  expect(studio.users.email_verified).toBe(false);
});
it('requires admin access and rejects oversized or unversioned writes', async () => {
  (requireApiRole as jest.Mock).mockRejectedValueOnce(new Error('Insufficient permissions'));
  expect((await put({ text: 'not allowed', expectedVersion: null })).status).toBe(403);
  expect((await put({ text: 'x'.repeat(501), expectedVersion: null })).status).toBe(400);
  expect((await put({ text: 'missing version' })).status).toBe(400);
  expect(await db.admin_sticky_notes.findUnique({ where: { key: adminNoteKey(userId) } })).toBeNull();
});
it('saves privately, rejects simultaneous stale saves, and clears with a new version', async () => {
  const [a, b] = await Promise.all([put({ text: 'First reminder', expectedVersion: null }), put({ text: 'Second reminder', expectedVersion: null })]);
  expect([a.status, b.status].sort()).toEqual([200, 409]);
  const first = await summary();
  expect(first.admin_details.note.text).toMatch(/reminder/);
  expect(await db.user_metadata.count({ where: { user_id: userId } })).toBe(0);
  const cleared = await put({ text: '', expectedVersion: first.admin_details.note.version });
  expect(cleared.status).toBe(200);
  expect((await cleared.json()).note.version).not.toBe(first.admin_details.note.version);
  expect((await summary()).admin_details.note.text).toBe('');
});
