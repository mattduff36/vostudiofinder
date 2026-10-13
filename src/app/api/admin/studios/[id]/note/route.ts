import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { requireApiRole } from '@/lib/auth-guards';
import { db } from '@/lib/db';
import { adminNoteKey, parseAdminNote } from '@/lib/admin/studios/admin-details';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(Role.ADMIN);
    const parsed = z.object({ text: z.string().trim().max(500), expectedVersion: z.iso.datetime({ offset: true }).nullable() }).strict().safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'A note of up to 500 characters and its loaded version are required.' }, { status: 400 });
    const { id } = await params;
    const result = await db.$transaction(async tx => {
      const studio = await tx.studio_profiles.findUnique({ where: { id }, select: { user_id: true } });
      if (!studio) return { status: 404, body: { error: 'Studio not found.' } };
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${studio.user_id} FOR UPDATE`;
      const owner = await tx.studio_profiles.findUnique({ where: { id }, select: { user_id: true } });
      if (owner?.user_id !== studio.user_id) return { status: 409, body: { error: 'Studio ownership changed. Reload before saving.' } };
      const existing = await tx.admin_sticky_notes.findUnique({ where: { key: adminNoteKey(studio.user_id) } });
      const latest = parseAdminNote(existing ?? undefined);
      if (latest.version !== parsed.data.expectedVersion) return { status: 409, body: { error: 'Another admin changed this note. Review the latest note before saving.', latest } };
      const now = new Date(Math.max(Date.now(), (existing?.updated_at.getTime() ?? 0) + 1));
      const content = JSON.stringify({ text: parsed.data.text, updatedAt: now.toISOString(), authorId: session.user.id });
      const saved = await tx.admin_sticky_notes.upsert({ where: { key: adminNoteKey(studio.user_id) },
        create: { id: randomUUID(), key: adminNoteKey(studio.user_id), content, updated_at: now }, update: { content, updated_at: now } });
      return { status: 200, body: { note: parseAdminNote(saved) } };
    });
    return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : error instanceof Error && error.message === 'Insufficient permissions' ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? 'Unauthorized' : status === 403 ? 'Admin access required' : 'Unable to save the note. Reload before retrying.' }, { status });
  }
}
