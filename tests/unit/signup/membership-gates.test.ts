/**
 * @jest-environment node
 */

const findUnique = jest.fn();
const update = jest.fn();
const ensureStudioProfile = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    users: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      updateMany: (...args: unknown[]) => update(...args),
    },
  },
}));

jest.mock('@/lib/studio-profile', () => ({
  ensureStudioProfile: (...args: unknown[]) => ensureStudioProfile(...args),
}));

import { NextRequest } from 'next/server';
import { UserStatus } from '@prisma/client';
import { POST as completeBasic } from '@/app/api/auth/complete-basic-signup/route';

function basicRequest(userId: string) {
  return new NextRequest('http://localhost/api/auth/complete-basic-signup', {
    method: 'POST',
    body: JSON.stringify({ userId }),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('complete-basic-signup username gate', () => {
  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset();
    ensureStudioProfile.mockReset();
  });

  const pending = {
    id: 'user-1',
    status: UserStatus.PENDING,
    membership_tier: 'BASIC',
    email_verified: true,
    reservation_expires_at: new Date(Date.now() + 60_000),
  };

  it('does not activate a temp_ username', async () => {
    findUnique.mockResolvedValue({ ...pending, username: 'temp_abc123' });

    const response = await completeBasic(basicRequest('user-1'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/username/i);
    expect(update).not.toHaveBeenCalled();
    expect(ensureStudioProfile).not.toHaveBeenCalled();
  });

  it('does not activate a hyphenated or reserved username', async () => {
    findUnique.mockResolvedValue({ ...pending, username: 'PaulBerry-MirikaMedia' });
    const hyphenated = await completeBasic(basicRequest('user-1'));
    expect(hyphenated.status).toBe(400);

    findUnique.mockResolvedValue({ ...pending, username: 'admin' });
    const reserved = await completeBasic(basicRequest('user-1'));
    expect(reserved.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('activates when the persisted username is canonical', async () => {
    findUnique.mockResolvedValue({ ...pending, username: 'PaulBerry' });
    update.mockResolvedValue({ count: 1 });
    ensureStudioProfile.mockResolvedValue({});

    const response = await completeBasic(basicRequest('user-1'));

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'user-1', username: 'PaulBerry', status: UserStatus.PENDING }),
      data: expect.objectContaining({ status: UserStatus.ACTIVE, membership_tier: 'BASIC' }),
    }));
  });
  it('does not activate after a concurrent expiry or username change', async () => {
    findUnique.mockResolvedValue({ ...pending, username: 'PaulBerry' });
    update.mockResolvedValue({ count: 0 });
    const response = await completeBasic(basicRequest('user-1'));
    expect(response.status).toBe(409);
    expect(ensureStudioProfile).not.toHaveBeenCalled();
  });
});
