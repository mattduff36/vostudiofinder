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
        const activateResult = await prisma.studio.updateMany({
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
        const deactivateResult = await prisma.studio.updateMany({
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
        const deleteResult = await prisma.studio.deleteMany({
          where: { id: { in: studioIds } }
        });
        result = {
          success: true,
          message: `Successfully deleted ${deleteResult.count} studio(s)`,
          affectedCount: deleteResult.count
        };
        break;

      case 'export':
        // Get studio data for export
        const exportResult = await prisma.studio.findMany({
          where: { id: { in: studioIds } },
          include: {
            owner: {
              include: {
                profile: true
              }
            }
          },
          orderBy: { name: 'asc' }
        });

        // Transform to match expected CSV format
        const csvData = generateCSV(exportResult.map(studio => ({
          id: studio.id,
          username: studio.owner?.username || '',
          display_name: studio.name || '',
          email: studio.owner?.email || '',
          status: studio.status.toLowerCase(),
          joined: studio.createdAt,
          avatar_url: studio.owner?.avatarUrl || ''
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
