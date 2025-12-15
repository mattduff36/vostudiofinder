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
 * - Studio profile (merged data from studio_profiles table)
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
        studio_profiles: {
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
        user_metadata: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get studio profile
    const studioProfile = user.studio_profiles || null;

    // Transform metadata array into key-value object
    const metadata: Record<string, string> = {};
    user.user_metadata?.forEach((meta) => {
      metadata[meta.key] = meta.value || '';
    });

    // Prepare response (merged profile + studio data)
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
        profile: studioProfile ? {
          id: studioProfile.id,
          user_id: studioProfile.user_id,
          // Studio identity
          name: studioProfile.name,
          description: studioProfile.description,
          short_about: studioProfile.short_about,
          about: studioProfile.about,
          // Location
          full_address: studioProfile.full_address,
          abbreviated_address: studioProfile.abbreviated_address,
          city: studioProfile.city,
          location: studioProfile.location,
          latitude: studioProfile.latitude ? Number(studioProfile.latitude) : null,
          longitude: studioProfile.longitude ? Number(studioProfile.longitude) : null,
          // Contact
          phone: studioProfile.phone,
          website_url: studioProfile.website_url,
          show_email: studioProfile.show_email,
          show_phone: studioProfile.show_phone,
          show_address: studioProfile.show_address,
          show_directions: studioProfile.show_directions,
          // Professional
          equipment_list: studioProfile.equipment_list,
          services_offered: studioProfile.services_offered,
          home_studio_description: studioProfile.home_studio_description,
          last_name: studioProfile.last_name,
          // Pricing
          rate_tier_1: studioProfile.rate_tier_1 ? Number(studioProfile.rate_tier_1) : null,
          rate_tier_2: studioProfile.rate_tier_2 ? Number(studioProfile.rate_tier_2) : null,
          rate_tier_3: studioProfile.rate_tier_3 ? Number(studioProfile.rate_tier_3) : null,
          show_rates: studioProfile.show_rates,
          // Social media
          facebook_url: studioProfile.facebook_url,
          twitter_url: studioProfile.twitter_url,
          x_url: studioProfile.x_url,
          linkedin_url: studioProfile.linkedin_url,
          instagram_url: studioProfile.instagram_url,
          tiktok_url: studioProfile.tiktok_url,
          threads_url: studioProfile.threads_url,
          youtube_url: studioProfile.youtube_url,
          vimeo_url: studioProfile.vimeo_url,
          soundcloud_url: studioProfile.soundcloud_url,
          // Connections
          connection1: studioProfile.connection1,
          connection2: studioProfile.connection2,
          connection3: studioProfile.connection3,
          connection4: studioProfile.connection4,
          connection5: studioProfile.connection5,
          connection6: studioProfile.connection6,
          connection7: studioProfile.connection7,
          connection8: studioProfile.connection8,
          connection9: studioProfile.connection9,
          connection10: studioProfile.connection10,
          connection11: studioProfile.connection11,
          connection12: studioProfile.connection12,
          custom_connection_methods: studioProfile.custom_connection_methods || [],
          // Status
          status: studioProfile.status,
          is_premium: studioProfile.is_premium,
          is_verified: studioProfile.is_verified,
          is_profile_visible: studioProfile.is_profile_visible,
          is_featured: studioProfile.is_featured,
          is_spotlight: studioProfile.is_spotlight,
          is_crb_checked: studioProfile.is_crb_checked,
          verification_level: studioProfile.verification_level,
          use_coordinates_for_map: studioProfile.use_coordinates_for_map,
          // Timestamps
          created_at: studioProfile.created_at,
          updated_at: studioProfile.updated_at,
          // Related data
          studio_types: studioProfile.studio_studio_types?.map(st => st.studio_type) || [],
          services: studioProfile.studio_services?.map(ss => ss.service) || [],
          images: studioProfile.studio_images || [],
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
 * Update user studio profile (supports partial updates)
 * 
 * Request body:
 * - user: { display_name?, username? }
 * - profile: { all studio_profiles fields merged from former profile + studio }
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

    // Update studio_profiles table (merged profile + studio data)
    if (body.profile || body.studio) {
      const profileUpdates: any = {};
      
      // Merge updates from both body.profile and body.studio (for backwards compatibility)
      const updates = { ...body.profile, ...body.studio };
      
      // Studio identity
      if (updates.name !== undefined) profileUpdates.name = updates.name;
      if (updates.description !== undefined) profileUpdates.description = updates.description;
      if (updates.short_about !== undefined) profileUpdates.short_about = updates.short_about;
      if (updates.about !== undefined) profileUpdates.about = updates.about;
      
      // Location
      if (updates.full_address !== undefined) profileUpdates.full_address = updates.full_address;
      if (updates.abbreviated_address !== undefined) profileUpdates.abbreviated_address = updates.abbreviated_address;
      if (updates.city !== undefined) profileUpdates.city = updates.city;
      if (updates.location !== undefined) profileUpdates.location = updates.location;
      
      // Contact
      if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
      if (updates.website_url !== undefined) profileUpdates.website_url = updates.website_url;
      if (updates.show_email !== undefined) profileUpdates.show_email = updates.show_email;
      if (updates.show_phone !== undefined) profileUpdates.show_phone = updates.show_phone;
      if (updates.show_address !== undefined) profileUpdates.show_address = updates.show_address;
      if (updates.show_directions !== undefined) profileUpdates.show_directions = updates.show_directions;
      
      // Professional
      if (updates.equipment_list !== undefined) profileUpdates.equipment_list = updates.equipment_list;
      if (updates.services_offered !== undefined) profileUpdates.services_offered = updates.services_offered;
      if (updates.home_studio_description !== undefined) profileUpdates.home_studio_description = updates.home_studio_description;
      if (updates.last_name !== undefined) profileUpdates.last_name = updates.last_name;
      
      // Pricing (convert numbers to strings)
      if (updates.rate_tier_1 !== undefined) {
        profileUpdates.rate_tier_1 = updates.rate_tier_1 !== null ? String(updates.rate_tier_1) : null;
      }
      if (updates.rate_tier_2 !== undefined) {
        profileUpdates.rate_tier_2 = updates.rate_tier_2 !== null ? String(updates.rate_tier_2) : null;
      }
      if (updates.rate_tier_3 !== undefined) {
        profileUpdates.rate_tier_3 = updates.rate_tier_3 !== null ? String(updates.rate_tier_3) : null;
      }
      if (updates.show_rates !== undefined) profileUpdates.show_rates = updates.show_rates;
      
      // Social media
      if (updates.facebook_url !== undefined) profileUpdates.facebook_url = updates.facebook_url;
      if (updates.twitter_url !== undefined) profileUpdates.twitter_url = updates.twitter_url;
      if (updates.x_url !== undefined) profileUpdates.x_url = updates.x_url;
      if (updates.linkedin_url !== undefined) profileUpdates.linkedin_url = updates.linkedin_url;
      if (updates.instagram_url !== undefined) profileUpdates.instagram_url = updates.instagram_url;
      if (updates.tiktok_url !== undefined) profileUpdates.tiktok_url = updates.tiktok_url;
      if (updates.threads_url !== undefined) profileUpdates.threads_url = updates.threads_url;
      if (updates.youtube_url !== undefined) profileUpdates.youtube_url = updates.youtube_url;
      if (updates.vimeo_url !== undefined) profileUpdates.vimeo_url = updates.vimeo_url;
      if (updates.soundcloud_url !== undefined) profileUpdates.soundcloud_url = updates.soundcloud_url;
      
      // Connections
      if (updates.connection1 !== undefined) profileUpdates.connection1 = updates.connection1;
      if (updates.connection2 !== undefined) profileUpdates.connection2 = updates.connection2;
      if (updates.connection3 !== undefined) profileUpdates.connection3 = updates.connection3;
      if (updates.connection4 !== undefined) profileUpdates.connection4 = updates.connection4;
      if (updates.connection5 !== undefined) profileUpdates.connection5 = updates.connection5;
      if (updates.connection6 !== undefined) profileUpdates.connection6 = updates.connection6;
      if (updates.connection7 !== undefined) profileUpdates.connection7 = updates.connection7;
      if (updates.connection8 !== undefined) profileUpdates.connection8 = updates.connection8;
      if (updates.connection9 !== undefined) profileUpdates.connection9 = updates.connection9;
      if (updates.connection10 !== undefined) profileUpdates.connection10 = updates.connection10;
      if (updates.connection11 !== undefined) profileUpdates.connection11 = updates.connection11;
      if (updates.connection12 !== undefined) profileUpdates.connection12 = updates.connection12;
      if (updates.custom_connection_methods !== undefined) {
        profileUpdates.custom_connection_methods = Array.isArray(updates.custom_connection_methods)
          ? updates.custom_connection_methods.filter((m: string) => m && m.trim()).slice(0, 2)
          : [];
      }
      
      // Status
      if (updates.is_profile_visible !== undefined) profileUpdates.is_profile_visible = updates.is_profile_visible;
      if (updates.use_coordinates_for_map !== undefined) profileUpdates.use_coordinates_for_map = updates.use_coordinates_for_map;
      
      // Geocode full_address if being updated and coordinates aren't manually set
      if (updates.full_address !== undefined && updates.full_address && 
          updates.latitude === undefined && updates.longitude === undefined) {
        const { geocodeAddress } = await import('@/lib/maps');
        const geocodeResult = await geocodeAddress(updates.full_address);
        if (geocodeResult) {
          profileUpdates.latitude = geocodeResult.lat;
          profileUpdates.longitude = geocodeResult.lng;
        }
      }

      if (Object.keys(profileUpdates).length > 0) {
        // Check if studio profile exists
        const existingProfile = await db.studio_profiles.findUnique({
          where: { user_id: userId },
        });

        if (existingProfile) {
          await db.studio_profiles.update({
            where: { user_id: userId },
            data: {
              ...profileUpdates,
              updated_at: new Date(),
            },
          });
        } else {
          // Create studio profile if it doesn't exist (shouldn't happen after migration)
          const { randomBytes } = await import('crypto');
          await db.studio_profiles.create({
            data: {
              id: randomBytes(12).toString('hex'),
              user_id: userId,
              name: updates.name || 'My Studio', // Required field
              city: updates.city || '', // Required field with default
              ...profileUpdates,
              updated_at: new Date(),
            },
          });
        }

        // Update studio types if provided
        if (body.studio_types && Array.isArray(body.studio_types)) {
          const profile = await db.studio_profiles.findUnique({
            where: { user_id: userId },
          });
          
          if (profile) {
            // Delete existing types
            await db.studio_studio_types.deleteMany({
              where: { studio_id: profile.id },
            });
            
            // Create new types
            if (body.studio_types.length > 0) {
              const { randomBytes } = await import('crypto');
              await db.studio_studio_types.createMany({
                data: body.studio_types.map((type: string) => ({
                  id: randomBytes(12).toString('hex'),
                  studio_id: profile.id,
                  studio_type: type,
                })),
              });
            }
          }
        }

        // Update services if provided
        if (body.services && Array.isArray(body.services)) {
          const profile = await db.studio_profiles.findUnique({
            where: { user_id: userId },
          });
          
          if (profile) {
            // Delete existing services
            await db.studio_services.deleteMany({
              where: { studio_id: profile.id },
            });
            
            // Create new services
            if (body.services.length > 0) {
              const { randomBytes } = await import('crypto');
              await db.studio_services.createMany({
                data: body.services.map((service: string) => ({
                  id: randomBytes(12).toString('hex'),
                  studio_id: profile.id,
                  service: service,
                })),
              });
            }
          }
        }
      }
    }

    // Fetch updated profile
    const updatedUser = await db.users.findUnique({
      where: { id: userId },
      include: {
        studio_profiles: {
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
