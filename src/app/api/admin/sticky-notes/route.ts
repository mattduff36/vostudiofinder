import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { requireApiRole } from '@/lib/auth-guards';
import { z } from 'zod';
import { readStickyNote, saveStickyNote, StickyNoteConflict } from '@/lib/admin/sticky-notes';

function failure(error: unknown, message: string) {
  const status = error instanceof Error && error.message === 'Unauthorized' ? 401
    : error instanceof Error && error.message === 'Insufficient permissions' ? 403 : 500;
  return NextResponse.json({ error: status === 401 ? 'Unauthorized' : status === 403 ? 'Admin access required' : message }, { status });
}
export async function GET() {
  try {
    await requireApiRole(Role.ADMIN);
    return NextResponse.json(await readStickyNote());
  } catch (error) { return failure(error, 'Failed to load the shared note'); }
}
export async function PUT(request: NextRequest) {
  try {
    await requireApiRole(Role.ADMIN);
    const parsed = z.object({ content: z.string().max(10_000), expectedUpdatedAt: z.iso.datetime({ offset: true }).nullable() }).strict().safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Valid content and the loaded note version are required' }, { status: 400 });
    return NextResponse.json(await saveStickyNote(parsed.data.content, parsed.data.expectedUpdatedAt));
  } catch (error) {
    if (error instanceof StickyNoteConflict) return NextResponse.json({ error: error.message, latest: error.latest }, { status: 409 });
    return failure(error, 'Failed to save the shared note');
  }
}
