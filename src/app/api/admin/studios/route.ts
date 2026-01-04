import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateProfileCompletion } from '@/lib/profile-completion';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { users: { display_name: { contains: search, mode: 'insensitive' } } },
        { users: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    // Get studio profiles with pagination
    const [studios, total] = await Promise.all([
      db.studio_profiles.findMany({
        where,
        include: {
          users: {
            select: {
              display_name: true,
              email: true,
              username: true,
              avatar_url: true,
              created_at: true,
              updated_at: true,
            }
          },
          studio_studio_types: {
            select: {
              studio_type: true
            }
          },
          studio_images: {
            select: {
              id: true,
            }
          },
          user_profiles: {
            select: {
              short_about: true,
              about: true,
              phone: true,
              location: true,
              equipment_list: true,
              services_offered: true,
              facebook_url: true,
              twitter_url: true,
              linkedin_url: true,
              instagram_url: true,
              youtube_url: true,
              vimeo_url: true,
              soundcloud_url: true,
              threads_url: true,
              tiktok_url: true,
              connection1: true,
              connection2: true,
              connection3: true,
              connection4: true,
              connection5: true,
              connection6: true,
              connection7: true,
              connection8: true,
            }
          },
          rate_tiers: {
            select: {
              tier_1: true,
            },
            take: 1,
          }
        },
        orderBy: { updated_at: 'desc' },
        take: limit,
        skip: offset
      }),
      db.studio_profiles.count({ where })
    ]);

    const hasMore = offset + limit < total;

    // Serialize Decimal fields and calculate profile completion
    const serializedStudios = studios.map(studio => {
      const userProfile = studio.user_profiles || {};
      const rateTier = studio.rate_tiers?.[0];
      
      // Calculate profile completion
      const profileCompletion = calculateProfileCompletion({
        username: studio.users.username,
        display_name: studio.users.display_name,
        email: studio.users.email,
        studio_name: studio.name,
        short_about: userProfile.short_about || undefined,
        about: userProfile.about || undefined,
        phone: userProfile.phone || undefined,
        location: userProfile.location || undefined,
        website_url: studio.website_url || undefined,
        equipment_list: userProfile.equipment_list || undefined,
        services_offered: userProfile.services_offered || undefined,
        avatar_url: studio.users.avatar_url || undefined,
        studio_types_count: studio.studio_studio_types?.length || 0,
        images_count: studio.studio_images?.length || 0,
        rate_tier_1: rateTier?.tier_1 ? Number(rateTier.tier_1) : null,
        facebook_url: userProfile.facebook_url || undefined,
        twitter_url: userProfile.twitter_url || undefined,
        linkedin_url: userProfile.linkedin_url || undefined,
        instagram_url: userProfile.instagram_url || undefined,
        youtube_url: userProfile.youtube_url || undefined,
        vimeo_url: userProfile.vimeo_url || undefined,
        soundcloud_url: userProfile.soundcloud_url || undefined,
        connection1: userProfile.connection1 || undefined,
        connection2: userProfile.connection2 || undefined,
        connection3: userProfile.connection3 || undefined,
        connection4: userProfile.connection4 || undefined,
        connection5: userProfile.connection5 || undefined,
        connection6: userProfile.connection6 || undefined,
        connection7: userProfile.connection7 || undefined,
        connection8: userProfile.connection8 || undefined,
      });
      
      return {
        ...studio,
        latitude: studio.latitude ? Number(studio.latitude) : null,
        longitude: studio.longitude ? Number(studio.longitude) : null,
        profile_completion: profileCompletion,
        // Note: last_login not available yet - needs to be added to users table
        last_login: null,
      };
    });

    return NextResponse.json({
      studios: serializedStudios,
      pagination: {
        total,
        hasMore
      }
    });

  } catch (error) {
    console.error('Admin studios API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
