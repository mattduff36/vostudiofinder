import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Search for users by username or display name
    const users = await db.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            displayName: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        profile: {
          select: {
            location: true,
            firstName: true,
            lastName: true
          }
        }
      },
      take: 10
    });

    // Format users for suggestions
    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      location: user.profile?.location || null,
      coordinates: null // We'll need to geocode this if needed
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
