import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { encodeCsv } from '@/lib/csv';

const bulkSchema = z.object({ action: z.enum(['activate', 'deactivate', 'delete', 'export']), studioIds: z.array(z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/)).min(1).max(400).transform(ids => [...new Set(ids)]) });

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Choose a valid action and between 1 and 400 studios.' }, { status: 400 });
    const { action, studioIds } = parsed.data;
    if (action !== 'export') {
      const result = await prisma.$transaction(async tx => {
        const matched = await tx.studio_profiles.findMany({ where: { id: { in: studioIds } }, select: { id: true, user_id: true } });
        const processedIds = matched.map(studio => studio.id);
        if (action === 'delete') {
          const removed = await tx.users.deleteMany({ where: { id: { in: [...new Set(matched.map(studio => studio.user_id))] } } });
          return { success: true, processedIds, affectedCount: processedIds.length,
            message: `Deleted ${processedIds.length} selected studio(s) and ${removed.count} associated user account(s).` };
        }
        await tx.studio_profiles.updateMany({ where: { id: { in: processedIds } }, data: { status: action === 'activate' ? 'ACTIVE' : 'INACTIVE' } });
        return { success: true, processedIds, affectedCount: processedIds.length,
          message: `${action === 'activate' ? 'Activated' : 'Deactivated'} ${processedIds.length} studio(s).` };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
      return NextResponse.json(result);
    }

    switch (action) {
      case 'export':
        // Get studio data for export
        const exportResult = await prisma.studio_profiles.findMany({
          where: { id: { in: studioIds } },
          include: {
            users: {
              select: {
                id: true,
                display_name: true,
                username: true,
                email: true,
                avatar_url: true
              }
            }
          },
          orderBy: { name: 'asc' }
        });

        // Transform to match expected CSV format
        const csvData = generateCSV(exportResult.map(studio => ({
          id: studio.id,
          username: studio.users?.username || '',
          display_name: studio.name || '',
          email: studio.users?.email || '',
          status: studio.status.toLowerCase(),
          joined: studio.created_at,
          avatar_url: studio.users?.avatar_url || ''
        })));
        
        return new NextResponse(csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="studios_export_${new Date().toISOString().split('T')[0]}.csv"`
          }
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Bulk operations API error:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}

function generateCSV(data: Array<Record<string, unknown>>) {
  if (!data.length) return 'No data available';
  const headers = Object.keys(data[0]!);
  return encodeCsv([headers, ...data.map(row => headers.map(header => {
    const value = row[header]; return value instanceof Date ? value.toISOString() : value;
  }))]);
}
