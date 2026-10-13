/** @jest-environment node */
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { readStickyNote, saveStickyNote } from '@/lib/admin/sticky-notes';
jest.mock('nanoid', () => ({ nanoid: () => 'note-test' }));
jest.mock('@/lib/db', () => ({ db: { admin_sticky_notes: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn() }, $transaction: jest.fn() } }));
const database = db as any;
const now = new Date('2026-10-12T18:00:00Z');
beforeEach(() => { jest.resetAllMocks(); database.$transaction.mockImplementation((run: any) => run(database)); });
it('absent-note GET performs no creation', async () => {
  database.admin_sticky_notes.findUnique.mockResolvedValue(null);
  expect(await readStickyNote()).toEqual({ content: '', updatedAt: null });
  expect(database.admin_sticky_notes.create).not.toHaveBeenCalled();
});
it('reports an atomic first-creation conflict with the winning note', async () => {
  database.admin_sticky_notes.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: '6' }));
  database.admin_sticky_notes.findUnique.mockResolvedValue({ content: 'Other admin', updated_at: now });
  await expect(saveStickyNote('My draft', null, now)).rejects.toMatchObject({ latest: { content: 'Other admin', updatedAt: now.toISOString() } });
});
it('keeps a stale draft out of the database and returns the latest version', async () => {
  database.admin_sticky_notes.updateMany.mockResolvedValue({ count: 0 });
  database.admin_sticky_notes.findUnique.mockResolvedValue({ content: 'Newer', updated_at: new Date(now.getTime() + 1) });
  await expect(saveStickyNote('Older', now.toISOString(), now)).rejects.toMatchObject({ latest: { content: 'Newer' } });
  expect(database.admin_sticky_notes.updateMany.mock.calls[0][0].where.updated_at).toEqual(now);
});
it('advances the conditional token even for two saves in the same millisecond', async () => {
  database.admin_sticky_notes.updateMany.mockResolvedValue({ count: 1 });
  database.admin_sticky_notes.findUnique.mockResolvedValue({ content: 'Saved', updated_at: new Date(now.getTime() + 1) });
  await saveStickyNote('Saved', now.toISOString(), now);
  expect(database.admin_sticky_notes.updateMany.mock.calls[0][0].data.updated_at.getTime()).toBe(now.getTime() + 1);
});
