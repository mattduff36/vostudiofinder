import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    const { action, studioIds } = await request.json();

    if (!action || !Array.isArray(studioIds) || studioIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: action and studioIds are required' },
        { status: 400 }
      );
    }

    let result = { success: false, message: '', affectedCount: 0 };

    switch (action) {
      case 'activate':
        const activateResult = await prisma.studio_profiles.updateMany({
          where: { id: { in: studioIds } },
          data: { status: 'ACTIVE' }
        });
        result = {
          success: true,
          message: `Successfully activated ${activateResult.count} studio(s)`,
          affectedCount: activateResult.count
        };
        break;

      case 'deactivate':
        const deactivateResult = await prisma.studio_profiles.updateMany({
          where: { id: { in: studioIds } },
          data: { status: 'INACTIVE' }
        });
        result = {
          success: true,
          message: `Successfully deactivated ${deactivateResult.count} studio(s)`,
          affectedCount: deactivateResult.count
        };
        break;

      case 'delete':
        // Get user IDs for the studios to be deleted
        const studiosToDelete = await prisma.studio_profiles.findMany({
          where: { id: { in: studioIds } },
          select: { user_id: true }
        });
        
        const userIdsToDelete = studiosToDelete.map(s => s.user_id);
        
        // Delete users (studios and all related data will cascade delete)
        const deleteResult = await prisma.users.deleteMany({
          where: { id: { in: userIdsToDelete } }
        });
        
        result = {
          success: true,
          message: `Successfully deleted ${deleteResult.count} studio(s) and user account(s)`,
          affectedCount: deleteResult.count
        };
        break;

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

    return NextResponse.json(result);
  } catch (error) {
    console.error('Bulk operations API error:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}

function generateCSV(data: any[]) {
  if (!data || data.length === 0) {
    return 'No data available';
  }

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}

