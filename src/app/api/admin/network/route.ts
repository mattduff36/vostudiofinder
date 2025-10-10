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
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    // Get all contacts (connections)
    const connections = await prisma.contact.findMany({
      take: limit,
      skip: offset,
      orderBy: { created_at: 'desc' },
    });

    const totalConnections = await prisma.contact.count();
    const activeConnections = await prisma.contact.count({
      where: { accepted: 1 }
    });
    const pendingConnections = await prisma.contact.count({
      where: { accepted: 0 }
    });

    // Get top connected users (this is a simplified version since we don't have the exact schema)
    // In a real implementation, you'd need to join with user data
    const topStudios: any[] = [];

    const statistics = {
      total: totalConnections,
      active: activeConnections,
      pending: pendingConnections
    };

    const pagination = {
      total: totalConnections,
      limit,
      offset,
      hasMore: offset + limit < totalConnections
    };

    return NextResponse.json({
      connections,
      topStudios,
      statistics,
      pagination
    });
  } catch (error) {
    console.error('Error fetching network data:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch network data' }), { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}