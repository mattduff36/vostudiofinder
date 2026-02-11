import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getProfileVisibilityEligibility } from '@/lib/utils/profile-visibility';

/**
 * Detect if profile content suggests user is listing themselves as a voiceover artist.
 * Returns array of warning/guidance messages if voiceover artist phrases are detected.
 * If the user has already selected the VOICEOVER studio type, the detection is skipped.
 */
function detectVoiceoverArtistMisuse(fields: {
  name?: string;
  short_about?: string;
  about?: string;
  services_offered?: string;
  equipment_list?: string;
}, studioTypes?: string[]): string[] {
  const warnings: string[] = [];

  // If user already has VOICEOVER selected, no need to warn — they are correctly categorised
  if (studioTypes?.includes('VOICEOVER')) {
    return warnings;
  }
  
  // Strong signals that user is a voiceover artist (not a studio owner)
  const voArtistPhrases = [
    { pattern: /\bvoice actor\b/gi, weight: 10, name: 'voice actor' },
    { pattern: /\bvoice actress\b/gi, weight: 10, name: 'voice actress' },
    { pattern: /\bvoice talent\b/gi, weight: 10, name: 'voice talent' },
    { pattern: /\bvoiceover artist\b/gi, weight: 10, name: 'voiceover artist' },
    { pattern: /\boffer voiceover work\b/gi, weight: 10, name: 'offer voiceover work' },
    { pattern: /\bvoiceover services\b/gi, weight: 8, name: 'voiceover services' },
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
    { pattern: /\bcontact me for voiceover\b/gi, weight: 10, name: 'contact me for voiceover' },
  ];
  
  // Combine all text fields for scanning
  const combinedText = [
    fields.name || '',
    fields.short_about || '',
    fields.about || '',
    fields.services_offered || '',
    fields.equipment_list || '',
  ].join(' ').toLowerCase();
  
  console.log('[VO Artist Detection] Combined text:', combinedText.substring(0, 200));
  
  // Score based on phrase matches
  let totalScore = 0;
  const matchedPhrases: string[] = [];
  
  voArtistPhrases.forEach(({ pattern, weight, name }) => {
    const matches = combinedText.match(pattern);
    if (matches && matches.length > 0) {
      console.log('[VO Artist Detection] Matched phrase:', name, 'weight:', weight, 'count:', matches.length);
      totalScore += weight * matches.length;
      if (!matchedPhrases.includes(name)) {
        matchedPhrases.push(name);
      }
    }
  });
  
  console.log('[VO Artist Detection] Total score:', totalScore, 'Matched phrases:', matchedPhrases);
  
  // If score exceeds threshold, provide guidance
  if (totalScore >= 10) {
    console.log('[VO Artist Detection] WARNING TRIGGERED');
    warnings.push(
      'Your profile contains language commonly associated with voiceover talent. ' +
      'If you are a voiceover artist, please select the "Voiceover" studio type instead — ' +
      'this is a dedicated category for voiceover professionals (available to Premium members). ' +
      'Please note that a single profile cannot advertise both a studio and voiceover services. ' +
      'If you wish to list both, we recommend creating a separate profile for each.'
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
            show_email: true, // Enable messages by default (matching schema default)
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

    // Lazy enforcement: update studio status based on membership tier + expiry (skip for admin accounts)
    const isAdminAccount = user.role === 'ADMIN';
    const latestSubscription = user.subscriptions[0];
    const userMembershipTier = (user as any).membership_tier || 'BASIC';
    
    if (studioProfile && !isAdminAccount) {
      const now = new Date();
      // Basic tier: always ACTIVE. Premium tier: check subscription expiry.
      let desiredStatus: 'ACTIVE' | 'INACTIVE';
      if (userMembershipTier === 'BASIC') {
        desiredStatus = 'ACTIVE';
      } else if (latestSubscription?.current_period_end) {
        desiredStatus = latestSubscription.current_period_end < now ? 'INACTIVE' : 'ACTIVE';
      } else {
        // Premium with no subscription = INACTIVE
        desiredStatus = 'INACTIVE';
      }
      
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

    // Admins are always treated as active Premium members
    const isAdmin = (user as any).role === 'ADMIN';

    // Default NULL membership_tier to BASIC — users created before the
    // membership_tier column was added are free-tier users.
    const effectiveTier = (user as any).membership_tier || 'BASIC';

    if (isAdmin) {
      membershipInfo.state = 'ACTIVE';
    } else if (effectiveTier === 'BASIC') {
      // Basic (free) tier users are always active, regardless of any stale
      // subscription records left over from a previous Premium membership.
      membershipInfo.state = 'ACTIVE';
    } else if (latestSubscription?.current_period_end) {
      const now = new Date();
      const expiryDate = latestSubscription.current_period_end;
      membershipInfo.expiresAt = expiryDate.toISOString();
      
      const diffMs = expiryDate.getTime() - now.getTime();
      membershipInfo.daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // A subscription is only ACTIVE if both the date is in the future AND
      // the subscription record itself is in ACTIVE status. A cancelled or
      // suspended subscription with remaining days should show as EXPIRED.
      const isDateValid = diffMs > 0;
      const isStatusActive = latestSubscription.status === 'ACTIVE';
      membershipInfo.state = (isDateValid && isStatusActive) ? 'ACTIVE' : 'EXPIRED';
    } else {
      // Premium users without a valid subscription record are expired
      membershipInfo.state = 'EXPIRED';
    }

    // Transform metadata array into key-value object
    const metadata: Record<string, string> = {};
    user.user_metadata?.forEach((meta) => {
      metadata[meta.key] = meta.value || '';
    });

    // Prepare response - split into profile (user fields) and studio (studio fields) for frontend compatibility
    // Admins always get Premium tier limits, regardless of their DB membership_tier value
    const { getTierLimits } = await import('@/lib/membership-tiers');
    const userTier = isAdmin ? 'PREMIUM' : effectiveTier;
    const tierLimits = getTierLimits(userTier);

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
          membership_tier: userTier,
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
          x_url: studioProfile.x_url,
          linkedin_url: studioProfile.linkedin_url,
          instagram_url: studioProfile.instagram_url,
          tiktok_url: studioProfile.tiktok_url,
          threads_url: studioProfile.threads_url,
          youtube_url: studioProfile.youtube_url,
          soundcloud_url: studioProfile.soundcloud_url,
          vimeo_url: studioProfile.vimeo_url,
          bluesky_url: studioProfile.bluesky_url,
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
        tierLimits,
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

    // Track fields dropped due to tier limits so we can inform the user
    const droppedFields: string[] = [];

    // Fetch user to check role (for admin bypass logic)
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const isAdmin = user.role === 'ADMIN';

    // Fetch user tier for enforcement
    const { getUserTier } = await import('@/lib/membership');
    const { getTierLimits } = await import('@/lib/membership-tiers');
    const userTier = await getUserTier(userId);
    const tierLimits = getTierLimits(userTier);

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
      // Enforce about max chars based on tier
      if (updates.about !== undefined) {
        profileUpdates.about = typeof updates.about === 'string'
          ? updates.about.substring(0, tierLimits.aboutMaxChars)
          : updates.about;
      }
      
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
      // Enforce phone/directions visibility based on tier
      if (updates.show_phone !== undefined) {
        if (tierLimits.phoneVisibility) {
          profileUpdates.show_phone = updates.show_phone;
        } else {
          profileUpdates.show_phone = false;
          if (updates.show_phone === true) {
            droppedFields.push('show_phone');
          }
        }
      }
      if (updates.show_address !== undefined) profileUpdates.show_address = updates.show_address;
      if (updates.show_directions !== undefined) {
        if (tierLimits.directionsVisibility) {
          profileUpdates.show_directions = updates.show_directions;
        } else {
          profileUpdates.show_directions = false;
          if (updates.show_directions === true) {
            droppedFields.push('show_directions');
          }
        }
      }
      
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
      
      // Social media & connections - enforce tier limits against TOTAL count (existing + new)
      // We must fetch the existing profile to count current values, not just values in this request.
      const socialFields = [
        'facebook_url', 'x_url', 'linkedin_url',
        'instagram_url', 'tiktok_url', 'threads_url',
        'youtube_url', 'soundcloud_url',
        'vimeo_url', 'bluesky_url',
      ] as const;

      const connectionFields = [
        'connection1', 'connection2', 'connection3', 'connection4',
        'connection5', 'connection6', 'connection7', 'connection8',
        'connection9', 'connection10', 'connection11', 'connection12',
      ] as const;

      // Geocode full_address BEFORE the transaction to avoid holding a row lock
      // during an external network call (which can take multiple seconds).
      let geocodeResult: { lat: number; lng: number; city?: string; country?: string } | null = null;
      if (updates.full_address !== undefined && updates.full_address &&
          updates.latitude === undefined && updates.longitude === undefined) {
        const { geocodeAddress } = await import('@/lib/maps');
        geocodeResult = await geocodeAddress(updates.full_address);
      }

      // Wrap tier-limit enforcement + write in a transaction with a row lock
      // to prevent concurrent requests from reading stale counts and bypassing limits.
      await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM studio_profiles WHERE user_id = ${userId} FOR UPDATE`;

      const existingProfileForLimits = await tx.studio_profiles.findUnique({
        where: { user_id: userId },
        select: {
          facebook_url: true, x_url: true, linkedin_url: true,
          instagram_url: true, tiktok_url: true, threads_url: true,
          youtube_url: true, soundcloud_url: true,
          vimeo_url: true, bluesky_url: true,
          connection1: true, connection2: true, connection3: true, connection4: true,
          connection5: true, connection6: true, connection7: true, connection8: true,
          connection9: true, connection10: true, connection11: true, connection12: true,
        },
      });

      // Track fields dropped due to tier limits so we can inform the user

      if (tierLimits.socialLinksMax !== null) {
        // Count existing non-empty social links that are NOT being overwritten in this request
        let socialCount = 0;
        for (const field of socialFields) {
          if (updates[field] !== undefined) {
            // This field is in the update - will be counted below
            continue;
          }
          // Count existing non-empty value
          const existingValue = existingProfileForLimits?.[field];
          if (existingValue && typeof existingValue === 'string' && existingValue.trim()) {
            socialCount++;
          }
        }

        // Now process the update values against the remaining budget
        for (const field of socialFields) {
          const value = updates[field];
          if (value !== undefined) {
            if (value && value.trim() && socialCount < tierLimits.socialLinksMax) {
              (profileUpdates as any)[field] = value;
              socialCount++;
            } else if (!value || !value.trim()) {
              // Allow clearing values
              (profileUpdates as any)[field] = value;
            } else {
              // Over limit - track the dropped field
              droppedFields.push(field);
            }
          }
        }
      } else {
        // Unlimited social links (Premium)
        if (updates.facebook_url !== undefined) profileUpdates.facebook_url = updates.facebook_url;
        if (updates.x_url !== undefined) profileUpdates.x_url = updates.x_url;
        if (updates.linkedin_url !== undefined) profileUpdates.linkedin_url = updates.linkedin_url;
        if (updates.instagram_url !== undefined) profileUpdates.instagram_url = updates.instagram_url;
        if (updates.tiktok_url !== undefined) profileUpdates.tiktok_url = updates.tiktok_url;
        if (updates.threads_url !== undefined) profileUpdates.threads_url = updates.threads_url;
        if (updates.youtube_url !== undefined) profileUpdates.youtube_url = updates.youtube_url;
        if (updates.soundcloud_url !== undefined) profileUpdates.soundcloud_url = updates.soundcloud_url;
        if (updates.vimeo_url !== undefined) profileUpdates.vimeo_url = updates.vimeo_url;
        if (updates.bluesky_url !== undefined) profileUpdates.bluesky_url = updates.bluesky_url;
      }
      
      // Connections - enforce tier limit against TOTAL enabled count (existing + new)
      // Count existing enabled connections that are NOT being overwritten in this request
      let enabledConnectionCount = 0;
      for (const field of connectionFields) {
        if (updates[field] !== undefined) {
          // This field is in the update - will be counted below
          continue;
        }
        // Count existing enabled value
        const existingValue = existingProfileForLimits?.[field];
        if (existingValue === '1') {
          enabledConnectionCount++;
        }
      }

      // Now process the update values against the remaining budget
      for (const field of connectionFields) {
        if (updates[field] !== undefined) {
          if (updates[field] === '1' && enabledConnectionCount < tierLimits.connectionsMax) {
            (profileUpdates as any)[field] = '1';
            enabledConnectionCount++;
          } else if (updates[field] === '1') {
            // Over limit - track the dropped field
            droppedFields.push(field);
          } else {
            // Allow disabling connections ('0') or other values
            (profileUpdates as any)[field] = updates[field];
          }
        }
      }

      // Custom connections - enforce tier limit
      if (updates.custom_connection_methods !== undefined) {
        if (Array.isArray(updates.custom_connection_methods)) {
          const validMethods = updates.custom_connection_methods.filter((m: string) => m && m.trim());
          profileUpdates.custom_connection_methods = validMethods.slice(0, tierLimits.customConnectionsMax);
          // Track excess custom connections that were dropped
          if (validMethods.length > tierLimits.customConnectionsMax) {
            droppedFields.push('custom_connection_methods');
          }
        } else {
          profileUpdates.custom_connection_methods = [];
        }
      }
      
      // Status
      if (updates.is_profile_visible !== undefined) profileUpdates.is_profile_visible = updates.is_profile_visible;
      if (updates.use_coordinates_for_map !== undefined) profileUpdates.use_coordinates_for_map = updates.use_coordinates_for_map;
      
      // Apply pre-fetched geocoding result (network call was done before the transaction)
      if (updates.full_address !== undefined && updates.full_address &&
          updates.latitude === undefined && updates.longitude === undefined) {
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
        const existingProfile = await tx.studio_profiles.findUnique({
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
          await tx.studio_profiles.update({
            where: { user_id: userId },
            data: {
              ...profileUpdates,
              updated_at: new Date(),
            },
          });
        } else {
          // Create studio profile if it doesn't exist (shouldn't happen after migration)
          const { randomBytes } = await import('crypto');
          await tx.studio_profiles.create({
            data: {
              id: randomBytes(12).toString('base64url'),
              user_id: userId,
              name: updates.name || 'My Studio', // Required field
              city: updates.city || '', // Required field with default
              is_profile_visible: false, // Hidden by default, user can manually enable when ready
              show_email: true, // Enable messages by default (matching schema default)
              ...profileUpdates,
              updated_at: new Date(),
            },
          });
        }

        // Update studio types if provided (enforce tier limits)
        if (body.studio_types && Array.isArray(body.studio_types)) {
          const profile = await tx.studio_profiles.findUnique({
            where: { user_id: userId },
          });
          
          if (profile) {
            // Filter out excluded studio types for this tier
            const excludedTypes = body.studio_types.filter(
              (type: string) => tierLimits.studioTypesExcluded.includes(type)
            );
            let allowedTypes = body.studio_types.filter(
              (type: string) => !tierLimits.studioTypesExcluded.includes(type)
            );

            // Track excluded studio types that were dropped
            if (excludedTypes.length > 0) {
              droppedFields.push('studio_types');
            }

            // Enforce VOICEOVER exclusivity: if VOICEOVER is present alongside other types,
            // keep only VOICEOVER (it cannot be combined with other studio types)
            // Exception: ADMIN users can combine VOICEOVER with other types
            if (!isAdmin && allowedTypes.includes('VOICEOVER') && allowedTypes.length > 1) {
              allowedTypes = ['VOICEOVER'];
              if (!droppedFields.includes('studio_types')) {
                droppedFields.push('studio_types');
              }
            }

            // Enforce max studio types for this tier
            if (tierLimits.studioTypesMax !== null) {
              if (allowedTypes.length > tierLimits.studioTypesMax) {
                if (!droppedFields.includes('studio_types')) {
                  droppedFields.push('studio_types');
                }
              }
              allowedTypes = allowedTypes.slice(0, tierLimits.studioTypesMax);
            }

            // Delete existing types
            await tx.studio_studio_types.deleteMany({
              where: { studio_id: profile.id },
            });
            
            // Create new types
            if (allowedTypes.length > 0) {
              const { randomBytes } = await import('crypto');
              await tx.studio_studio_types.createMany({
                data: allowedTypes.map((type: string) => ({
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
          const profile = await tx.studio_profiles.findUnique({
            where: { user_id: userId },
          });
          
          if (profile) {
            // Delete existing services
            await tx.studio_services.deleteMany({
              where: { studio_id: profile.id },
            });
            
            // Create new services
            if (body.services.length > 0) {
              const { randomBytes } = await import('crypto');
              await tx.studio_services.createMany({
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
      }); // end tier-limit transaction
    }

    // Handle user metadata updates (e.g., custom_meta_title)
    if (body.metadata) {
      if (body.metadata.custom_meta_title !== undefined) {
        const customMetaTitle = body.metadata.custom_meta_title?.trim() || '';
        
        // Only block if a Basic user tries to SET a non-empty custom title.
        // Empty/null values are always allowed (clearing reverts to auto-generated).
        if (customMetaTitle && !tierLimits.advancedSettings) {
          return NextResponse.json(
            {
              success: false,
              error: 'Custom SEO meta title is a Premium feature. Upgrade to Premium to unlock advanced settings.',
              code: 'PREMIUM_REQUIRED',
            },
            { status: 403 }
          );
        }

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
      const warnings = detectVoiceoverArtistMisuse(fieldsToCheck, body.studio_types);
      voArtistWarnings.push(...warnings);
    }

    // Enforce: if required profile fields are incomplete, visibility must be OFF.
    // Exception: legacy profiles (created before 2026-01-01) can keep visibility ON.
    // - If this request is a direct visibility toggle attempt to ON, reject it (and ensure it remains OFF).
    // - If this request updated profile data and made it incomplete, auto-disable visibility.
    let visibilityAutoDisabled = false;
    const eligibility = await getProfileVisibilityEligibility(userId);

    if (!eligibility.allRequiredComplete && !eligibility.isLegacyProfile) {
      // Always ensure visibility is OFF when requirements are not met (non-legacy only)
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
      tierLimitReached: droppedFields.length > 0 ? {
        droppedFields,
        message: `Some fields were not saved because your Basic tier limit was reached. Upgrade to Premium to unlock all features.`,
      } : undefined,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
