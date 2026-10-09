/**
 * @jest-environment node
 */

const getServerSession = jest.fn();
const findUnique = jest.fn();
const findFirst = jest.fn();
const update = jest.fn();

jest.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => getServerSession(...args),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/db', () => ({
  db: {
    users: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
      update: (...args: unknown[]) => update(...args),
    },
    $transaction: async (run: any) => run({ $queryRaw: jest.fn().mockResolvedValue([]), $executeRaw: jest.fn().mockResolvedValue(0), users: { findUnique: (...args: unknown[]) => findUnique(...args), findFirst: (...args: unknown[]) => findFirst(...args), update: (...args: unknown[]) => update(...args) } }),
  },
}));

jest.mock('@/lib/rate-limiting', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  generateFingerprint: () => 'fingerprint',
  RATE_LIMITS: { RESERVE_USERNAME: { windowMs: 1, maxRequests: 10 } },
}));

jest.mock('@/lib/error-logging', () => ({
  handleApiError: () => ({ error: 'Failed' }),
}));

import { NextRequest } from 'next/server';
import { UserStatus } from '@prisma/client';
import { POST } from '@/app/api/auth/complete-username/route';

function repairRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/auth/complete-username', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/auth/complete-username', () => {
  beforeEach(() => {
    getServerSession.mockReset();
    findUnique.mockReset();
    findFirst.mockReset();
    update.mockReset();
  });

  it('rejects an unauthenticated caller', async () => {
    getServerSession.mockResolvedValue(null);

    const response = await POST(repairRequest({ username: 'PaulBerry', userId: 'user-1' }));

    expect(response.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a body userId that is not the session owner', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    findUnique.mockResolvedValue({ id: 'user-1', status: UserStatus.ACTIVE, username: 'temp_abc123' });

    const response = await POST(repairRequest({ username: 'PaulBerry', userId: 'user-2' }));

    expect(response.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a second rename after a public username exists', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    findUnique.mockResolvedValue({ id: 'user-1', status: UserStatus.ACTIVE, username: 'PaulBerry' });

    const response = await POST(repairRequest({ username: 'OtherName' }));

    expect(response.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a malformed proposed username', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    findUnique.mockResolvedValue({ id: 'user-1', status: UserStatus.ACTIVE, username: 'temp_abc123' });

    const response = await POST(repairRequest({ username: 'PaulBerry-MirikaMedia' }));

    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('saves a canonical username once for the session account', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    findUnique.mockResolvedValue({ id: 'user-1', status: UserStatus.ACTIVE, username: 'temp_abc123' });
    findFirst.mockResolvedValue(null);
    update.mockResolvedValue({ count: 1 });

    const response = await POST(repairRequest({ username: 'PaulBerry' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.username).toBe('PaulBerry');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'user-1' }),
      data: expect.objectContaining({ username: 'PaulBerry' }),
    }));
  });

  it('rechecks once-only state after obtaining the account lock', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    findUnique.mockResolvedValueOnce({ id: 'user-1', status: UserStatus.ACTIVE, username: 'temp_abc123' })
      .mockResolvedValue({ id: 'user-1', status: UserStatus.ACTIVE, username: 'AlreadySet' });
    findFirst.mockResolvedValue(null);

    const response = await POST(repairRequest({ username: 'PaulBerry' }));

    expect(response.status).toBe(409);
  });
});
