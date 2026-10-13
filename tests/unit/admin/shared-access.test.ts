/** @jest-environment node */
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { GET, PUT } from '@/app/api/admin/sticky-notes/route';
import { readStickyNote, saveStickyNote } from '@/lib/admin/sticky-notes';
import { db } from '@/lib/db';
import { requireSupportAdmin } from '@/lib/admin/support/replies';
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/email/email-service', () => ({}));
jest.mock('@/lib/db', () => ({ db: { users: { findUnique: jest.fn() } } }));
jest.mock('@/lib/admin/sticky-notes', () => ({ readStickyNote: jest.fn(), saveStickyNote: jest.fn(), StickyNoteConflict: class extends Error {} }));
const admin = { id: 'admin-fixture', role: 'ADMIN', email: 'admin-fixture@example.test', username: 'fixture' };
beforeEach(() => { jest.clearAllMocks(); (readStickyNote as jest.Mock).mockResolvedValue({ content: 'Saved', updatedAt: null }); (saveStickyNote as jest.Mock).mockResolvedValue({ content: 'Changed', updatedAt: '2026-10-12T18:00:00Z' }); });
it.each([
  ['ordinary admin', admin, 200],
  ['verified owner 1 admin', { ...admin, email: 'admin@mpdee.co.uk', username: 'mpdee' }, 200],
  ['verified owner 2 admin', { ...admin, email: 'guy@voiceoverguy.co.uk', username: 'VoiceoverGuy' }, 200],
  ['nonadmin using former email exception', { ...admin, role: 'USER', email: 'admin@mpdee.co.uk' }, 403],
  ['nonadmin using former username exception', { ...admin, role: 'USER', username: 'VoiceoverGuy' }, 403],
  ['unrelated member', { ...admin, role: 'USER' }, 403],
  ['unauthenticated', null, 401],
])('uses the existing ADMIN guard for note GET and PUT: %s', async (_label, user, status) => {
  (getServerSession as jest.Mock).mockResolvedValue(user ? { user } : null);
  expect((await GET()).status).toBe(status);
  expect((await PUT(new NextRequest('http://fixture.test/api/admin/sticky-notes', { method: 'PUT', body: JSON.stringify({ content: 'Changed', expectedUpdatedAt: null }) }))).status).toBe(status);
  if (status !== 200) { expect(readStickyNote).not.toHaveBeenCalled(); expect(saveStickyNote).not.toHaveBeenCalled(); }
});
it('rejects a missing conditional note version before persistence', async () => {
  (getServerSession as jest.Mock).mockResolvedValue({ user: admin });
  expect((await PUT(new NextRequest('http://fixture.test/api/admin/sticky-notes', { method: 'PUT', body: JSON.stringify({ content: 'Unconditional' }) }))).status).toBe(400);
  expect(saveStickyNote).not.toHaveBeenCalled();
});
it('keeps support authorization tied to the stored role even with an ADMIN session claim', async () => {
  (getServerSession as jest.Mock).mockResolvedValue({ user: admin });
  (db.users.findUnique as jest.Mock).mockResolvedValue({ role: 'USER' });
  await expect(requireSupportAdmin()).rejects.toMatchObject({ status: 403 });
  (db.users.findUnique as jest.Mock).mockResolvedValue({ role: 'ADMIN' });
  await expect(requireSupportAdmin()).resolves.toBe(admin.id);
});
