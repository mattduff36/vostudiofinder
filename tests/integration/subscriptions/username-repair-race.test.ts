/** @jest-environment node */
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { claimActiveUsername, claimUsername } from '@/lib/signup/claim-active-username';
jest.mock('@/lib/db', () => { const { PrismaClient } = require('@prisma/client'); return { db: new PrismaClient() }; });
const ids: string[] = [];
async function seed() {
  const id = randomUUID(); ids.push(id);
  await db.users.create({ data: { id, username: `temp_${id}`, email: `${id}@example.test`, display_name: 'Repair test', status: 'ACTIVE', email_verified: true, updated_at: new Date() } });
  return id;
}
beforeAll(() => { const u = new URL(process.env.TEST_DATABASE_URL!); if (u.hostname !== '127.0.0.1' || u.port !== '55439' || u.pathname !== '/vosf_repair') throw Error('Disposable test database required'); });
afterAll(async () => { await db.users.deleteMany({ where: { id: { in: ids } } }); await db.$disconnect(); });
it('allows only one case-insensitive claim across concurrent accounts', async () => {
  const a = await seed(), b = await seed();
  const name = `Repair${randomUUID().replace(/-/g, '').slice(0, 10)}`;
  // Force any unlocked availability reads to overlap; transactional reads need no barrier.
  const find = db.users.findFirst.bind(db.users);
  let arrivals = 0;
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const spy = jest.spyOn(db.users, 'findFirst').mockImplementation(async (args: any) => {
    const row = await find(args);
    if (++arrivals === 2) release();
    await barrier;
    return row as any;
  });
  let results;
  try { results = await Promise.all([claimActiveUsername(a, name), claimActiveUsername(b, name.toLowerCase())]); }
  finally { spy.mockRestore(); }
  expect(results.filter(r => r.ok)).toHaveLength(1);
  expect(await db.users.count({ where: { username: { equals: name, mode: 'insensitive' } } })).toBe(1);
});
it('allows only one completion even when competing names differ', async () => {
  const id = await seed(); const suffix = randomUUID().replace(/-/g, '').slice(0, 10);
  const results = await Promise.all([claimActiveUsername(id, `First${suffix}`), claimActiveUsername(id, `Second${suffix}`)]);
  expect(results.filter(r => r.ok)).toHaveLength(1);
});
it('serializes pending signup and active repair against the same name', async () => {
  const a = await seed(), b = await seed();
  await db.users.update({ where: { id: a }, data: { status: 'PENDING', reservation_expires_at: new Date(Date.now() + 60000) } });
  const name = `Shared${randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const results = await Promise.all([claimUsername(a, name, 'PENDING'), claimActiveUsername(b, name.toLowerCase())]);
  expect(results.filter(r => r.ok)).toHaveLength(1);
});
it('reclaims an expired reservation without changing an active account', async () => {
  const a = await seed(), b = await seed();
  const name = `Old${randomUUID().replace(/-/g, '').slice(0, 10)}`;
  await db.users.update({ where: { id: a }, data: { username: name, status: 'PENDING', reservation_expires_at: new Date(Date.now() - 60000) } });
  expect(await claimActiveUsername(b, name)).toEqual({ ok: true });
  expect((await db.users.findUnique({ where: { id: a } }))?.status).toBe('EXPIRED');
  const c = await seed();
  expect(await claimActiveUsername(c, name)).toMatchObject({ ok: false, status: 409 });
  expect((await db.users.findUnique({ where: { id: b } }))?.username).toBe(name);
});
