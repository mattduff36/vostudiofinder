import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';

// Helper function to decode HTML entities
function decodeHtmlEntities(str: string) {
  if (!str) return str;
  
  const htmlEntities: { [key: string]: string } = {
    '&pound;': '£',
    '&euro;': '€',
    '&dollar;': '$',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  };
  
  return str.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return htmlEntities[entity] || entity;
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const studioId = (await params).id;
    
    // Get studio with owner and profile data using Prisma
    const studio = await prisma.studio_profiles.findUnique({
      where: { id: studioId },
      include: {
        users: {
          select: {
            id: true,
            display_name: true,
            username: true,
            email: true,
            avatar_url: true
          }
        },
        studio_studio_types: {
          select: {
            studio_type: true
          }
        },
        studio_images: {
          orderBy: {
            sort_order: 'asc'
          }
        }
      }
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    // Transform to match expected format for the frontend
    const studioData = {
      id: studio.id,
      username: studio.users?.username, // Use actual username for URLs
      display_name: studio.users?.display_name, // Use actual display name
      email: studio.users?.email,
      status: studio.status?.toLowerCase(),
      joined: studio.created_at,
      last_name: decodeHtmlEntities(studio.last_name || ''),
      location: studio.location || '',
      full_address: studio.full_address || '',
      abbreviated_address: studio.abbreviated_address || '',
      city: studio.city || '',
      phone: studio.phone || '',
      url: studio.website_url || '',
      instagram: studio.instagram_url || '',
      youtubepage: studio.youtube_url || '',
      about: decodeHtmlEntities(studio.about || ''),
      latitude: studio.latitude ? parseFloat(studio.latitude.toString()) : null,
      longitude: studio.longitude ? parseFloat(studio.longitude.toString()) : null,
      shortabout: decodeHtmlEntities(studio.short_about || ''),
      category: '', // Not in new schema
      facebook: studio.facebook_url || '',
      twitter: studio.twitter_url || '',
      linkedin: studio.linkedin_url || '',
      soundcloud: studio.soundcloud_url || '',
      vimeo: studio.vimeo_url || '',
      verified: studio.is_verified,
      featured: studio.is_featured || false,
      avatar_image: studio.users?.avatar_url || '',
      is_profile_visible: studio.is_profile_visible,
      // Rate data from profile (decode HTML entities)
      rates1: decodeHtmlEntities(studio.rate_tier_1 || ''),
      rates2: decodeHtmlEntities(studio.rate_tier_2 || ''),
      rates3: decodeHtmlEntities(studio.rate_tier_3 || ''),
      showrates: studio.show_rates || false,
      // Contact preferences
      showemail: studio.show_email || false,
      showphone: studio.show_phone || false,
      showaddress: studio.show_address || false,
      showdirections: studio.show_directions !== false, // Default true
      use_coordinates_for_map: studio.use_coordinates_for_map || false,
      // Connection types
      connection1: studio.connection1 || '',
      connection2: studio.connection2 || '',
      connection3: studio.connection3 || '',
      connection4: studio.connection4 || '',
      connection5: studio.connection5 || '',
      connection6: studio.connection6 || '',
      connection7: studio.connection7 || '',
      connection8: studio.connection8 || '',
      connection9: studio.connection9 || '',
      connection10: studio.connection10 || '',
      connection11: studio.connection11 || '',
      connection12: studio.connection12 || '',
      custom_connection_methods: studio.custom_connection_methods || []
    };
    
    // Structure the data to match what the frontend expects
    const profile = {
      // Basic user fields (not in _meta)
      id: studioData.id,
      username: studioData.username,
      display_name: studioData.display_name,
      email: studioData.email,
      status: studioData.status,
      joined: studioData.joined,
      avatar_image: studioData.avatar_image, // Add at root level for modal
      studioTypes: studio.studio_studio_types || [],
      
      // All profile fields go in _meta for frontend compatibility
      _meta: {
        studio_name: studio.name, // Actual studio name from studios table
        last_name: studioData.last_name,
        location: studioData.location,
        full_address: studioData.full_address,
        abbreviated_address: studioData.abbreviated_address,
        city: studioData.city,
        phone: studioData.phone,
        url: studioData.url,
        instagram: studioData.instagram,
        youtubepage: studioData.youtubepage,
        about: studioData.about,
        latitude: studioData.latitude,
        longitude: studioData.longitude,
        short_about: studioData.shortabout,
        category: studioData.category,
        facebook: studioData.facebook,
        twitter: studioData.twitter,
        linkedin: studioData.linkedin,
        soundcloud: studioData.soundcloud,
        vimeo: studioData.vimeo,
        verified: studioData.verified ? '1' : '0',
        featured: studioData.featured ? '1' : '0',
        avatar_image: studioData.avatar_image,
        // Rate data
        rates1: studioData.rates1,
        rates2: studioData.rates2,
        rates3: studioData.rates3,
        showrates: studioData.showrates ? '1' : '0',
        // Contact preferences
        showemail: studioData.showemail ? '1' : '0',
        showphone: studioData.showphone ? '1' : '0',
        showaddress: studioData.showaddress ? '1' : '0',
        showdirections: studioData.showdirections ? '1' : '0',
        use_coordinates_for_map: studio.use_coordinates_for_map || false,
        is_profile_visible: studioData.is_profile_visible,
        // Connection types
        connection1: studioData.connection1 || '0',
        connection2: studioData.connection2 || '0',
        connection3: studioData.connection3 || '0',
        connection4: studioData.connection4 || '0',
        connection5: studioData.connection5 || '0',
        connection6: studioData.connection6 || '0',
        connection7: studioData.connection7 || '0',
        connection8: studioData.connection8 || '0',
        connection9: studioData.connection9 || '0',
        connection10: studioData.connection10 || '0',
        connection11: studioData.connection11 || '0',
        connection12: studioData.connection12 || '0',
        custom_connection_methods: studioData.custom_connection_methods || []
      },
      images: studio.studio_images?.map(img => ({
        id: img.id,
        image_url: img.image_url,
        alt_text: img.alt_text || '',
        sort_order: img.sort_order
      })) || []
    };

    return NextResponse.json({ profile });

  } catch (error) {
    console.error('Get studio error:', error);
    return NextResponse.json({ error: 'Failed to fetch studio' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const studioId = (await params).id;
    const body = await request.json();

    // Check if studio exists
    const existingStudio = await prisma.studio_profiles.findUnique({
      where: { id: studioId },
      include: {
        users: {
          select: {
            id: true,
            display_name: true,
            username: true,
            email: true,
            avatar_url: true
          }
        }
      }
    });

    if (!existingStudio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    // Prepare user updates
    const userUpdateData: any = {};
    if (body.display_name !== undefined) userUpdateData.display_name = body.display_name; // Display name field
    if (body.username !== undefined) userUpdateData.username = body.username; // Username field updates actual username
    if (body.email !== undefined) userUpdateData.email = body.email;
    if (body.avatar_image !== undefined) userUpdateData.avatar_url = body.avatar_image; // Avatar image

    // Prepare studio updates
    const studioUpdateData: any = {};
    if (body._meta?.studio_name !== undefined) studioUpdateData.name = body._meta.studio_name; // Studio name field
    if (body._meta?.address !== undefined) studioUpdateData.address = body._meta.address; // Legacy field
    if (body._meta?.full_address !== undefined) studioUpdateData.full_address = body._meta.full_address;
    if (body._meta?.abbreviated_address !== undefined) studioUpdateData.abbreviated_address = body._meta.abbreviated_address;
    if (body._meta?.city !== undefined) studioUpdateData.city = body._meta.city;
    if (body._meta?.phone !== undefined) studioUpdateData.phone = body._meta.phone;
    if (body._meta?.url !== undefined) studioUpdateData.website_url = body._meta.url;
    if (body._meta?.latitude !== undefined) studioUpdateData.latitude = parseFloat(body._meta.latitude) || null;
    if (body._meta?.longitude !== undefined) studioUpdateData.longitude = parseFloat(body._meta.longitude) || null;
    if (body._meta?.verified !== undefined) studioUpdateData.is_verified = body._meta.verified === '1' || body._meta.verified === true;
    if (body._meta?.is_profile_visible !== undefined) studioUpdateData.is_profile_visible = body._meta.is_profile_visible;
    
    // Geocode full_address if it's being updated
    // Always geocode when full_address changes, unless coordinates are explicitly being set to different values
    if (body._meta?.full_address !== undefined && body._meta.full_address) {
      const fullAddressChanged = body._meta.full_address !== existingStudio.full_address;
      
      if (fullAddressChanged) {
        // Check if coordinates are being manually changed in this request
        const existingLat = existingStudio.latitude ? parseFloat(existingStudio.latitude.toString()) : null;
        const existingLng = existingStudio.longitude ? parseFloat(existingStudio.longitude.toString()) : null;
        
        // Parse request coordinates, handling both string and number types
        let requestLat: number | null = null;
        let requestLng: number | null = null;
        if (body._meta?.latitude !== undefined && body._meta.latitude !== null && body._meta.latitude !== '') {
          requestLat = typeof body._meta.latitude === 'string' ? parseFloat(body._meta.latitude) : body._meta.latitude;
        }
        if (body._meta?.longitude !== undefined && body._meta.longitude !== null && body._meta.longitude !== '') {
          requestLng = typeof body._meta.longitude === 'string' ? parseFloat(body._meta.longitude) : body._meta.longitude;
        }
        
        // Check if coordinates are being manually changed (different from existing)
        // Use a small epsilon for floating point comparison
        const epsilon = 0.000001;
        const latChanged = requestLat !== null && existingLat !== null && Math.abs(requestLat - existingLat) > epsilon;
        const lngChanged = requestLng !== null && existingLng !== null && Math.abs(requestLng - existingLng) > epsilon;
        const coordinatesManuallyChanged = latChanged || lngChanged;
        
        // Only geocode if coordinates aren't being manually changed
        if (!coordinatesManuallyChanged) {
          logger.log(`[Geocoding] Full address changed, geocoding: ${body._meta.full_address}`);
          const { geocodeAddress } = await import('@/lib/maps');
          const geocodeResult = await geocodeAddress(body._meta.full_address);
          if (geocodeResult) {
            logger.log(`[Geocoding] Success: lat=${geocodeResult.lat}, lng=${geocodeResult.lng}`);
            studioUpdateData.latitude = geocodeResult.lat;
            studioUpdateData.longitude = geocodeResult.lng;
          } else {
            logger.log(`[Geocoding] Failed to geocode address: ${body._meta.full_address}`);
          }
        } else {
          logger.log(`[Geocoding] Skipped - coordinates manually changed`);
        }
      } else if (!existingStudio.latitude || !existingStudio.longitude) {
        // Address hasn't changed but coordinates are empty - geocode anyway
        logger.log(`[Geocoding] Coordinates empty, geocoding existing address: ${body._meta.full_address}`);
        const { geocodeAddress } = await import('@/lib/maps');
        const geocodeResult = await geocodeAddress(body._meta.full_address);
        if (geocodeResult) {
          logger.log(`[Geocoding] Success: lat=${geocodeResult.lat}, lng=${geocodeResult.lng}`);
          studioUpdateData.latitude = geocodeResult.lat;
          studioUpdateData.longitude = geocodeResult.lng;
        }
      }
    }
    
    // Handle status updates
    if (body.status !== undefined) {
      studioUpdateData.status = body.status.toUpperCase();
    }

    // Prepare profile updates
    const profileUpdateData: any = {};
    if (body._meta?.last_name !== undefined) profileUpdateData.last_name = body._meta.last_name;
    if (body._meta?.location !== undefined) profileUpdateData.location = body._meta.location;
    if (body._meta?.about !== undefined) profileUpdateData.about = body._meta.about;
    if (body._meta?.short_about !== undefined) profileUpdateData.short_about = body._meta.short_about;
    if (body._meta?.shortabout !== undefined) profileUpdateData.short_about = body._meta.shortabout; // Legacy support
    if (body._meta?.facebook !== undefined) profileUpdateData.facebook_url = body._meta.facebook;
    if (body._meta?.twitter !== undefined) profileUpdateData.twitter_url = body._meta.twitter;
    if (body._meta?.linkedin !== undefined) profileUpdateData.linkedin_url = body._meta.linkedin;
    if (body._meta?.instagram !== undefined) profileUpdateData.instagram_url = body._meta.instagram;
    if (body._meta?.youtubepage !== undefined) profileUpdateData.youtube_url = body._meta.youtubepage;
    if (body._meta?.soundcloud !== undefined) profileUpdateData.soundcloud_url = body._meta.soundcloud;
    if (body._meta?.vimeo !== undefined) profileUpdateData.vimeo_url = body._meta.vimeo;
    
    // Handle featured status with validation (max 6 featured studios)
    if (body._meta?.featured !== undefined) {
      const isFeatured = body._meta.featured === '1' || body._meta.featured === true;
      
      // If trying to feature this studio, check if limit is reached
      if (isFeatured && !existingStudio.is_featured) {
        const featuredCount = await prisma.studio_profiles.count({
          where: { is_featured: true }
        });
        
        if (featuredCount >= 6) {
          return NextResponse.json({
            error: 'Maximum of 6 featured studios reached. Please unfeature another studio first.'
          }, { status: 400 });
        }
      }
      
      profileUpdateData.is_featured = isFeatured;
    }
    // Rate updates
    if (body._meta?.rates1 !== undefined) profileUpdateData.rate_tier_1 = body._meta.rates1;
    if (body._meta?.rates2 !== undefined) profileUpdateData.rate_tier_2 = body._meta.rates2;
    if (body._meta?.rates3 !== undefined) profileUpdateData.rate_tier_3 = body._meta.rates3;
    if (body._meta?.showrates !== undefined) profileUpdateData.show_rates = body._meta.showrates === '1' || body._meta.showrates === true;
    
    // Contact preferences
    if (body._meta?.showemail !== undefined) profileUpdateData.show_email = body._meta.showemail === '1' || body._meta.showemail === true;
    if (body._meta?.showphone !== undefined) profileUpdateData.show_phone = body._meta.showphone === '1' || body._meta.showphone === true;
    if (body._meta?.showaddress !== undefined) profileUpdateData.show_address = body._meta.showaddress === '1' || body._meta.showaddress === true;
    if (body._meta?.showdirections !== undefined) profileUpdateData.show_directions = body._meta.showdirections === '1' || body._meta.showdirections === true;
    if (body._meta?.use_coordinates_for_map !== undefined) profileUpdateData.use_coordinates_for_map = body._meta.use_coordinates_for_map === '1' || body._meta.use_coordinates_for_map === true;
    
    // Connection types
    if (body._meta?.connection1 !== undefined) profileUpdateData.connection1 = body._meta.connection1;
    if (body._meta?.connection2 !== undefined) profileUpdateData.connection2 = body._meta.connection2;
    if (body._meta?.connection3 !== undefined) profileUpdateData.connection3 = body._meta.connection3;
    if (body._meta?.connection4 !== undefined) profileUpdateData.connection4 = body._meta.connection4;
    if (body._meta?.connection5 !== undefined) profileUpdateData.connection5 = body._meta.connection5;
    if (body._meta?.connection6 !== undefined) profileUpdateData.connection6 = body._meta.connection6;
    if (body._meta?.connection7 !== undefined) profileUpdateData.connection7 = body._meta.connection7;
    if (body._meta?.connection8 !== undefined) profileUpdateData.connection8 = body._meta.connection8;
    if (body._meta?.connection9 !== undefined) profileUpdateData.connection9 = body._meta.connection9;
    if (body._meta?.connection10 !== undefined) profileUpdateData.connection10 = body._meta.connection10;
    if (body._meta?.connection11 !== undefined) profileUpdateData.connection11 = body._meta.connection11;
    if (body._meta?.connection12 !== undefined) profileUpdateData.connection12 = body._meta.connection12;
    
    // Custom connection methods
    if (body._meta?.custom_connection_methods !== undefined) {
      profileUpdateData.custom_connection_methods = Array.isArray(body._meta.custom_connection_methods)
        ? body._meta.custom_connection_methods.filter((m: string) => m && m.trim()).slice(0, 2)
        : [];
    }

    // Perform updates using Prisma transactions
    await prisma.$transaction(async (tx) => {
      // Update user if there are user changes
      if (Object.keys(userUpdateData).length > 0) {
        await tx.users.update({
          where: { id: existingStudio.user_id },
          data: userUpdateData
        });
      }

      // Update studio if there are studio changes
      if (Object.keys(studioUpdateData).length > 0) {
        await tx.studio_profiles.update({
          where: { id: studioId },
          data: studioUpdateData
        });
      }

      // Update studio types if provided
      if (body.studioTypes !== undefined) {
        // Delete existing studio types
        await tx.studio_studio_types.deleteMany({
          where: { studio_id: studioId }
        });

        // Create new studio types
        if (Array.isArray(body.studioTypes) && body.studioTypes.length > 0) {
          // Generate IDs manually since schema doesn't have @default
          for (const st of body.studioTypes) {
            const id = randomBytes(12).toString('base64url'); // Generate unique ID
            await tx.studio_studio_types.create({
              data: {
                id,
                studio_id: studioId,
                studio_type: st.studio_type || st.studioType // Accept both formats
              }
            });
          }
        }
      }

      // Update profile if there are profile changes
      if (Object.keys(profileUpdateData).length > 0) {
        await tx.studio_profiles.upsert({
          where: { user_id: existingStudio.user_id },
          update: profileUpdateData,
          create: {
            id: randomBytes(12).toString('base64url'), // Generate ID for new profiles
            user_id: existingStudio.user_id,
            created_at: new Date(),
            updated_at: new Date(),
            ...profileUpdateData
          }
        });
      }
    });

    // Fetch the updated studio to return updated coordinates
    const updatedStudio = await prisma.studio_profiles.findUnique({
      where: { id: studioId },
      select: {
        latitude: true,
        longitude: true,
        full_address: true,
        abbreviated_address: true,
        city: true,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Studio profile updated successfully',
      coordinates: {
        latitude: updatedStudio?.latitude ? parseFloat(updatedStudio.latitude.toString()) : null,
        longitude: updatedStudio?.longitude ? parseFloat(updatedStudio.longitude.toString()) : null,
      },
      full_address: updatedStudio?.full_address || null,
      abbreviated_address: updatedStudio?.abbreviated_address || null,
      city: updatedStudio?.city || null,
    });

  } catch (error) {
    console.error('Update studio error:', error);
    return NextResponse.json({ error: 'Failed to update studio' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const studioId = (await params).id;

    // Delete the studio
    await prisma.studio_profiles.delete({
      where: { id: studioId },
    });

    return NextResponse.json({
      success: true,
      message: 'Studio deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting studio:', error);
    return NextResponse.json(
      { error: 'Failed to delete studio' },
      { status: 500 }
    );
  }
}
