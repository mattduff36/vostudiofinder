import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/studios/[id]
 * Public endpoint to fetch a single studio's full data
 * Used when displaying studio details that aren't in the current paginated results
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studioId = (await params).id;
    
    // Fetch studio with all related data
    const studio = await db.studios.findUnique({
      where: { 
        id: studioId,
        status: 'ACTIVE', // Only return active studios
        is_profile_visible: true // Only return visible profiles
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          }
        },
        studio_studio_types: {
          select: {
            studio_type: true
          }
        },
        studio_services: {
          select: {
            service: true
          }
        },
        studio_images: {
          orderBy: {
            sort_order: 'asc'
          },
          select: {
            id: true,
            image_url: true,
            alt_text: true,
            sort_order: true
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      }
    });

    if (!studio) {
      return NextResponse.json(
        { error: 'Studio not found or not available' },
        { status: 404 }
      );
    }

    // Transform to match the Studio interface used in the frontend
    const studioData = {
      id: studio.id,
      name: studio.name,
      description: studio.description || '',
      studio_studio_types: studio.studio_studio_types || [],
      address: studio.address || studio.abbreviated_address || '',
      city: studio.city,
      latitude: studio.latitude ? Number(studio.latitude) : undefined,
      longitude: studio.longitude ? Number(studio.longitude) : undefined,
      website_url: studio.website_url,
      phone: studio.phone,
      is_premium: studio.is_premium,
      is_verified: studio.is_verified,
      is_profile_visible: studio.is_profile_visible,
      studio_services: studio.studio_services || [],
      studio_images: studio.studio_images || [],
      _count: studio._count,
      owner: studio.users ? {
        id: studio.users.id,
        username: studio.users.username || '',
        display_name: studio.users.display_name,
        avatar_url: studio.users.avatar_url
      } : undefined
    };

    return NextResponse.json({ studio: studioData });

  } catch (error) {
    console.error('Error fetching studio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch studio' },
      { status: 500 }
    );
  }
}

