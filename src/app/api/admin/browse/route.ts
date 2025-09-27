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
        data = await prisma.user.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        total = await prisma.user.count();
        break;

      case 'userprofile':
        data = await prisma.userProfile.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        total = await prisma.userProfile.count();
        break;

      case 'studio':
        data = await prisma.studio.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        total = await prisma.studio.count();
        break;

      case 'studioimage':
        data = await prisma.studioImage.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        total = await prisma.studioImage.count();
        break;

      case 'studioequipment':
        data = await prisma.studioEquipment.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        total = await prisma.studioEquipment.count();
        break;

      case 'studioservice':
        data = await prisma.studioService.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        total = await prisma.studioService.count();
        break;

      case 'studioavailability':
        data = await prisma.studioAvailability.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        total = await prisma.studioAvailability.count();
        break;

      case 'studioreview':
        data = await prisma.studioReview.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        total = await prisma.studioReview.count();
        break;

      case 'messages':
        data = await prisma.messages.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        total = await prisma.messages.count();
        break;

      case 'reviews':
        data = await prisma.reviews.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        total = await prisma.reviews.count();
        break;

      case 'faq':
        data = await prisma.faq.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        total = await prisma.faq.count();
        break;

      case 'contact':
        data = await prisma.contact.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        total = await prisma.contact.count();
        break;

      case 'poi':
        data = await prisma.poi.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
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
