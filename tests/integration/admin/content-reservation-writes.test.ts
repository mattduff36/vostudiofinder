/** @jest-environment node */
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { POST as reorderFaq } from '@/app/api/admin/faq/reorder/route';
import { DELETE as deleteReservation } from '@/app/api/admin/reservations/[userId]/route';

jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/db', () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Disposable TEST_DATABASE_URL is required');
  const target = new URL(url);
  if (target.hostname !== '127.0.0.1' || target.port !== '55432' || target.pathname !== '/vsf_admin_fixture_utf8') throw new Error('Refusing a non-fixture database');
  const { PrismaClient } = require('@prisma/client'); return { db: new PrismaClient({ datasources: { db: { url } } }) };
});
const request = (body: unknown) => new NextRequest('http://localhost/api/admin/fixture', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const fixtureUsers: string[] = [];
const fixtureFaqs: string[] = [];
async function user(status: 'PENDING' | 'ACTIVE' = 'PENDING') {
  const id = randomUUID(); fixtureUsers.push(id);
  await db.users.create({ data: { id, username: `cw${id.replaceAll('-', '').slice(0, 15)}`, email: `${id}@example.invalid`, display_name: 'Invented reservation', status, updated_at: new Date() } });
  return id;
}
beforeEach(() => { (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'fixture-admin', role: 'ADMIN' } }); });
afterAll(async () => {
  await db.faq.deleteMany({ where: { id: { in: fixtureFaqs } } });
  await db.users.deleteMany({ where: { id: { in: fixtureUsers } } });
  await db.$disconnect();
});

it('two admins reordering the same accepted FAQ version cannot overwrite one another', async () => {
  for (let i = 0; i < 3; i++) { const id = randomUUID(); fixtureFaqs.push(id); await db.faq.create({ data: { id, question: `Invented FAQ ${i}`, answer: 'Fixture', sort_order: 100000 + i, updated_at: new Date() } }); }
  const current = await db.faq.findMany({ orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] });
  const expectedOrder = current.map(f => f.id);
  const after = [...expectedOrder];
  const last = after.pop()!; after.unshift(last);
  const alternative = [...expectedOrder].reverse();
  const make = (ids: string[]) => ({ expectedOrder, faqs: ids.map((id, index) => ({ id, sort_order: index + 1 })) });
  const responses = await Promise.all([reorderFaq(request(make(after))), reorderFaq(request(make(alternative)))]);
  expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
  const winner = await responses.find(r => r.status === 200)!.json();
  const stored = await db.faq.findMany({ orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] });
  expect(stored.map(f => f.id)).toEqual(winner.faqs.map((f: { id: string }) => f.id));
  expect(new Set(stored.map(f => f.sort_order)).size).toBe(stored.length);
});
it('stale ACTIVE and paid reservations are rejected before deleting related records', async () => {
  const activeId = await user('ACTIVE');
  expect((await deleteReservation(request({}), { params: Promise.resolve({ userId: activeId }) })).status).toBe(409);
  expect(await db.users.findUnique({ where: { id: activeId } })).not.toBeNull();
  const paidId = await user();
  const paid = await db.payments.create({ data: { id: randomUUID(), user_id: paidId, amount: 3000, currency: 'gbp', status: 'SUCCEEDED', updated_at: new Date() } });
  expect((await deleteReservation(request({}), { params: Promise.resolve({ userId: paidId }) })).status).toBe(409);
  expect(await db.payments.findUnique({ where: { id: paid.id } })).not.toBeNull();
});
it('activation that already owns the user lock wins against reservation deletion', async () => {
  const id = await user();
  let release!: () => void; let lockReady!: () => void; let deleteStarted!: () => void;
  const mayCommit = new Promise<void>(resolve => { release = resolve; });
  const locked = new Promise<void>(resolve => { lockReady = resolve; });
  const deleting = new Promise<void>(resolve => { deleteStarted = resolve; });
  const transaction = db.$transaction.bind(db);
  const activation = transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
    lockReady(); await mayCommit;
    await tx.users.update({ where: { id }, data: { status: 'ACTIVE' } });
  });
  await locked;
  const spy = jest.spyOn(db, '$transaction').mockImplementation(((work: any, options: any) => transaction(async tx => {
    const proxy = new Proxy(tx, { get(target, name) {
      if (name === '$queryRaw') return (...args: any[]) => { deleteStarted(); return (target.$queryRaw as any)(...args); };
      return Reflect.get(target, name);
    } });
    return work(proxy);
  }, options)) as any);
  const deletion = deleteReservation(request({}), { params: Promise.resolve({ userId: id }) });
  try { await deleting; release(); await activation; expect((await deletion).status).toBe(409); }
  finally { release(); spy.mockRestore(); }
  expect(await db.users.findUnique({ where: { id } })).toMatchObject({ status: 'ACTIVE' });
});
it('a confirmed empty reservation can be deleted once and a repeat is a 404', async () => {
  const id = await user(); const params = { params: Promise.resolve({ userId: id }) };
  expect((await deleteReservation(request({}), params)).status).toBe(200);
  expect(await db.users.findUnique({ where: { id } })).toBeNull();
  expect((await deleteReservation(request({}), params)).status).toBe(404);
});
