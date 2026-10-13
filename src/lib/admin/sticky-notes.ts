import { Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';

export interface StickyNoteValue { content: string; updatedAt: string | null }
export class StickyNoteConflict extends Error {
  constructor(public readonly latest: StickyNoteValue) { super('The shared note changed. Review the latest version before saving your draft.'); }
}
export function noteValue(note: { content: string; updated_at: Date } | null): StickyNoteValue {
  return { content: note?.content ?? '', updatedAt: note?.updated_at.toISOString() ?? null };
}
export async function readStickyNote() { return noteValue(await db.admin_sticky_notes.findUnique({ where: { key: 'global' } })); }

export async function saveStickyNote(content: string, expectedUpdatedAt: string | null, now = new Date()) {
  if (expectedUpdatedAt === null) {
    try { return noteValue(await db.admin_sticky_notes.create({ data: { id: nanoid(), key: 'global', content, updated_at: now } })); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      throw new StickyNoteConflict(await readStickyNote());
    }
  }
  return db.$transaction(async tx => {
    const expected = new Date(expectedUpdatedAt);
    const version = new Date(Math.max(now.getTime(), expected.getTime() + 1));
    const changed = await tx.admin_sticky_notes.updateMany({ where: { key: 'global', updated_at: expected }, data: { content, updated_at: version } });
    const latest = noteValue(await tx.admin_sticky_notes.findUnique({ where: { key: 'global' } }));
    if (!changed.count) throw new StickyNoteConflict(latest);
    return latest;
  });
}
