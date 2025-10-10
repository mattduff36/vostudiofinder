import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'connections';

    switch (type) {
      case 'connections':
        return getConnections(session.user.id);
      case 'suggestions':
        return getSuggestions(session.user.id);
      case 'stats':
        return getNetworkStats(session.user.id);
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Network API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getConnections(userId: string) {
  const connections = await prisma.userConnection.findMany({
    where: {
      userId: userId,
      accepted: true
    },
    include: {
      connectedUser: {
        include: {
          profile: true,
          studios: {
            where: { status: 'ACTIVE' },
            select: { id: true, name: true }
          },
          _count: {
            select: {
              connections: {
                where: { accepted: true }
              },
              studios: {
                where: { status: 'ACTIVE' }
              }
            }
          }
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  return NextResponse.json({ connections });
}

async function getSuggestions(userId: string) {
  // Get users who are not already connected
  const existingConnections = await prisma.userConnection.findMany({
    where: {
      OR: [
        { userId: userId },
        { connectedUserId: userId }
      ]
    },
    select: {
      userId: true,
      connectedUserId: true
    }
  });

  const connectedUserIds = new Set([
    ...existingConnections.map(c => c.userId),
    ...existingConnections.map(c => c.connectedUserId),
    userId // Exclude self
  ]);

  // Find suggested connections based on:
  // 1. Users with studios (studio owners)
  // 2. Featured/verified users
  // 3. Users with similar locations
  const suggestions = await prisma.user.findMany({
    where: {
      id: {
        notIn: Array.from(connectedUserIds)
      },
      OR: [
        {
          studios: {
            some: {
              status: 'ACTIVE'
            }
          }
        },
        {
          profile: {
            OR: [
              { isFeatured: true },
              { isSpotlight: true },
              { verificationLevel: 'verified' }
            ]
          }
        }
      ]
    },
    include: {
      profile: true,
      studios: {
        where: { status: 'ACTIVE' },
        select: { id: true, name: true }
      },
      _count: {
        select: {
          connections: {
            where: { accepted: true }
          },
          studios: {
            where: { status: 'ACTIVE' }
          }
        }
      }
    },
    take: 20,
    orderBy: [
      { profile: { isFeatured: 'desc' } },
      { profile: { isSpotlight: 'desc' } },
      { created_at: 'desc' }
    ]
  });

  return NextResponse.json({ suggestions });
}

async function getNetworkStats(userId: string) {
  // Get total connections
  const totalConnections = await prisma.userConnection.count({
    where: {
      userId: userId,
      accepted: true
    }
  });

  // Get connections with studios (studio owners)
  const studioOwnerConnections = await prisma.userConnection.count({
    where: {
      userId: userId,
      accepted: true,
      connectedUser: {
        studios: {
          some: {
            status: 'ACTIVE'
          }
        }
      }
    }
  });

  // Voice artists (users without studios)
  const voiceArtistConnections = totalConnections - studioOwnerConnections;

  // Mutual connections (simplified - users who are connected to people you're connected to)
  const mutualConnections = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT uc2.user_id) as count
    FROM user_connections uc1
    JOIN user_connections uc2 ON uc1.connected_user_id = uc2.connected_user_id
    WHERE uc1.user_id = ${userId} 
      AND uc1.accepted = true 
      AND uc2.accepted = true 
      AND uc2.user_id != ${userId}
  `;

  const stats = {
    totalConnections,
    studioOwners: studioOwnerConnections,
    voiceArtists: voiceArtistConnections,
    mutualConnections: Number(mutualConnections[0]?.count || 0)
  };

  return NextResponse.json({ stats });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId, action } = await request.json();

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    switch (action) {
      case 'connect':
        return createConnection(session.user.id, targetUserId);
      case 'accept':
        return acceptConnection(session.user.id, targetUserId);
      case 'decline':
        return declineConnection(session.user.id, targetUserId);
      case 'remove':
        return removeConnection(session.user.id, targetUserId);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Network POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function createConnection(userId: string, targetUserId: string) {
  // Check if connection already exists
  const existing = await prisma.userConnection.findFirst({
    where: {
      OR: [
        { userId: userId, connectedUserId: targetUserId },
        { userId: targetUserId, connectedUserId: userId }
      ]
    }
  });

  if (existing) {
    return NextResponse.json({ error: 'Connection already exists' }, { status: 400 });
  }

  // Create connection request
  const connection = await prisma.userConnection.create({
    data: {
      userId: userId,
      connectedUserId: targetUserId,
      accepted: false // Requires acceptance
    }
  });

  return NextResponse.json({ connection });
}

async function acceptConnection(userId: string, targetUserId: string) {
  await prisma.userConnection.updateMany({
    where: {
      userId: targetUserId,
      connectedUserId: userId,
      accepted: false
    },
    data: {
      accepted: true
    }
  });

  // Create reciprocal connection
  await prisma.userConnection.upsert({
    where: {
      userId_connectedUserId: {
        userId: userId,
        connectedUserId: targetUserId
      }
    },
    create: {
      userId: userId,
      connectedUserId: targetUserId,
      accepted: true
    },
    update: {
      accepted: true
    }
  });

  return NextResponse.json({ success: true });
}

async function declineConnection(userId: string, targetUserId: string) {
  await prisma.userConnection.deleteMany({
    where: {
      userId: targetUserId,
      connectedUserId: userId,
      accepted: false
    }
  });

  return NextResponse.json({ success: true });
}

async function removeConnection(userId: string, targetUserId: string) {
  await prisma.userConnection.deleteMany({
    where: {
      OR: [
        { userId: userId, connectedUserId: targetUserId },
        { userId: targetUserId, connectedUserId: userId }
      ]
    }
  });

  return NextResponse.json({ success: true });
}
