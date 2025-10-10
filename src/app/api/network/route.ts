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

async function getConnections(user_id: string) {
  const connections = await prisma.user_connections.findMany({
    where: {
      user_id: user_id,
      accepted: true
    },
    include: {
      connectedUser: {
        include: {
          user_profiles: true,
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

async function getSuggestions(user_id: string) {
  // Get users who are not already connected
  const existingConnections = await prisma.user_connections.findMany({
    where: {
      OR: [
        { user_id: user_id },
        { connected_user_id: user_id }
      ]
    },
    select: {
      user_id: true,
      connected_user_id: true
    }
  });

  const connected_user_ids = new Set([
    ...existingConnections.map(c => c.user_id),
    ...existingConnections.map(c => c.connected_user_id),
    user_id // Exclude self
  ]);

  // Find suggested connections based on:
  // 1. Users with studios (studio owners)
  // 2. Featured/verified users
  // 3. Users with similar locations
  const suggestions = await prisma.users.findMany({
    where: {
      id: {
        notIn: Array.from(connected_user_ids)
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
          user_profiles: {
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
      user_profiles: true,
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
      { user_profiles: { isFeatured: 'desc' } },
      { user_profiles: { isSpotlight: 'desc' } },
      { created_at: 'desc' }
    ]
  });

  return NextResponse.json({ suggestions });
}

async function getNetworkStats(user_id: string) {
  // Get total connections
  const totalConnections = await prisma.user_connections.count({
    where: {
      user_id: user_id,
      accepted: true
    }
  });

  // Get connections with studios (studio owners)
  const studioOwnerConnections = await prisma.user_connections.count({
    where: {
      user_id: user_id,
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
    WHERE uc1.user_id = ${user_id} 
      AND uc1.accepted = true 
      AND uc2.accepted = true 
      AND uc2.user_id != ${user_id}
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

async function createConnection(user_id: string, targetUserId: string) {
  // Check if connection already exists
  const existing = await prisma.user_connections.findFirst({
    where: {
      OR: [
        { user_id: user_id, connected_user_id: targetUserId },
        { user_id: targetUserId, connected_user_id: user_id }
      ]
    }
  });

  if (existing) {
    return NextResponse.json({ error: 'Connection already exists' }, { status: 400 });
  }

  // Create connection request
  const connection = await prisma.user_connections.create({
    data: {
      user_id: user_id,
      connected_user_id: targetUserId,
      accepted: false // Requires acceptance
    }
  });

  return NextResponse.json({ connection });
}

async function acceptConnection(user_id: string, targetUserId: string) {
  await prisma.user_connections.updateMany({
    where: {
      user_id: targetUserId,
      connected_user_id: user_id,
      accepted: false
    },
    data: {
      accepted: true
    }
  });

  // Create reciprocal connection
  await prisma.user_connections.upsert({
    where: {
      user_id_connected_user_id: {
        user_id: user_id,
        connected_user_id: targetUserId
      }
    },
    create: {
      user_id: user_id,
      connected_user_id: targetUserId,
      accepted: true
    },
    update: {
      accepted: true
    }
  });

  return NextResponse.json({ success: true });
}

async function declineConnection(user_id: string, targetUserId: string) {
  await prisma.user_connections.deleteMany({
    where: {
      user_id: targetUserId,
      connected_user_id: user_id,
      accepted: false
    }
  });

  return NextResponse.json({ success: true });
}

async function removeConnection(user_id: string, targetUserId: string) {
  await prisma.user_connections.deleteMany({
    where: {
      OR: [
        { user_id: user_id, connected_user_id: targetUserId },
        { user_id: targetUserId, connected_user_id: user_id }
      ]
    }
  });

  return NextResponse.json({ success: true });
}


