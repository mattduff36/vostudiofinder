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
        studio_profiles: {
          select: {
            location: true,
            name: true,
            last_name: true,
            city: true,
            latitude: true,
            longitude: true,
            status: true
          }
        }
      },
      take: 10
    });

    // Format users for suggestions
    const formattedUsers = users.map(user => {
      // Use city for location display
      const cityLocation = user.studio_profiles?.city || user.studio_profiles?.location || null;
      const coordinates = user.studio_profiles?.latitude && user.studio_profiles?.longitude
        ? { 
            lat: user.studio_profiles.latitude.toNumber(), 
            lng: user.studio_profiles.longitude.toNumber() 
          }
        : null;

      return {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        location: cityLocation,
        // REMOVED: full_location - privacy risk (exposes full home address)
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

