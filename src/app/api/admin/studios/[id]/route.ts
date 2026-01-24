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
            avatar_url: true,
            subscriptions: {
              orderBy: { created_at: 'desc' },
              take: 1,
              select: {
                id: true,
                current_period_end: true,
                status: true,
              }
            },
            user_metadata: {
              where: {
                key: 'custom_meta_title'
              }
            }
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

    // Get custom meta title from user_metadata
    const customMetaTitle = studio.users?.user_metadata?.[0]?.value || '';

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
      city: studio.city || '',
      phone: studio.phone || '',
      url: studio.website_url || '',
      instagram: studio.instagram_url || '',
      youtubepage: studio.youtube_url || '',
      tiktok: studio.tiktok_url || '',
      threads: studio.threads_url || '',
      about: decodeHtmlEntities(studio.about || ''),
      latitude: studio.latitude ? parseFloat(studio.latitude.toString()) : null,
      longitude: studio.longitude ? parseFloat(studio.longitude.toString()) : null,
      show_exact_location: studio.show_exact_location ?? true,
      shortabout: decodeHtmlEntities(studio.short_about || ''),
      category: '', // Not in new schema
      facebook: studio.facebook_url || '',
      twitter: studio.twitter_url || '',
      x: studio.x_url || '',
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
      custom_connection_methods: studio.custom_connection_methods || [],
      equipment_list: studio.equipment_list || '',
      services_offered: studio.services_offered || ''
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
      name: studio.name, // Studio name at root level
      
      // All profile fields go in _meta for frontend compatibility
      _meta: {
        studio_name: studio.name, // Actual studio name from studios table
        last_name: studioData.last_name,
        equipment_list: studioData.equipment_list,
        services_offered: studioData.services_offered,
        location: studioData.location,
        full_address: studioData.full_address,
        city: studioData.city,
        phone: studioData.phone,
        url: studioData.url,
        instagram: studioData.instagram,
        youtubepage: studioData.youtubepage,
        tiktok: studioData.tiktok,
        threads: studioData.threads,
        about: studioData.about,
        latitude: studioData.latitude,
        longitude: studioData.longitude,
        show_exact_location: studioData.show_exact_location ? '1' : '0',
        short_about: studioData.shortabout,
        category: studioData.category,
        facebook: studioData.facebook,
        twitter: studioData.twitter,
        x: studioData.x,
        linkedin: studioData.linkedin,
        soundcloud: studioData.soundcloud,
        vimeo: studioData.vimeo,
        verified: studioData.verified ? '1' : '0',
        featured: studioData.featured ? '1' : '0',
        featured_expires_at: studio.featured_until?.toISOString() || null,
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
        custom_connection_methods: studioData.custom_connection_methods || [],
        // Membership
        membership_expires_at: studio.users?.subscriptions[0]?.current_period_end?.toISOString() || null,
        // Meta Title
        custom_meta_title: customMetaTitle
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
    
    // Check if email is being changed and if it's already taken
    if (body.email !== undefined && body.email !== existingStudio.users?.email) {
      const existingEmailUser = await prisma.users.findUnique({
        where: { email: body.email }
      });
      
      if (existingEmailUser && existingEmailUser.id !== existingStudio.user_id) {
        return NextResponse.json({ 
          error: 'Email address is already in use by another account' 
        }, { status: 400 });
      }
      
      userUpdateData.email = body.email;
    }
    
    if (body.avatar_image !== undefined) userUpdateData.avatar_url = body.avatar_image; // Avatar image

    // Prepare studio updates
    const studioUpdateData: any = {};
    if (body._meta?.studio_name !== undefined) studioUpdateData.name = body._meta.studio_name; // Studio name field
    if (body._meta?.address !== undefined) studioUpdateData.address = body._meta.address; // Legacy field
    if (body._meta?.full_address !== undefined) studioUpdateData.full_address = body._meta.full_address;
    if (body._meta?.city !== undefined) studioUpdateData.city = body._meta.city;
    if (body._meta?.phone !== undefined) studioUpdateData.phone = body._meta.phone;
    if (body._meta?.url !== undefined) studioUpdateData.website_url = body._meta.url;
    if (body._meta?.latitude !== undefined) studioUpdateData.latitude = parseFloat(body._meta.latitude) || null;
    if (body._meta?.longitude !== undefined) studioUpdateData.longitude = parseFloat(body._meta.longitude) || null;
    if (body._meta?.show_exact_location !== undefined) studioUpdateData.show_exact_location = body._meta.show_exact_location === '1' || body._meta.show_exact_location === true || body._meta.show_exact_location === 1;
    if (body._meta?.verified !== undefined) studioUpdateData.is_verified = body._meta.verified === '1' || body._meta.verified === true || body._meta.verified === 1;
    if (body._meta?.is_profile_visible !== undefined) studioUpdateData.is_profile_visible = body._meta.is_profile_visible === '1' || body._meta.is_profile_visible === true || body._meta.is_profile_visible === 1;
    
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
            logger.log(`[Geocoding] Success: lat=${geocodeResult.lat}, lng=${geocodeResult.lng}, city=${geocodeResult.city}, country=${geocodeResult.country}`);
            // Set coordinates
            studioUpdateData.latitude = geocodeResult.lat;
            studioUpdateData.longitude = geocodeResult.lng;
            // Auto-populate city and location (country) if not explicitly being changed
            if (body._meta?.city === undefined && geocodeResult.city) {
              studioUpdateData.city = geocodeResult.city;
            }
            if (body._meta?.location === undefined && geocodeResult.country) {
              studioUpdateData.location = geocodeResult.country;
            }
          } else {
            logger.log(`[Geocoding] Failed to geocode address: ${body._meta.full_address} - clearing coordinates`);
            // Clear coordinates on geocode failure
            studioUpdateData.latitude = null;
            studioUpdateData.longitude = null;
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
          logger.log(`[Geocoding] Success: lat=${geocodeResult.lat}, lng=${geocodeResult.lng}, city=${geocodeResult.city}, country=${geocodeResult.country}`);
          studioUpdateData.latitude = geocodeResult.lat;
          studioUpdateData.longitude = geocodeResult.lng;
          // Auto-populate city and location (country) if not explicitly being changed
          if (body._meta?.city === undefined && geocodeResult.city) {
            studioUpdateData.city = geocodeResult.city;
          }
          if (body._meta?.location === undefined && geocodeResult.country) {
            studioUpdateData.location = geocodeResult.country;
          }
        } else {
          logger.log(`[Geocoding] Failed to geocode address: ${body._meta.full_address}`);
          // Clear coordinates on failure
          studioUpdateData.latitude = null;
          studioUpdateData.longitude = null;
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
    // When updating X/Twitter, update both fields to ensure removal works correctly
    if (body._meta?.x !== undefined) {
      profileUpdateData.x_url = body._meta.x;
      profileUpdateData.twitter_url = body._meta.x; // Also update twitter_url to keep them in sync
    }
    if (body._meta?.linkedin !== undefined) profileUpdateData.linkedin_url = body._meta.linkedin;
    if (body._meta?.instagram !== undefined) profileUpdateData.instagram_url = body._meta.instagram;
    if (body._meta?.youtubepage !== undefined) profileUpdateData.youtube_url = body._meta.youtubepage;
    if (body._meta?.tiktok !== undefined) profileUpdateData.tiktok_url = body._meta.tiktok;
    if (body._meta?.threads !== undefined) profileUpdateData.threads_url = body._meta.threads;
    if (body._meta?.soundcloud !== undefined) profileUpdateData.soundcloud_url = body._meta.soundcloud;
    if (body._meta?.vimeo !== undefined) profileUpdateData.vimeo_url = body._meta.vimeo;
    
    // Handle featured status with validation (max 6 featured studios)
    if (body._meta?.featured !== undefined) {
      const isFeatured = body._meta.featured === '1' || body._meta.featured === true || body._meta.featured === 1;
      
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
    
    // Handle featured expiry date
    if (body._meta?.featured_expires_at !== undefined) {
      profileUpdateData.featured_until = body._meta.featured_expires_at ? new Date(body._meta.featured_expires_at) : null;
    }
    // Rate updates
    if (body._meta?.rates1 !== undefined) profileUpdateData.rate_tier_1 = body._meta.rates1;
    if (body._meta?.rates2 !== undefined) profileUpdateData.rate_tier_2 = body._meta.rates2;
    if (body._meta?.rates3 !== undefined) profileUpdateData.rate_tier_3 = body._meta.rates3;
    if (body._meta?.showrates !== undefined) profileUpdateData.show_rates = body._meta.showrates === '1' || body._meta.showrates === true || body._meta.showrates === 1;
    
    // Contact preferences
    if (body._meta?.showemail !== undefined) profileUpdateData.show_email = body._meta.showemail === '1' || body._meta.showemail === true || body._meta.showemail === 1;
    if (body._meta?.showphone !== undefined) profileUpdateData.show_phone = body._meta.showphone === '1' || body._meta.showphone === true || body._meta.showphone === 1;
    if (body._meta?.showaddress !== undefined) profileUpdateData.show_address = body._meta.showaddress === '1' || body._meta.showaddress === true || body._meta.showaddress === 1;
    if (body._meta?.showdirections !== undefined) profileUpdateData.show_directions = body._meta.showdirections === '1' || body._meta.showdirections === true || body._meta.showdirections === 1;
    if (body._meta?.use_coordinates_for_map !== undefined) profileUpdateData.use_coordinates_for_map = body._meta.use_coordinates_for_map === '1' || body._meta.use_coordinates_for_map === true || body._meta.use_coordinates_for_map === 1;
    
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
    
    // Equipment and Services
    if (body._meta?.equipment_list !== undefined) profileUpdateData.equipment_list = body._meta.equipment_list;
    if (body._meta?.services_offered !== undefined) profileUpdateData.services_offered = body._meta.services_offered;
    
    // Also support profile.* format for compatibility
    if (body.profile?.equipment_list !== undefined) profileUpdateData.equipment_list = body.profile.equipment_list;
    if (body.profile?.services_offered !== undefined) profileUpdateData.services_offered = body.profile.services_offered;
    if (body.profile?.x_url !== undefined) profileUpdateData.x_url = body.profile.x_url;

    // Merge all studio_profiles updates into one object
    const allStudioProfileUpdates = {
      ...studioUpdateData,
      ...profileUpdateData
    };

    // Add updated_at timestamp for studio_profiles updates
    if (Object.keys(allStudioProfileUpdates).length > 0) {
      allStudioProfileUpdates.updated_at = new Date();
    }

    // Log what we're trying to update for debugging
    logger.log('[Admin Update] Studio updates:', JSON.stringify(allStudioProfileUpdates, null, 2));

    // Perform updates using Prisma transactions
    await prisma.$transaction(async (tx) => {
      // Update user if there are user changes
      if (Object.keys(userUpdateData).length > 0) {
        await tx.users.update({
          where: { id: existingStudio.user_id },
          data: userUpdateData
        });
      }

      // Update studio_profiles if there are any changes (merged from studioUpdateData and profileUpdateData)
      if (Object.keys(allStudioProfileUpdates).length > 0) {
        await tx.studio_profiles.update({
          where: { id: studioId },
          data: allStudioProfileUpdates
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

      // Handle membership expiry updates
      // Only process if membership_expires_at is explicitly being changed
      // Check if it's different from the current value or if it's being explicitly set/cleared
      const currentSubscription = await tx.subscriptions.findFirst({
        where: { user_id: existingStudio.user_id },
        orderBy: { created_at: 'desc' }
      });
      
      const currentExpiryDate = currentSubscription?.current_period_end?.toISOString() || null;
      const newExpiryValue = body._meta?.membership_expires_at || null;
      
      // Only process membership changes if the value has actually changed
      const membershipExpiryChanged = body._meta?.membership_expires_at !== undefined && 
        (newExpiryValue !== currentExpiryDate);
      
      if (membershipExpiryChanged) {
        const now = new Date();
        
        if (body._meta.membership_expires_at) {
          // Parse the date
          const expiryDate = new Date(body._meta.membership_expires_at);
          
          if (currentSubscription) {
            // Update existing subscription
            await tx.subscriptions.update({
              where: { id: currentSubscription.id },
              data: {
                current_period_end: expiryDate,
                status: 'ACTIVE',
                updated_at: now
              }
            });
          } else {
            // Create new subscription
            await tx.subscriptions.create({
              data: {
                id: randomBytes(12).toString('base64url'),
                user_id: existingStudio.user_id,
                status: 'ACTIVE',
                payment_method: 'STRIPE',
                current_period_start: now,
                current_period_end: expiryDate,
                created_at: now,
                updated_at: now
              }
            });
          }

          // Update studio status based on expiry date
          // Only change status if it's not already explicitly being set in this request
          if (body.status === undefined) {
            const isExpired = expiryDate < now;
            const newStatus = isExpired ? 'INACTIVE' : 'ACTIVE';
            
            await tx.studio_profiles.update({
              where: { id: studioId },
              data: { 
                status: newStatus,
                updated_at: now
              }
            });
          }
        } else {
          // If being explicitly cleared (empty string), delete subscription and set studio to INACTIVE
          await tx.subscriptions.deleteMany({
            where: { user_id: existingStudio.user_id }
          });
          
          // Only change status if it's not already explicitly being set in this request
          if (body.status === undefined) {
            await tx.studio_profiles.update({
              where: { id: studioId },
              data: { 
                status: 'INACTIVE',
                updated_at: now
              }
            });
          }
        }
      }

      // Handle custom_meta_title metadata (outside main studio_profiles table)
      if (body._meta?.custom_meta_title !== undefined) {
        const customMetaTitle = body._meta.custom_meta_title?.trim() || '';
        
        if (customMetaTitle) {
          // Upsert the custom_meta_title metadata
          await tx.user_metadata.upsert({
            where: {
              user_id_key: {
                user_id: existingStudio.user_id,
                key: 'custom_meta_title',
              },
            },
            update: {
              value: customMetaTitle.substring(0, 60), // Enforce 60 char limit
              updated_at: new Date(),
            },
            create: {
              id: randomBytes(12).toString('base64url'),
              user_id: existingStudio.user_id,
              key: 'custom_meta_title',
              value: customMetaTitle.substring(0, 60),
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
        } else {
          // If empty string, delete the metadata entry
          await tx.user_metadata.deleteMany({
            where: {
              user_id: existingStudio.user_id,
              key: 'custom_meta_title',
            },
          });
        }
      }
    });

    // Fetch the updated studio to return updated coordinates
    const updatedStudio = await prisma.studio_profiles.findUnique({
      where: { id: studioId },
      select: {
        latitude: true,
        longitude: true,
        full_address: true,
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
      city: updatedStudio?.city || null,
    });

  } catch (error: any) {
    console.error('Update studio error:', error);
    
    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (target?.includes('email')) {
        return NextResponse.json({ 
          error: 'Email address is already in use by another account' 
        }, { status: 400 });
      }
      if (target?.includes('username')) {
        return NextResponse.json({ 
          error: 'Username is already taken' 
        }, { status: 400 });
      }
      return NextResponse.json({ 
        error: 'A unique constraint was violated. Please check your data.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to update studio',
      details: error.message 
    }, { status: 500 });
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

    const id = (await params).id;
    console.log('[Admin Delete] Attempting to delete studio/user with ID:', id);

    // Try to find the studio profile first
    const studio = await prisma.studio_profiles.findUnique({
      where: { id },
      select: { user_id: true, name: true }
    });

    let userId: string;

    if (studio) {
      // Studio profile exists, use its user_id
      userId = studio.user_id;
      console.log('[Admin Delete] Found studio profile:', studio.name, 'User ID:', userId);
    } else {
      // No studio profile found, treat id as user_id directly
      // This handles users who haven't created their studio profile yet
      console.log('[Admin Delete] No studio profile found, treating ID as user_id');
      const user = await prisma.users.findUnique({
        where: { id },
        select: { id: true, email: true }
      });

      if (!user) {
        console.log('[Admin Delete] User not found with ID:', id);
        return NextResponse.json(
          { error: 'User or studio not found' },
          { status: 404 }
        );
      }

      userId = user.id;
      console.log('[Admin Delete] Found user:', user.email);
    }

    console.log('[Admin Delete] Deleting user account:', userId);

    // Delete all related records that don't have CASCADE delete
    // We need to do this in a transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete reviews where user is owner or reviewer (no CASCADE)
      await tx.reviews.deleteMany({
        where: {
          OR: [
            { owner_id: userId },
            { reviewer_id: userId }
          ]
        }
      });

      // Delete user connections (no CASCADE)
      await tx.user_connections.deleteMany({
        where: {
          OR: [
            { user_id: userId },
            { connected_user_id: userId }
          ]
        }
      });

      // Delete content reports (no CASCADE on some relations)
      await tx.content_reports.deleteMany({
        where: {
          OR: [
            { reporter_id: userId },
            { reported_user_id: userId },
            { reviewed_by_id: userId }
          ]
        }
      });

      // Delete messages (no CASCADE)
      await tx.messages.deleteMany({
        where: {
          OR: [
            { sender_id: userId },
            { receiver_id: userId }
          ]
        }
      });

      // Delete subscriptions (no CASCADE)
      await tx.subscriptions.deleteMany({
        where: { user_id: userId }
      });

      // Handle refunds where user is the processor (no CASCADE)
      // We can't delete these, so we'll set processed_by to null if possible
      // But since processed_by is required, we'll just leave them
      // They reference the admin who processed them, not the user being deleted

      // Now delete the user account
      // This will CASCADE delete: accounts, sessions, notifications, payments,
      // pending_subscriptions, saved_searches, studio_profiles, user_metadata, support_tickets
      await tx.users.delete({
        where: { id: userId },
      });
    });

    console.log('[Admin Delete] Successfully deleted user and all related data');

    return NextResponse.json({
      success: true,
      message: 'Studio and user account deleted successfully',
    });
  } catch (error) {
    console.error('[Admin Delete] Error deleting studio:', error);
    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to delete studio and user account',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
