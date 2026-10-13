/** @jest-environment node */
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { sendEmail, sendVerificationEmail } from '@/lib/email/email-service';
import { GET as getStudio, PUT as putStudio, DELETE as deleteStudio } from '@/app/api/admin/studios/[id]/route';
import { POST as createStudio } from '@/app/api/admin/create-studio/route';
import { DELETE as deleteTestAccounts } from '@/app/api/admin/delete-test-accounts/route';
import { POST as messageUser } from '@/app/api/admin/message-user/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('nanoid', () => ({ nanoid: jest.fn(() => 'unused-created-fixture') }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/auth-utils', () => ({ hashPassword: jest.fn() }));
jest.mock('@/lib/error-logging', () => ({ handleApiError: jest.fn() }));
jest.mock('@/lib/email/email-service', () => ({ sendEmail: jest.fn(), sendVerificationEmail: jest.fn() }));
jest.mock('@/lib/db', () => {
  const database = {
    studio_profiles: { findUnique: jest.fn(), update: jest.fn() },
    users: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  return { db: database, prisma: database };
});

const database = db as any;
const admin = { id: 'admin-fixture', role: 'ADMIN', email: 'fixture-admin@example.invalid', username: 'fixture_admin' };
const ctx = { params: { id: 'nonexistent-studio-fixture' } };
const request = (path: string, method: string, body?: object) => new NextRequest(`http://fixture.test/api/admin/${path}`, {
  method, ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
});
const routes = [
  { label: 'studio GET', run: () => getStudio(request('studios/nonexistent-studio-fixture', 'GET'), ctx), allowed: 404 },
  { label: 'studio PUT', run: () => putStudio(request('studios/nonexistent-studio-fixture', 'PUT', {}), ctx), allowed: 404 },
  { label: 'studio DELETE', run: () => deleteStudio(request('studios/nonexistent-studio-fixture', 'DELETE'), ctx), allowed: 404 },
  { label: 'create studio', run: () => {
    database.users.findUnique.mockResolvedValue({ id: 'existing-address-fixture' });
    return createStudio(request('create-studio', 'POST', { username: 'fixture_new', display_name: 'Invented Fixture', email: 'existing@example.invalid' }));
  }, allowed: 400 },
  { label: 'delete test accounts', run: () => deleteTestAccounts(), allowed: 200 },
  { label: 'message user', run: () => messageUser(request('message-user', 'POST', { username: 'nonexistent-fixture', message: 'Synthetic test text.' })), allowed: 404 },
];
const roles = [
  { label: 'ordinary ADMIN', user: admin, allowed: true },
  { label: 'owner email with ADMIN', user: { ...admin, email: 'admin@mpdee.co.uk', username: 'mpdee' }, allowed: true },
  { label: 'owner username with ADMIN', user: { ...admin, email: 'guy@voiceoverguy.co.uk', username: 'VoiceoverGuy' }, allowed: true },
  { label: 'former email exception without ADMIN', user: { ...admin, role: 'USER', email: 'admin@mpdee.co.uk' }, allowed: false },
  { label: 'former username exception without ADMIN', user: { ...admin, role: 'USER', username: 'VoiceoverGuy' }, allowed: false },
  { label: 'ordinary USER', user: { ...admin, role: 'USER' }, allowed: false },
  { label: 'unauthenticated', user: null, allowed: false },
];

beforeEach(() => {
  jest.resetAllMocks();
  database.studio_profiles.findUnique.mockResolvedValue(null);
  database.users.findUnique.mockResolvedValue(null);
  database.users.findFirst.mockResolvedValue(null);
  database.users.findMany.mockResolvedValue([]);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe.each(routes)('$label targeted role policy', route => {
  it.each(roles)('$label', async role => {
    (getServerSession as jest.Mock).mockResolvedValue(role.user ? { user: role.user } : null);
    const response = await route.run();
    const reads = [database.studio_profiles.findUnique, database.users.findUnique, database.users.findFirst, database.users.findMany];
    if (role.allowed) {
      // Synthetic absent/existing records stop after the authorized read boundary.
      expect(response.status).toBe(route.allowed);
      expect(reads.some(read => read.mock.calls.length > 0)).toBe(true);
    } else {
      expect([401, 403]).toContain(response.status);
      for (const read of reads) expect(read).not.toHaveBeenCalled();
    }
    expect(database.$transaction).not.toHaveBeenCalled();
    expect(database.users.create).not.toHaveBeenCalled();
    expect(database.users.deleteMany).not.toHaveBeenCalled();
    expect(database.studio_profiles.update).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });
});
