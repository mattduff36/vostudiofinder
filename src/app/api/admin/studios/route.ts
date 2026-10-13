import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { ADMIN_STUDIO_SELECT, serializeAdminStudio, studioListEnforcementInput } from '@/lib/admin/studios/summary';
import { addAdminStudioDetails } from '@/lib/admin/studios/admin-details';
import { STUDIO_MAX_WINDOW } from '@/components/admin/studios/types';
import { studioListQuerySchema, sortDerivedStudios } from '@/lib/admin/studios/list-query';
import { computeEnforcementDecisions, applyEnforcementDecisions } from '@/lib/subscriptions/enforcement';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const params = new URL(request.url).searchParams;
    // A targeted summary deliberately ignores current list filters/range/sort.
    const raw = params.has('studioId') ? { studioId: params.get('studioId'), limit: 1 } : Object.fromEntries(params);
    const parsed = studioListQuerySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid studio list range or filter', details: parsed.error.flatten() }, { status: 400 });
    const { studioId, limit, offset, search, status, sortBy, sortOrder } = parsed.data;
    const where: Prisma.studio_profilesWhereInput = studioId ? { id: studioId } : {
      ...(search ? { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { users: { display_name: { contains: search, mode: 'insensitive' } } },
        { users: { email: { contains: search, mode: 'insensitive' } } },
      ] } : {}),
      ...(status && status !== 'all' ? { status } : {}),
    };
    const ordering: Record<string, Prisma.studio_profilesOrderByWithRelationInput> = {
      name: { name: sortOrder }, owner: { users: { display_name: sortOrder } },
      status: { status: sortOrder }, updated_at: { updated_at: sortOrder },
      is_profile_visible: { is_profile_visible: sortOrder }, is_verified: { is_verified: sortOrder },
      is_featured: { is_featured: sortOrder }, admin_review: { admin_review: sortOrder },
      last_login: { users: { last_login: { sort: sortOrder, nulls: 'last' } } },
    };
    const derived = sortBy === 'profile_completion' || sortBy === 'membership_expires_at';
    const query = {
      where, select: ADMIN_STUDIO_SELECT,
      orderBy: [ordering[sortBy] ?? { updated_at: 'desc' as const }, { id: 'asc' as const }],
      ...(derived ? {} : { take: limit, skip: offset }),
    };
    // Preserve the existing candidate scope (all matches for derived ordering,
    // otherwise the requested range), and only its existing Featured expiry writes.
    const candidates = await db.studio_profiles.findMany(query);
    await applyEnforcementDecisions(computeEnforcementDecisions(candidates.map(studioListEnforcementInput)));
    // A default ReadCommitted transaction would permit rows/count to disagree.
    // Read again AFTER enforcement, from one response-scoped RepeatableRead snapshot.
    const result = await db.$transaction(async tx => {
      const rows = await tx.studio_profiles.findMany(query);
      const total = await tx.studio_profiles.count({ where });
      let studios = rows.map(serializeAdminStudio);
      if (derived) studios = sortDerivedStudios(studios, sortBy, sortOrder).slice(offset, offset + limit);
      studios = await addAdminStudioDetails(tx, studios);
      return { studios, pagination: { total, offset, limit, returned: studios.length,
        hasMore: offset + studios.length < total, maxLimit: STUDIO_MAX_WINDOW } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Unable to load studios. Please retry.' }, { status: 500 });
  }
}
