import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { owner: { display_name: { contains: search, mode: 'insensitive' } } },
        { owner: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    // Get studios with pagination
    const [studios, total] = await Promise.all([
      db.studios.findMany({
        where,
        include: {
          users: {
            select: {
              display_name: true,
              email: true,
              username: true
            }
          },
          studioTypes: {
            select: {
              studio_type: true
            }
          }
        },
        orderBy: { updated_at: 'desc' },
        take: limit,
        skip: offset
      }),
      db.studios.count({ where })
    ]);

    const hasMore = offset + limit < total;

    // Serialize Decimal fields for JSON response
    const serializedStudios = studios.map(studio => ({
      ...studio,
      latitude: studio.latitude ? Number(studio.latitude) : null,
      longitude: studio.longitude ? Number(studio.longitude) : null,
    }));

    return NextResponse.json({
      studios: serializedStudios,
      pagination: {
        total,
        hasMore
      }
    });

  } catch (error) {
    console.error('Admin studios API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
