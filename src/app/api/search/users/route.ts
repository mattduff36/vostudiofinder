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
            full_address: true,
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
      // Prioritize studio address over profile location
      const fullLocation = user.studio_profiles?.full_address || user.studio_profiles?.location || null;
      const abbreviatedLocation = fullLocation ? abbreviateAddress(fullLocation) : null;
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

