import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guards';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    // Require admin role
    await requireRole('ADMIN');

    const { username } = await params;

    // Find user by username
    const user = await db.users.findUnique({
      where: { username },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        studios: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            description: true,
            address: true,
            website_url: true,
            phone: true,
            status: true,
            is_verified: true,
            is_premium: true,
            latitude: true,
            longitude: true,
            created_at: true,
            updated_at: true,
            studio_studio_types: {
              select: {
                studio_type: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!user || !user.studios.length) {
      return NextResponse.json(
        { error: 'Studio not found' },
        { status: 404 }
      );
    }

    const studio = user.studios[0];

    // Format the studio data to match the expected structure
    const formattedStudio = {
      id: studio.id,
      name: studio.name,
      description: studio.description,
      studio_type: studio.studio_studio_types[0]?.studio_type || 'VOICEOVER',
      studioTypes: studio.studio_studio_types.map(st => ({ studio_type: st.studio_type })),
      status: studio.status,
      is_verified: studio.is_verified,
      is_premium: studio.is_premium,
      address: studio.address,
      website_url: studio.website_url,
      phone: studio.phone,
      users: {
        display_name: user.display_name,
        email: user.email,
        username: user.username || '',
      },
      created_at: studio.created_at.toISOString(),
      updated_at: studio.updated_at.toISOString(),
    };

    return NextResponse.json({ studio: formattedStudio });
  } catch (error) {
    console.error('Error fetching studio by username:', error);
    return NextResponse.json(
      { error: 'Failed to fetch studio' },
      { status: 500 }
    );
  }
}

