import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getProfileVisibilityEligibility } from '@/lib/utils/profile-visibility';

/**
 * Detect if profile content suggests user is listing themselves as a voiceover artist
 * Returns array of warning messages if suspicious phrases detected
 */
function detectVoiceoverArtistMisuse(fields: {
  name?: string;
  short_about?: string;
  about?: string;
  services_offered?: string;
  equipment_list?: string;
}): string[] {
  const warnings: string[] = [];
  
  // Strong signals that user is a voiceover artist (not a studio owner)
  const voArtistPhrases = [
    { pattern: /\bvoice actor\b/gi, weight: 10, name: 'voice actor' },
    { pattern: /\bvoice actress\b/gi, weight: 10, name: 'voice actress' },
    { pattern: /\bvoice talent\b/gi, weight: 10, name: 'voice talent' },
    { pattern: /\bvoiceover artist\b/gi, weight: 10, name: 'voiceover artist' },
    { pattern: /\bcommercial voice\b/gi, weight: 8, name: 'commercial voice' },
    { pattern: /\bcharacter voices?\b/gi, weight: 8, name: 'character voice(s)' },
    { pattern: /\bIVR voice\b/gi, weight: 8, name: 'IVR' },
    { pattern: /\baudiobook narrator\b/gi, weight: 9, name: 'audiobook narrator' },
    { pattern: /\bnarration services?\b/gi, weight: 7, name: 'narration' },
    { pattern: /\bdemo reels?\b/gi, weight: 10, name: 'demo reel' },
    { pattern: /\bvoice reels?\b/gi, weight: 10, name: 'voice reel' },
    { pattern: /\bshowreels?\b/gi, weight: 9, name: 'showreel' },
    { pattern: /\bagent representation\b/gi, weight: 9, name: 'agent representation' },
    { pattern: /\bbroadcast quality voice\b/gi, weight: 7, name: 'broadcast quality voice' },
    { pattern: /\blisten to my demos?\b/gi, weight: 10, name: 'listen to my demo(s)' },
    { pattern: /\bmy voice\b/gi, weight: 6, name: 'my voice' },
    { pattern: /\bI am a voice\b/gi, weight: 9, name: 'I am a voice' },
    { pattern: /\bI\'m a voice\b/gi, weight: 9, name: "I'm a voice" },
    { pattern: /\bvoice artist\b/gi, weight: 10, name: 'voice artist' },
    { pattern: /\bvoice over talent\b/gi, weight: 10, name: 'voice over talent' },
  ];
  
  // Studio-owner-friendly patterns that should NOT trigger warnings
  const studioAllowlist = [
    /\bvoiceover studio\b/gi,
    /\bvoiceover recording studio\b/gi,
    /\bstudio hire\b/gi,
    /\bstudio rental\b/gi,
    /\bstudio owner\b/gi,
    /\brecording studio\b/gi,
    /\bpodcast studio\b/gi,
    /\bhome studio\b/gi,
    /\baudio producer\b/gi,
    /\bVO coach\b/gi,
    /\bvoiceover coach\b/gi,
  ];
  
  // Combine all text fields for scanning
  const combinedText = [
    fields.name || '',
    fields.short_about || '',
    fields.about || '',
    fields.services_offered || '',
    fields.equipment_list || '',
  ].join(' ').toLowerCase();
  
  // Check if any allowlisted phrases exist (skip warning if studio-owner language present)
  const hasStudioLanguage = studioAllowlist.some(pattern => pattern.test(combinedText));
  if (hasStudioLanguage) {
    return []; // No warnings if studio-owner language detected
  }
  
  // Score based on phrase matches
  let totalScore = 0;
  const matchedPhrases: string[] = [];
  
  voArtistPhrases.forEach(({ pattern, weight, name }) => {
    const matches = combinedText.match(pattern);
    if (matches && matches.length > 0) {
      totalScore += weight * matches.length;
      if (!matchedPhrases.includes(name)) {
        matchedPhrases.push(name);
      }
    }
  });
  
  // If score exceeds threshold, add warning
  if (totalScore >= 10) {
    warnings.push(
      'Your profile contains phrases typically used by voiceover artists. ' +
      'Voiceover Studio Finder is currently for Studio Owners, Audio Producers, and Voiceover Coaches only. ' +
      'Individual voiceover artist listings will be available in a future update.'
    );
  }
  
  return warnings;
}

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
        subscriptions: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            current_period_start: true,
            current_period_end: true,
            created_at: true,
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
    let studioProfile = user.studio_profiles || null;

    // If the user is ACTIVE but has no studio profile row, create one lazily.
    // This aligns with the product assumption: 1 account == 1 studio profile.
    // Use try-catch to handle race condition: if two concurrent requests try to create,
    // one will succeed and the other will get a unique constraint error - just re-fetch in that case.
    if (!studioProfile && user.status === 'ACTIVE') {
      const now = new Date();
      const { randomBytes } = await import('crypto');
      const newStudioId = randomBytes(12).toString('base64url');

      try {
        studioProfile = await db.studio_profiles.create({
          data: {
            id: newStudioId,
            user_id: user.id,
            // Keep required fields effectively "incomplete" (empty strings), but ensure the row exists.
            name: '',
            city: '',
            is_profile_visible: false,
            created_at: now,
            updated_at: now,
          },
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
        });
      } catch (error: unknown) {
        // Handle race condition: if unique constraint failed, another request created it first
        // Re-fetch the studio profile that was created by the concurrent request
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
          studioProfile = await db.studio_profiles.findUnique({
            where: { user_id: user.id },
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
          });
        } else {
          // Re-throw if it's not a unique constraint error
          throw error;
        }
      }
    }

    // Lazy enforcement: update studio status based on membership expiry (skip for admin accounts)
    const isAdminAccount = user.role === 'ADMIN';
    const latestSubscription = user.subscriptions[0];
    
    if (studioProfile && !isAdminAccount && latestSubscription?.current_period_end) {
      const now = new Date();
      const isExpired = latestSubscription.current_period_end < now;
      const desiredStatus = isExpired ? 'INACTIVE' : 'ACTIVE';
      
      if (studioProfile.status !== desiredStatus) {
        const updatedStudio = await db.studio_profiles.update({
          where: { id: studioProfile.id },
          data: { 
            status: desiredStatus,
            updated_at: now
          },
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
        });
        studioProfile = updatedStudio;
        console.log(`🔄 Studio status updated to ${desiredStatus} for user ${user.id}`);
      }
    } else if (studioProfile && isAdminAccount) {
      // Ensure admin studio is always ACTIVE
      if (studioProfile.status !== 'ACTIVE') {
        const updatedStudio = await db.studio_profiles.update({
          where: { id: studioProfile.id },
          data: { 
            status: 'ACTIVE',
            updated_at: new Date()
          },
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
        });
        studioProfile = updatedStudio;
        console.log(`🔄 Admin studio set to ACTIVE for user ${user.id}`);
      }
    }

    // Calculate membership info
    const membershipInfo: {
      expiresAt: string | null;
      daysUntilExpiry: number | null;
      state: 'ACTIVE' | 'EXPIRED' | 'NONE_SET';
    } = {
      expiresAt: null,
      daysUntilExpiry: null,
      state: 'NONE_SET'
    };

    if (latestSubscription?.current_period_end) {
      const now = new Date();
      const expiryDate = latestSubscription.current_period_end;
      membershipInfo.expiresAt = expiryDate.toISOString();
      
      const diffMs = expiryDate.getTime() - now.getTime();
      membershipInfo.daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      membershipInfo.state = diffMs > 0 ? 'ACTIVE' : 'EXPIRED';
    }

    // Transform metadata array into key-value object
    const metadata: Record<string, string> = {};
    user.user_metadata?.forEach((meta) => {
      metadata[meta.key] = meta.value || '';
    });

    // Prepare response - split into profile (user fields) and studio (studio fields) for frontend compatibility
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
          // Profile-specific fields (about, location, social, connections, settings)
          short_about: studioProfile.short_about,
          about: studioProfile.about,
          location: studioProfile.location,
          // Contact settings
          phone: studioProfile.phone,
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
        } : null,
        // Studio-specific fields (name, address, website)
        studio: studioProfile ? {
          id: studioProfile.id,
          name: studioProfile.name,
          description: studioProfile.description,
          full_address: studioProfile.full_address,
          city: studioProfile.city,
          latitude: studioProfile.latitude ? Number(studioProfile.latitude) : null,
          longitude: studioProfile.longitude ? Number(studioProfile.longitude) : null,
          show_exact_location: studioProfile.show_exact_location,
          website_url: studioProfile.website_url,
          phone: studioProfile.phone,
          status: studioProfile.status,
          is_premium: studioProfile.is_premium,
          is_verified: studioProfile.is_verified,
          is_profile_visible: studioProfile.is_profile_visible,
          is_featured: studioProfile.is_featured,
          is_spotlight: studioProfile.is_spotlight,
          is_crb_checked: studioProfile.is_crb_checked,
          verification_level: studioProfile.verification_level,
          use_coordinates_for_map: studioProfile.use_coordinates_for_map,
          created_at: studioProfile.created_at,
          updated_at: studioProfile.updated_at,
          // Related data as arrays of strings for frontend
          studio_types: studioProfile.studio_studio_types?.map(st => st.studio_type) || [],
          services: studioProfile.studio_services?.map(ss => ss.service) || [],
          images: studioProfile.studio_images || [],
        } : null,
        metadata,
        membership: membershipInfo,
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
 * - metadata: { custom_meta_title? }
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
    
    // Strict check: A visibility toggle request must have ONLY is_profile_visible in body.studio
    // and no other top-level properties. This prevents malicious requests from modifying
    // profile fields alongside a visibility toggle that might fail eligibility validation.
    const isVisibilityToggleRequest =
      typeof body?.studio?.is_profile_visible === 'boolean' &&
      !body?.profile &&
      !body?.user &&
      !body?.studio_types &&
      !body?.services &&
      body?.studio &&
      Object.keys(body.studio).length === 1 &&
      Object.keys(body.studio)[0] === 'is_profile_visible';

    // Update users table if needed
    // Note: username cannot be changed after signup, only display_name and avatar_url
    if (body.user) {
      const userUpdates: any = {};
      if (body.user.display_name !== undefined) userUpdates.display_name = body.user.display_name;
      if (body.user.avatar_url !== undefined) userUpdates.avatar_url = body.user.avatar_url;

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
      // Note: body.profile is spread last so it takes precedence over body.studio for conflicting fields
      const updates = { ...body.studio, ...body.profile };
      
      // Studio identity
      if (updates.name !== undefined) profileUpdates.name = updates.name;
      if (updates.description !== undefined) profileUpdates.description = updates.description;
      if (updates.short_about !== undefined) profileUpdates.short_about = updates.short_about;
      if (updates.about !== undefined) profileUpdates.about = updates.about;
      
      // Location
      if (updates.full_address !== undefined) profileUpdates.full_address = updates.full_address;
      if (updates.city !== undefined) profileUpdates.city = updates.city;
      if (updates.location !== undefined) profileUpdates.location = updates.location;
      if (updates.latitude !== undefined) profileUpdates.latitude = updates.latitude;
      if (updates.longitude !== undefined) profileUpdates.longitude = updates.longitude;
      if (updates.show_exact_location !== undefined) profileUpdates.show_exact_location = updates.show_exact_location;
      
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
          // On success: set coordinates and derive city/country
          profileUpdates.latitude = geocodeResult.lat;
          profileUpdates.longitude = geocodeResult.lng;
          // Auto-populate city and location (country) if not explicitly provided
          if (updates.city === undefined && geocodeResult.city) {
            profileUpdates.city = geocodeResult.city;
          }
          if (updates.location === undefined && geocodeResult.country) {
            profileUpdates.location = geocodeResult.country;
          }
        } else {
          // On failure: clear coordinates
          profileUpdates.latitude = null;
          profileUpdates.longitude = null;
        }
      }

      if (Object.keys(profileUpdates).length > 0) {
        // Check if studio profile exists
        const existingProfile = await db.studio_profiles.findUnique({
          where: { user_id: userId },
          select: {
            id: true,
            full_address: true,
            abbreviated_address: true,
          },
        });

        if (existingProfile) {
          // Backfill: if full_address is empty but abbreviated_address has a value, copy it
          if (!existingProfile.full_address && existingProfile.abbreviated_address && !updates.full_address) {
            profileUpdates.full_address = existingProfile.abbreviated_address;
          }
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
              id: randomBytes(12).toString('base64url'),
              user_id: userId,
              name: updates.name || 'My Studio', // Required field
              city: updates.city || '', // Required field with default
              is_profile_visible: false, // Hidden by default, user can manually enable when ready
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
                  id: randomBytes(12).toString('base64url'),
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
                  id: randomBytes(12).toString('base64url'),
                  studio_id: profile.id,
                  service: service,
                })),
              });
            }
          }
        }
      }
    }

    // Handle user metadata updates (e.g., custom_meta_title)
    if (body.metadata) {
      // Update custom_meta_title if provided
      if (body.metadata.custom_meta_title !== undefined) {
        const customMetaTitle = body.metadata.custom_meta_title?.trim() || '';
        
        if (customMetaTitle) {
          // Upsert the custom_meta_title metadata
          await db.user_metadata.upsert({
            where: {
              user_id_key: {
                user_id: userId,
                key: 'custom_meta_title',
              },
            },
            update: {
              value: customMetaTitle.substring(0, 60), // Enforce 60 char limit
              updated_at: new Date(),
            },
            create: {
              id: (await import('crypto')).randomBytes(12).toString('base64url'),
              user_id: userId,
              key: 'custom_meta_title',
              value: customMetaTitle.substring(0, 60),
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
        } else {
          // If empty string, delete the metadata entry
          await db.user_metadata.deleteMany({
            where: {
              user_id: userId,
              key: 'custom_meta_title',
            },
          });
        }
      }
    }

    // Check for voiceover artist misuse (warn only, non-blocking)
    const voArtistWarnings: string[] = [];
    if (body.profile || body.studio) {
      const fieldsToCheck = {
        name: body.studio?.name || body.profile?.name,
        short_about: body.profile?.short_about,
        about: body.profile?.about,
        services_offered: body.profile?.services_offered,
        equipment_list: body.profile?.equipment_list,
      };
      const warnings = detectVoiceoverArtistMisuse(fieldsToCheck);
      voArtistWarnings.push(...warnings);
    }

    // Enforce: if required profile fields are incomplete, visibility must be OFF.
    // - If this request is a direct visibility toggle attempt to ON, reject it (and ensure it remains OFF).
    // - If this request updated profile data and made it incomplete, auto-disable visibility.
    let visibilityAutoDisabled = false;
    const eligibility = await getProfileVisibilityEligibility(userId);

    if (!eligibility.allRequiredComplete) {
      // Always ensure visibility is OFF when requirements are not met
      if (eligibility.currentVisibility) {
        await db.studio_profiles.update({
          where: { user_id: userId },
          data: { is_profile_visible: false, updated_at: new Date() },
        });
        visibilityAutoDisabled = true;
      }

      // If user attempted to explicitly enable visibility, return an error so the UI won't flip ON.
      if (isVisibilityToggleRequest && body?.studio?.is_profile_visible === true) {
        return NextResponse.json(
          {
            success: false,
            error: 'Complete all required profile fields before making your profile visible.',
            isVisible: false,
            required: eligibility.stats.required,
          },
          { status: 400 }
        );
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

    // Ensure the public profile page (and its metadata) updates immediately after edits.
    // This is important because the profile page uses ISR (`revalidate`) by default.
    try {
      if (updatedUser?.username) {
        revalidatePath(`/${updatedUser.username}`);
      }
    } catch {
      // best-effort; don't fail the API request if revalidation is unavailable
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
      allRequiredComplete: eligibility.allRequiredComplete,
      visibilityAutoDisabled,
      warnings: voArtistWarnings.length > 0 ? voArtistWarnings : undefined,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
