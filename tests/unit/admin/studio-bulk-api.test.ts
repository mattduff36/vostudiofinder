/** @jest-environment node */
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { POST } from '@/app/api/admin/bulk/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/db', () => ({ prisma: { $transaction: jest.fn(), studio_profiles: { findMany: jest.fn() } } }));

const request = (body: unknown) => new NextRequest('http://fixture.test/api/admin/bulk', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
beforeEach(() => {
  jest.clearAllMocks();
  (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'fixture-admin', role: 'ADMIN' } });
});

test('requires ADMIN before reading or mutating even an export', async () => {
  (getServerSession as jest.Mock).mockResolvedValue({ user: { role: 'USER' } });
  expect((await POST(request({ action: 'export', studioIds: ['s1'] }))).status).toBe(401);
  expect(prisma.$transaction).not.toHaveBeenCalled();
  expect(prisma.studio_profiles.findMany).not.toHaveBeenCalled();
});

test('invalid JSON, empty selection and an oversized window fail before writes', async () => {
  expect((await POST(new NextRequest('http://fixture.test/api/admin/bulk', { method: 'POST', body: '{' }))).status).toBe(400);
  for (const studioIds of [[], Array.from({ length: 401 }, (_, index) => `s${index}`), ['invalid/id']]) {
    expect((await POST(request({ action: 'activate', studioIds }))).status).toBe(400);
  }
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test('deduplicates the selection and reports only the matching studio IDs', async () => {
  const tx = { studio_profiles: { findMany: jest.fn().mockResolvedValue([{ id: 's1', user_id: 'u1' }]), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
  (prisma.$transaction as jest.Mock).mockImplementation(async work => work(tx));
  const response = await POST(request({ action: 'activate', studioIds: ['s1', 's1', 'missing'] }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true, processedIds: ['s1'], affectedCount: 1 });
  expect(tx.studio_profiles.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['s1', 'missing'] } } }));
  expect(tx.studio_profiles.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['s1'] } }, data: { status: 'ACTIVE' } });
  expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'RepeatableRead' });
});

test('failed bulk persistence is a failure response, never a success count', async () => {
  const silence = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Fixture database failure'));
    const response = await POST(request({ action: 'deactivate', studioIds: ['s1'] }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to perform bulk operation' });
  } finally { silence.mockRestore(); }
});
