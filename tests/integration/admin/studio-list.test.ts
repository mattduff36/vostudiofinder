/** @jest-environment node */
import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';
import { PrismaClient, type Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { GET } from '@/app/api/admin/studios/route';
import { getProfileCompletion } from '@/lib/utils/profile-completion';
import { STUDIO_MAX_WINDOW, type StudiosResponse } from '@/components/admin/studios/types';

jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/email/send-templated', () => ({ sendTemplatedEmail: jest.fn(() => { throw new Error('Studio list must not send email'); }) }));
jest.mock('@/lib/db', () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Disposable TEST_DATABASE_URL is required');
  const target = new URL(url);
  if (target.hostname !== '127.0.0.1' || target.port !== '55432' || target.pathname !== '/vsf_admin_fixture_utf8') throw new Error('Refusing a non-fixture database');
  const { PrismaClient } = require('@prisma/client');
  return { db: new PrismaClient({ datasources: { db: { url } }, log: [{ emit: 'event', level: 'query' }] }) };
});

// The independently connected writer can commit while the route owns its read snapshot.
const fixtureUrl = process.env.TEST_DATABASE_URL!;
const checkedTarget = new URL(fixtureUrl);
if (checkedTarget.hostname !== '127.0.0.1' || checkedTarget.port !== '55432' || checkedTarget.pathname !== '/vsf_admin_fixture_utf8') throw new Error('Refusing a non-fixture database');
const writer = new PrismaClient({ datasources: { db: { url: fixtureUrl } } });
const ownedUsers: string[] = [];
let queryCount = 0;
(db as unknown as { $on: (event: 'query', listener: () => void) => void }).$on('query', () => { queryCount++; });

const request = (params: Record<string, string | number> = {}) => new NextRequest(`http://localhost/api/admin/studios?${new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]))}`);
const uniqueScope = () => `studio_fixture_${randomUUID().replaceAll('-', '')}`;
async function list(params: Record<string, string | number>) {
  const response = await GET(request(params));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  return await response.json() as StudiosResponse;
}
async function fixture(scope: string, studio: Partial<Prisma.studio_profilesUncheckedCreateInput> = {}, user: Partial<Prisma.usersUncheckedCreateInput> = {}) {
  const userId = randomUUID(); const studioId = randomUUID(); ownedUsers.push(userId);
  const owner = await db.users.create({ data: { id: userId, username: `sl${userId.replaceAll('-', '').slice(0, 16)}`, email: `${userId}@example.invalid`, display_name: 'Invented studio owner', status: 'ACTIVE', updated_at: new Date(), ...user } });
  const profile = await db.studio_profiles.create({ data: { id: studioId, user_id: userId, name: scope, custom_connection_methods: [], updated_at: new Date(), ...studio } });
  return { owner, profile };
}
async function subscription(userId: string, expiry: Date, createdAt = new Date()) {
  return db.subscriptions.create({ data: { id: randomUUID(), user_id: userId, status: 'ACTIVE', current_period_start: new Date('2020-01-01'), current_period_end: expiry, created_at: createdAt, updated_at: createdAt } });
}
beforeEach(() => { (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'invented-admin', role: 'ADMIN' } }); });
afterEach(async () => {
  jest.restoreAllMocks();
  await writer.subscriptions.deleteMany({ where: { user_id: { in: ownedUsers } } });
  await writer.users.deleteMany({ where: { id: { in: ownedUsers } } });
  ownedUsers.length = 0;
});
afterAll(async () => { await Promise.all([db.$disconnect(), writer.$disconnect()]); });

it('validates bounded windows, ranges and sorts before querying, and accepts the 400-row contract', async () => {
  for (const params of [{ limit: 0 }, { limit: 401 }, { limit: 'bad' }, { limit: 1.5 }, { offset: -1 }, { offset: Number.MAX_SAFE_INTEGER }, { sortBy: 'unrecognised' }]) {
    expect((await GET(request(params))).status).toBe(400);
  }
  expect(STUDIO_MAX_WINDOW).toBe(400);
  const result = await list({ limit: 400, search: uniqueScope() });
  expect(result.pagination).toEqual({ total: 0, offset: 0, limit: 400, returned: 0, hasMore: false, maxLimit: 400 });
});

it('serializes every canonical completion check using the selected DTO without credential or full image payloads', async () => {
  const scope = uniqueScope();
  const { owner, profile } = await fixture(scope, {
    short_about: 'Short description', about: 'Full description', about_me: 'About the owner', location: 'Invented town',
    phone: '+44 000000000', website_url: 'https://example.invalid/studio', connection12: '1', rate_tier_1: '25.50',
    equipment_list: 'Invented microphone', services_offered: 'Recording', facebook_url: 'https://example.invalid/fb', bluesky_url: 'https://example.invalid/sky',
    latitude: '51.50000000', longitude: '-0.12000000',
  }, { avatar_url: 'https://example.invalid/avatar', password: 'fixture-credential-never-selected', reset_token: 'fixture-reset-never-selected', verification_token: 'fixture-verify-never-selected', email_verified: true });
  await db.studio_studio_types.create({ data: { id: randomUUID(), studio_id: profile.id, studio_type: 'HOME' } });
  await db.studio_images.create({ data: { id: randomUUID(), studio_id: profile.id, image_url: 'https://example.invalid/full-image-never-selected' } });
  const expected = getProfileCompletion({ ...profile, username: owner.username, display_name: owner.display_name, email: owner.email, avatar_url: owner.avatar_url, studio_name: profile.name, studio_types_count: 1, images_count: 1 });
  const result = await list({ studioId: profile.id });
  const actual = result.studios[0]!;
  expect(actual.completion).toEqual(expected);
  expect(actual.profile_completion).toBe(100);
  expect(actual.completion.items).toHaveLength(18);
  expect(actual.latitude).toBe(51.5); expect(actual.longitude).toBe(-0.12);
  expect(actual.users.id).toBe(owner.id);
  expect(Object.keys(actual.users).sort()).toEqual(['avatar_url', 'display_name', 'email', 'email_verified', 'id', 'username']);
  expect(Object.keys(actual.studio_images[0]!)).toEqual(['id']);
  expect(JSON.stringify(result)).not.toMatch(/fixture-(credential|reset|verify)|full-image-never-selected/);
  await db.studio_profiles.update({ where: { id: profile.id }, data: { connection12: '0', website_url: '', rate_tier_1: '0', bluesky_url: null } });
  const partial = (await list({ studioId: profile.id })).studios[0]!;
  expect(partial.completion.items.filter(item => !item.completed).map(item => item.id)).toEqual(['connections', 'website_url', 'social', 'rate']);
});

it('sorts completion across the complete matching set before slicing, with stable ID ties', async () => {
  const scope = uniqueScope();
  await fixture(scope, { updated_at: new Date('2030-01-01') });
  const filled = await Promise.all([fixture(scope, { short_about: 'Filled', about: 'Filled', updated_at: new Date('2020-01-01') }), fixture(scope, { short_about: 'Filled', about: 'Filled', updated_at: new Date('2020-01-01') })]);
  const ids = filled.map(row => row.profile.id).sort();
  expect((await list({ search: scope, sortBy: 'profile_completion', sortOrder: 'desc', limit: 1 })).studios.map(row => row.id)).toEqual([ids[0]]);
  const next = await list({ search: scope, sortBy: 'profile_completion', sortOrder: 'desc', offset: 1, limit: 1 });
  expect(next.studios.map(row => row.id)).toEqual([ids[1]]);
  expect(next.pagination).toMatchObject({ total: 3, returned: 1, hasMore: true });
});

it('keeps null expiry and login values last in either direction and slices expiry only after ordering all matches', async () => {
  const scope = uniqueScope(); const earlyDate = new Date('2040-01-01'); const lateDate = new Date('2041-01-01');
  const empty = await fixture(scope, { updated_at: new Date('2030-01-01') });
  const first = await fixture(scope, { updated_at: new Date('2020-01-01') }, { last_login: earlyDate });
  const tie = await fixture(scope, { updated_at: new Date('2020-01-01') }, { last_login: earlyDate });
  const last = await fixture(scope, { updated_at: new Date('2020-01-01') }, { last_login: lateDate });
  await Promise.all([subscription(first.owner.id, earlyDate), subscription(tie.owner.id, earlyDate), subscription(last.owner.id, lateDate)]);
  const ties = [first.profile.id, tie.profile.id].sort();
  for (const sortBy of ['membership_expires_at', 'last_login']) {
    expect((await list({ search: scope, sortBy, sortOrder: 'asc', limit: 10 })).studios.map(row => row.id)).toEqual([...ties, last.profile.id, empty.profile.id]);
    expect((await list({ search: scope, sortBy, sortOrder: 'desc', limit: 10 })).studios.map(row => row.id)).toEqual([last.profile.id, ...ties, empty.profile.id]);
  }
  expect((await list({ search: scope, sortBy: 'membership_expires_at', sortOrder: 'asc', offset: 1, limit: 1 })).studios.map(row => row.id)).toEqual([ties[1]]);
});

it('targeted studio reads ignore stale search, status, sort and range parameters', async () => {
  const { profile } = await fixture(uniqueScope(), { status: 'INACTIVE' });
  const result = await list({ studioId: profile.id, search: 'no_match', status: 'invalid', sortBy: 'invalid', sortOrder: 'invalid', offset: -5, limit: 0 });
  expect(result.studios.map(row => row.id)).toEqual([profile.id]);
  expect(result.pagination).toMatchObject({ total: 1, limit: 1, offset: 0, hasMore: false });
});

it.each(['insert', 'delete'] as const)('keeps rows/count in a RepeatableRead snapshot during a competing %s', async action => {
  const scope = uniqueScope(); const initial = await fixture(scope);
  let release!: () => void; let observed!: () => void;
  const mayContinue = new Promise<void>(resolve => { release = resolve; });
  const snapshotRead = new Promise<void>(resolve => { observed = resolve; });
  const transact = db.$transaction.bind(db);
  const spy = jest.spyOn(db, '$transaction').mockImplementation(((work: (tx: Prisma.TransactionClient) => Promise<unknown>, options: { isolationLevel?: string }) => {
    expect(options.isolationLevel).toBe('RepeatableRead');
    return transact(async tx => {
      const studios = new Proxy(tx.studio_profiles, { get(target, property) {
        if (property === 'findMany') return async (...args: unknown[]) => {
          const rows = await (target.findMany as (...values: unknown[]) => Promise<unknown>)(...args);
          observed(); await mayContinue; return rows;
        };
        return Reflect.get(target, property);
      } });
      return work(new Proxy(tx, { get(target, property) { return property === 'studio_profiles' ? studios : Reflect.get(target, property); } }));
    }, options as never);
  }) as never);
  const response = GET(request({ search: scope, limit: 80 }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([snapshotRead, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Route never established its snapshot')), 5000); })]);
    if (action === 'delete') await writer.studio_profiles.delete({ where: { id: initial.profile.id } });
    else {
      const id = randomUUID(); ownedUsers.push(id);
      await writer.users.create({ data: { id, username: `sl${id.replaceAll('-', '').slice(0, 16)}`, email: `${id}@example.invalid`, display_name: 'Concurrent invented owner', updated_at: new Date(), studio_profiles: { create: { id: randomUUID(), name: scope, custom_connection_methods: [], updated_at: new Date() } } } });
    }
    release();
    const result = await (await response).json() as StudiosResponse;
    expect(result.studios.map(row => row.id)).toEqual([initial.profile.id]);
    expect(result.pagination.total).toBe(1);
    expect(await writer.studio_profiles.count({ where: { name: scope } })).toBe(action === 'insert' ? 2 : 0);
  } finally { if (timer) clearTimeout(timer); release(); await response; spy.mockRestore(); }
}, 20000);

it('preserves Premium and publication holds on GET while returning fresh expired-Featured enforcement', async () => {
  const { owner, profile } = await fixture(uniqueScope(), { status: 'INACTIVE', is_profile_visible: false, admin_review: true, is_premium: true, is_verified: true, is_featured: true, featured_until: new Date('2020-01-01') }, { membership_tier: 'PREMIUM', status: 'ACTIVE' });
  await subscription(owner.id, new Date('2020-01-01'));
  const result = await list({ studioId: profile.id });
  expect(result.studios[0]).toMatchObject({ is_featured: false, status: 'INACTIVE', is_profile_visible: false, admin_review: true, is_premium: true, is_verified: true, membership_tier: 'PREMIUM', users: { id: owner.id } });
  expect(await db.users.findUnique({ where: { id: owner.id } })).toMatchObject({ membership_tier: 'PREMIUM' });
  expect(await db.studio_profiles.findUnique({ where: { id: profile.id } })).toMatchObject({ is_featured: false, status: 'INACTIVE', is_profile_visible: false, admin_review: true });
  expect(await db.user_metadata.count({ where: { user_id: owner.id, key: 'membership_downgraded_at' } })).toBe(0);
});

it('measures bounded 80/160/400 fixture windows with full-length editable descriptions', async () => {
  const scope = uniqueScope(); const now = new Date();
  const users: Prisma.usersCreateManyInput[] = []; const studios: Prisma.studio_profilesCreateManyInput[] = [];
  // The current editor permits 300 short-description, 150 about-me and 2,000 full-description characters.
  const textLengths = { short_about: 300, about_me: 150, about: 2000, description: 2000 };
  for (let index = 0; index < 400; index++) {
    const userId = randomUUID(); ownedUsers.push(userId);
    users.push({ id: userId, username: `sl${userId.replaceAll('-', '').slice(0, 16)}`, email: `${userId}@example.invalid`, display_name: `Invented owner ${index}`, status: 'ACTIVE', updated_at: now });
    studios.push({ id: randomUUID(), user_id: userId, name: `${scope}_${String(index).padStart(3, '0')}`, short_about: 'S'.repeat(textLengths.short_about), about_me: 'O'.repeat(textLengths.about_me), about: 'D'.repeat(textLengths.about), description: 'D'.repeat(textLengths.description), custom_connection_methods: [], updated_at: now });
  }
  await db.users.createMany({ data: users }); await db.studio_profiles.createMany({ data: studios });
  const measurements: Array<{ rows: number; bytes: number; queries: number; elapsedMs: number }> = [];
  for (const limit of [80, 160, 400]) {
    queryCount = 0; const start = performance.now();
    const response = await GET(request({ search: scope, limit, sortBy: 'name', sortOrder: 'asc' }));
    const body = await response.text(); const elapsedMs = performance.now() - start;
    expect(response.status).toBe(200);
    expect((JSON.parse(body) as StudiosResponse).pagination).toMatchObject({ total: 400, limit, returned: limit, hasMore: limit < 400 });
    measurements.push({ rows: limit, bytes: Buffer.byteLength(body, 'utf8'), queries: queryCount, elapsedMs: Math.round(elapsedMs * 100) / 100 });
  }
  expect(measurements[2]!.bytes).toBeGreaterThan(measurements[0]!.bytes);
  // Evidence is descriptive: fixture latency does not establish production performance.
  console.info('[STUDIO_LIST_FIXTURE_METRICS]', JSON.stringify({ fixture: 'invented PostgreSQL loopback data', textLengths, measurements }));
}, 120000);
