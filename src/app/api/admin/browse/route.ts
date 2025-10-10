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
  const table = searchParams.get('table');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!table) {
    return new NextResponse(JSON.stringify({ error: 'Table name is required' }), { status: 400 });
  }

  try {
    let data: any[] = [];
    let total = 0;

    // Map table names to Prisma model methods
    switch (table.toLowerCase()) {
      case 'user':
        data = await prisma.users.findMany({
          take: limit,
          skip: offset,
          orderBy: { id: 'desc' }
        });
        total = await prisma.users.count();
        break;

      case 'userprofile':
        data = await prisma.user_profiles.findMany({
          take: limit,
          skip: offset,
          orderBy: { id: 'desc' }
        });
        total = await prisma.user_profiles.count();
        break;

      case 'studio':
        data = await prisma.studios.findMany({
          take: limit,
          skip: offset,
          orderBy: { id: 'desc' }
        });
        total = await prisma.studios.count();
        break;

      case 'studioimage':
        data = await prisma.studio_images.findMany({
          take: limit,
          skip: offset,
          orderBy: { id: 'desc' }
        });
        total = await prisma.studio_images.count();
        break;

      case 'studioequipment':
        data = await prisma.studio_services.findMany({
          take: limit,
          skip: offset,
          orderBy: { id: 'desc' }
        });
        total = await prisma.studio_services.count();
        break;

      case 'studioservice':
        data = await prisma.studio_services.findMany({
          take: limit,
          skip: offset,
          orderBy: { id: 'desc' }
        });
        total = await prisma.studio_services.count();
        break;

      case 'studioavailability':
        data = await prisma.studio_services.findMany({
          take: limit,
          skip: offset,
          orderBy: { id: 'desc' }
        });
        total = await prisma.studio_services.count();
        break;

      case 'studioreview':
        data = await prisma.reviews.findMany({
          take: limit,
          skip: offset,
          orderBy: { id: 'desc' }
        });
        total = await prisma.reviews.count();
        break;

      case 'messages':
        data = await prisma.messages.findMany({
          take: limit,
          skip: offset,
          orderBy: { id: 'desc' }
        });
        total = await prisma.messages.count();
        break;

      case 'reviews':
        data = await prisma.reviews.findMany({
          take: limit,
          skip: offset,
          orderBy: { id: 'desc' }
        });
        total = await prisma.reviews.count();
        break;

      case 'faq':
        data = await prisma.faq.findMany({
          take: limit,
          skip: offset,
          orderBy: { id: 'desc' }
        });
        total = await prisma.faq.count();
        break;

      case 'contact':
        data = await prisma.contacts.findMany({
          take: limit,
          skip: offset,
          orderBy: { id: 'desc' }
        });
        total = await prisma.contacts.count();
        break;

      case 'poi':
        data = await prisma.poi.findMany({
          take: limit,
          skip: offset,
          orderBy: { id: 'desc' }
        });
        total = await prisma.poi.count();
        break;

      default:
        return new NextResponse(JSON.stringify({ error: 'Table not found' }), { status: 404 });
    }

    // Convert Decimal fields to strings for JSON serialization
    const serializedData = data.map(item => {
      const serialized: any = {};
      for (const [key, value] of Object.entries(item)) {
        if (value && typeof value === 'object' && 'toFixed' in value) {
          // This is likely a Decimal
          serialized[key] = value.toString();
        } else {
          serialized[key] = value;
        }
      }
      return serialized;
    });

    return NextResponse.json({
      data: serializedData,
      total,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error browsing table data:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Failed to fetch table data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

