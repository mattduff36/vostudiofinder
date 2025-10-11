import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { abbreviateAddress } from '@/lib/utils/address';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Search for users by username or display name
    const users = await db.users.findMany({
      where: {
        OR: [
          {
            username: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            display_name: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        user_profiles: {
          select: {
            location: true,
            studio_name: true,
            last_name: true
          }
        },
        studios: {
          select: {
            address: true,
            latitude: true,
            longitude: true
          },
          where: {
            status: 'ACTIVE'
          },
          take: 1
        }
      },
      take: 10
    });

    // Format users for suggestions
    const formattedUsers = users.map(user => {
      // Prioritize studio address over profile location
      const fullLocation = user.studios?.[0]?.address || user.user_profiles?.location || null;
      const abbreviatedLocation = fullLocation ? abbreviateAddress(fullLocation) : null;
      const coordinates = user.studios?.[0]?.latitude && user.studios?.[0]?.longitude
        ? { 
            lat: user.studios[0].latitude.toNumber(), 
            lng: user.studios[0].longitude.toNumber() 
          }
        : null;

      return {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        location: abbreviatedLocation,
        full_location: fullLocation, // Keep full location for geocoding if needed
        coordinates
      };
    });

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}

