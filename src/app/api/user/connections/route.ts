import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const connectionRequestSchema = z.object({
  targetUserId: z.string(),
  action: z.enum(['connect', 'accept', 'reject', 'block']),
});

const connectionDeleteSchema = z.object({
  targetUserId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetUserId, action } = connectionRequestSchema.parse(body);

    if (targetUserId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot connect to yourself' },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await db.users.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if connection already exists
    const existingConnection = await db.user_connections.findFirst({
      where: {
        OR: [
          { userId: session.user.id, connectedUserId: targetUserId },
          { userId: targetUserId, connectedUserId: session.user.id },
        ],
      },
    });

    if (existingConnection && action === 'connect') {
      return NextResponse.json(
        { error: 'Connection already exists or pending' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'connect': {
        // Send connection request
        const connection = await db.user_connections.create({
          data: {
            userId: session.user.id,
            connectedUserId: targetUserId,
            accepted: false, // Pending connection request
          },
        });

        // TODO: Send notification to target user

        return NextResponse.json({
          success: true,
          connection,
        });
      }

      case 'accept': {
        if (!existingConnection || existingConnection.accepted) {
          return NextResponse.json(
            { error: 'No pending connection request found' },
            { status: 400 }
          );
        }

        // Only the recipient can accept
        if (existingConnection.connectedUserId !== session.user.id) {
          return NextResponse.json(
            { error: 'You can only accept requests sent to you' },
            { status: 403 }
          );
        }

        const updatedConnection = await db.user_connections.update({
          where: { id: existingConnection.id },
          data: {
            accepted: true,
          },
        });

        return NextResponse.json({
          success: true,
          connection: updatedConnection,
        });
      }

      case 'reject': {
        if (!existingConnection || existingConnection.accepted) {
          return NextResponse.json(
            { error: 'No pending connection request found' },
            { status: 400 }
          );
        }

        // Only the recipient can reject
        if (existingConnection.connectedUserId !== session.user.id) {
          return NextResponse.json(
            { error: 'You can only reject requests sent to you' },
            { status: 403 }
          );
        }

        await db.user_connections.delete({
          where: { id: existingConnection.id },
        });

        return NextResponse.json({ success: true });
      }

      case 'block': {
        // Block user (delete existing connection and create block record)
        if (existingConnection) {
          await db.user_connections.delete({
            where: { id: existingConnection.id },
          });
        }

        // TODO: Implement proper blocking functionality
        // For now, we'll just prevent connections by not creating a record
        // In a full implementation, you might want a separate BlockedUser model
        console.log(`User ${session.user.id} attempted to block user ${targetUserId}`);

        return NextResponse.json({
          success: true,
          message: 'User blocked successfully',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Connection request error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'PENDING' | 'ACCEPTED' | 'BLOCKED' | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { userId: session.user.id },
        { connectedUserId: session.user.id },
      ],
    };

    if (status) {
      if (status === 'ACCEPTED') {
        where.accepted = true;
      } else if (status === 'PENDING') {
        where.accepted = false;
      }
      // For other status values, no filtering is applied
    }

    const [connections, totalCount] = await Promise.all([
      db.user_connections.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              display_name: true,
              username: true,
              avatar_url: true,
              role: true,
            },
          },
          connectedUser: {
            select: {
              id: true,
              display_name: true,
              username: true,
              avatar_url: true,
              role: true,
            },
          },
        },
      }),
      db.user_connections.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      connections,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetUserId } = connectionDeleteSchema.parse(body);

    // Find and delete connection
    const connection = await db.user_connections.findFirst({
      where: {
        OR: [
          { userId: session.user.id, connectedUserId: targetUserId },
          { userId: targetUserId, connectedUserId: session.user.id },
        ],
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    await db.user_connections.delete({
      where: { id: connection.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting connection:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
}


