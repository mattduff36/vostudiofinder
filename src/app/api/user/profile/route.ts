import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/user/profile
 * Fetch complete profile data for the authenticated user
 * 
 * Returns:
 * - User basic info (email, username, display_name, etc.)
 * - User profile (extended data from user_profiles table)
 * - Studio information (if user owns a studio)
 * - Studio types, services, and images
 * - User metadata
 */
export async function GET() {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch user with all related data
    const user = await db.users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: true,
        user_metadata: true,
        studios: {
          where: { status: 'ACTIVE' },
          include: {
            studio_studio_types: {
              select: {
                id: true,
                studio_type: true,
              },
            },
            studio_services: {
              select: {
                id: true,
                service: true,
              },
            },
            studio_images: {
              orderBy: { sort_order: 'asc' },
              select: {
                id: true,
                image_url: true,
                alt_text: true,
                sort_order: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get primary studio (first active studio)
    const studio = user.studios?.[0] || null;

    // Transform metadata array into key-value object
    const metadata: Record<string, string> = {};
    user.user_metadata?.forEach((meta) => {
      metadata[meta.key] = meta.value || '';
    });

    // Prepare response
    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          role: user.role,
          email_verified: user.email_verified,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        profile: user.user_profiles ? {
          id: user.user_profiles.id,
          user_id: user.user_profiles.user_id,
          phone: user.user_profiles.phone,
          about: user.user_profiles.about,
          short_about: user.user_profiles.short_about,
          location: user.user_profiles.location,
          rate_tier_1: user.user_profiles.rate_tier_1 ? Number(user.user_profiles.rate_tier_1) : null,
          rate_tier_2: user.user_profiles.rate_tier_2 ? Number(user.user_profiles.rate_tier_2) : null,
          rate_tier_3: user.user_profiles.rate_tier_3 ? Number(user.user_profiles.rate_tier_3) : null,
          show_rates: user.user_profiles.show_rates,
          facebook_url: user.user_profiles.facebook_url,
          twitter_url: user.user_profiles.twitter_url,
          x_url: user.user_profiles.x_url,
          linkedin_url: user.user_profiles.linkedin_url,
          instagram_url: user.user_profiles.instagram_url,
          tiktok_url: user.user_profiles.tiktok_url,
          threads_url: user.user_profiles.threads_url,
          youtube_url: user.user_profiles.youtube_url,
          vimeo_url: user.user_profiles.vimeo_url,
          soundcloud_url: user.user_profiles.soundcloud_url,
          connection1: user.user_profiles.connection1,
          connection2: user.user_profiles.connection2,
          connection3: user.user_profiles.connection3,
          connection4: user.user_profiles.connection4,
          connection5: user.user_profiles.connection5,
          connection6: user.user_profiles.connection6,
          connection7: user.user_profiles.connection7,
          connection8: user.user_profiles.connection8,
          connection9: user.user_profiles.connection9,
          connection10: user.user_profiles.connection10,
          connection11: user.user_profiles.connection11,
          connection12: user.user_profiles.connection12,
          custom_connection_methods: user.user_profiles.custom_connection_methods || [],
          show_email: user.user_profiles.show_email,
          show_phone: user.user_profiles.show_phone,
          show_address: user.user_profiles.show_address,
          show_directions: user.user_profiles.show_directions,
          is_crb_checked: user.user_profiles.is_crb_checked,
          is_featured: user.user_profiles.is_featured,
          is_spotlight: user.user_profiles.is_spotlight,
          verification_level: user.user_profiles.verification_level,
          home_studio_description: user.user_profiles.home_studio_description,
          equipment_list: user.user_profiles.equipment_list,
          services_offered: user.user_profiles.services_offered,
          studio_name: user.user_profiles.studio_name,
          created_at: user.user_profiles.created_at,
          updated_at: user.user_profiles.updated_at,
        } : null,
        studio: studio ? {
          id: studio.id,
          owner_id: studio.owner_id,
          name: studio.name,
          description: studio.description,
          address: studio.address, // Legacy field
          full_address: studio.full_address,
          abbreviated_address: studio.abbreviated_address,
          latitude: studio.latitude ? Number(studio.latitude) : null,
          longitude: studio.longitude ? Number(studio.longitude) : null,
          website_url: studio.website_url,
          phone: studio.phone,
          is_premium: studio.is_premium,
          is_verified: studio.is_verified,
          is_profile_visible: studio.is_profile_visible,
          status: studio.status,
          created_at: studio.created_at,
          updated_at: studio.updated_at,
          studio_types: studio.studio_studio_types?.map(st => st.studio_type) || [],
          services: studio.studio_services?.map(ss => ss.service) || [],
          images: studio.studio_images || [],
        } : null,
        metadata,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/profile
 * Update user profile (supports partial updates)
 * 
 * Request body:
 * - user: { display_name?, username? }
 * - profile: { phone?, about?, short_about?, location?, rates, social media, connections, etc. }
 * - studio: { name?, description?, address?, website_url?, phone? }
 * - studio_types: string[]
 * - services: string[]
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();

    // Update users table if needed
    if (body.user) {
      const userUpdates: any = {};
      if (body.user.display_name !== undefined) userUpdates.display_name = body.user.display_name;
      if (body.user.avatar_url !== undefined) userUpdates.avatar_url = body.user.avatar_url;
      if (body.user.username !== undefined) {
        // Check if username is already taken by another user
        const existingUser = await db.users.findUnique({
          where: { username: body.user.username },
        });
        if (existingUser && existingUser.id !== userId) {
          return NextResponse.json(
            { success: false, error: 'Username is already taken' },
            { status: 409 }
          );
        }
        userUpdates.username = body.user.username;
      }

      if (Object.keys(userUpdates).length > 0) {
        await db.users.update({
          where: { id: userId },
          data: userUpdates,
        });
      }
    }

    // Update user_profiles table if needed
    if (body.profile) {
      const profileUpdates: any = {};
      
      // Text fields
      if (body.profile.phone !== undefined) profileUpdates.phone = body.profile.phone;
      if (body.profile.about !== undefined) profileUpdates.about = body.profile.about;
      if (body.profile.short_about !== undefined) profileUpdates.short_about = body.profile.short_about;
      if (body.profile.location !== undefined) profileUpdates.location = body.profile.location;
      
      // Rate fields (convert numbers to strings for database)
      if (body.profile.rate_tier_1 !== undefined) {
        profileUpdates.rate_tier_1 = body.profile.rate_tier_1 !== null ? String(body.profile.rate_tier_1) : null;
      }
      if (body.profile.rate_tier_2 !== undefined) {
        profileUpdates.rate_tier_2 = body.profile.rate_tier_2 !== null ? String(body.profile.rate_tier_2) : null;
      }
      if (body.profile.rate_tier_3 !== undefined) {
        profileUpdates.rate_tier_3 = body.profile.rate_tier_3 !== null ? String(body.profile.rate_tier_3) : null;
      }
      if (body.profile.show_rates !== undefined) profileUpdates.show_rates = body.profile.show_rates;
      
      // Social media fields
      if (body.profile.facebook_url !== undefined) profileUpdates.facebook_url = body.profile.facebook_url;
      if (body.profile.twitter_url !== undefined) profileUpdates.twitter_url = body.profile.twitter_url;
      if (body.profile.x_url !== undefined) profileUpdates.x_url = body.profile.x_url;
      if (body.profile.linkedin_url !== undefined) profileUpdates.linkedin_url = body.profile.linkedin_url;
      if (body.profile.instagram_url !== undefined) profileUpdates.instagram_url = body.profile.instagram_url;
      if (body.profile.tiktok_url !== undefined) profileUpdates.tiktok_url = body.profile.tiktok_url;
      if (body.profile.threads_url !== undefined) profileUpdates.threads_url = body.profile.threads_url;
      if (body.profile.youtube_url !== undefined) profileUpdates.youtube_url = body.profile.youtube_url;
      if (body.profile.vimeo_url !== undefined) profileUpdates.vimeo_url = body.profile.vimeo_url;
      if (body.profile.soundcloud_url !== undefined) profileUpdates.soundcloud_url = body.profile.soundcloud_url;
      
      // Connection methods
      if (body.profile.connection1 !== undefined) profileUpdates.connection1 = body.profile.connection1;
      if (body.profile.connection2 !== undefined) profileUpdates.connection2 = body.profile.connection2;
      if (body.profile.connection3 !== undefined) profileUpdates.connection3 = body.profile.connection3;
      if (body.profile.connection4 !== undefined) profileUpdates.connection4 = body.profile.connection4;
      if (body.profile.connection5 !== undefined) profileUpdates.connection5 = body.profile.connection5;
      if (body.profile.connection6 !== undefined) profileUpdates.connection6 = body.profile.connection6;
      if (body.profile.connection7 !== undefined) profileUpdates.connection7 = body.profile.connection7;
      if (body.profile.connection8 !== undefined) profileUpdates.connection8 = body.profile.connection8;
      if (body.profile.connection9 !== undefined) profileUpdates.connection9 = body.profile.connection9;
      if (body.profile.connection10 !== undefined) profileUpdates.connection10 = body.profile.connection10;
      if (body.profile.connection11 !== undefined) profileUpdates.connection11 = body.profile.connection11;
      if (body.profile.connection12 !== undefined) profileUpdates.connection12 = body.profile.connection12;
      
      // Custom connection methods
      if (body.profile.custom_connection_methods !== undefined) {
        profileUpdates.custom_connection_methods = Array.isArray(body.profile.custom_connection_methods)
          ? body.profile.custom_connection_methods.filter((m: string) => m && m.trim()).slice(0, 2)
          : [];
      }
      
      // Visibility settings
      if (body.profile.show_email !== undefined) profileUpdates.show_email = body.profile.show_email;
      if (body.profile.show_phone !== undefined) profileUpdates.show_phone = body.profile.show_phone;
      if (body.profile.show_address !== undefined) profileUpdates.show_address = body.profile.show_address;
      if (body.profile.show_directions !== undefined) profileUpdates.show_directions = body.profile.show_directions;
      
      // Other fields
      if (body.profile.studio_name !== undefined) profileUpdates.studio_name = body.profile.studio_name;
      if (body.profile.equipment_list !== undefined) profileUpdates.equipment_list = body.profile.equipment_list;
      if (body.profile.services_offered !== undefined) profileUpdates.services_offered = body.profile.services_offered;
      if (body.profile.home_studio_description !== undefined) profileUpdates.home_studio_description = body.profile.home_studio_description;

      if (Object.keys(profileUpdates).length > 0) {
        // Check if profile exists
        const existingProfile = await db.user_profiles.findUnique({
          where: { user_id: userId },
        });

        if (existingProfile) {
          await db.user_profiles.update({
            where: { user_id: userId },
            data: profileUpdates,
          });
        } else {
          // Create profile if it doesn't exist
          await db.user_profiles.create({
            data: {
              user_id: userId,
              ...profileUpdates,
            },
          });
        }
      }
    }

    // Update studio table if needed
    if (body.studio) {
      // Get user's active studio
      const studio = await db.studios.findFirst({
        where: { owner_id: userId, status: 'ACTIVE' },
      });

      if (studio) {
        const studioUpdates: any = {};
        
        if (body.studio.name !== undefined) studioUpdates.name = body.studio.name;
        if (body.studio.description !== undefined) studioUpdates.description = body.studio.description;
        if (body.studio.address !== undefined) studioUpdates.address = body.studio.address; // Legacy field
        if (body.studio.full_address !== undefined) studioUpdates.full_address = body.studio.full_address;
        if (body.studio.abbreviated_address !== undefined) studioUpdates.abbreviated_address = body.studio.abbreviated_address;
        if (body.studio.website_url !== undefined) studioUpdates.website_url = body.studio.website_url;
        if (body.studio.phone !== undefined) studioUpdates.phone = body.studio.phone;
        if (body.studio.is_profile_visible !== undefined) studioUpdates.is_profile_visible = body.studio.is_profile_visible;
        
        // Geocode full_address if it's being updated and coordinates aren't manually set
        if (body.studio.full_address !== undefined && body.studio.full_address && 
            body.studio.latitude === undefined && body.studio.longitude === undefined) {
          const { geocodeAddress } = await import('@/lib/maps');
          const geocodeResult = await geocodeAddress(body.studio.full_address);
          if (geocodeResult) {
            studioUpdates.latitude = geocodeResult.lat;
            studioUpdates.longitude = geocodeResult.lng;
          }
        }

        if (Object.keys(studioUpdates).length > 0) {
          await db.studios.update({
            where: { id: studio.id },
            data: studioUpdates,
          });
        }

        // Update studio types if provided
        if (body.studio_types && Array.isArray(body.studio_types)) {
          // Delete existing types
          await db.studio_studio_types.deleteMany({
            where: { studio_id: studio.id },
          });
          
          // Create new types
          if (body.studio_types.length > 0) {
            const { randomBytes } = await import('crypto');
            await db.studio_studio_types.createMany({
              data: body.studio_types.map((type: string) => ({
                id: randomBytes(12).toString('hex'),
                studio_id: studio.id,
                studio_type: type,
              })),
            });
          }
        }

        // Update services if provided
        if (body.services && Array.isArray(body.services)) {
          // Delete existing services
          await db.studio_services.deleteMany({
            where: { studio_id: studio.id },
          });
          
          // Create new services
          if (body.services.length > 0) {
            const { randomBytes } = await import('crypto');
            await db.studio_services.createMany({
              data: body.services.map((service: string) => ({
                id: randomBytes(12).toString('hex'),
                studio_id: studio.id,
                service: service,
              })),
            });
          }
        }
      }
    }

    // Fetch updated profile
    const updatedUser = await db.users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: true,
        studios: {
          where: { status: 'ACTIVE' },
          include: {
            studio_studio_types: true,
            studio_services: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
