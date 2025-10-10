import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';

  try {
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const venues = await prisma.poi.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
    });

    // Calculate statistics
    const total = venues.length;
    const withCoords = venues.filter(v => v.latitude && v.longitude).length;

    // Calculate center point (simple average)
    const coordVenues = venues.filter(v => v.latitude && v.longitude);
    let centerLat = 51.5074; // Default to London
    let centerLon = -0.1278;
    
    if (coordVenues.length > 0) {
      centerLat = coordVenues.reduce((sum, v) => sum + parseFloat(v.latitude!.toString()), 0) / coordVenues.length;
      centerLon = coordVenues.reduce((sum, v) => sum + parseFloat(v.longitude!.toString()), 0) / coordVenues.length;
    }

    return NextResponse.json({
      venues,
      statistics: {
        total,
        withCoords,
        center: {
          lat: centerLat,
          lon: centerLon
        }
      }
    });
  } catch (error) {
    console.error('Error fetching venues:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch venues' }), { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
