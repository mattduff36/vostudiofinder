import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email/email-service';
import { getBaseUrl } from '@/lib/seo/site';

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
    
    // Check if user is admin using multiple criteria
    const isAdmin = session?.user?.email === 'admin@mpdee.co.uk' || 
                    session?.user?.username === 'VoiceoverGuy' || 
                    session?.user?.role === 'ADMIN';
    
    if (!session || !isAdmin) {
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
            email_verified: true,
            avatar_url: true,
            membership_tier: true,
            auto_renew: true,
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

    // Get tier limits for the studio owner (admins get Premium limits)
    const { getUserTierLimits } = await import('@/lib/membership');
    const tierLimits = await getUserTierLimits(studio.user_id);

    // Transform to match expected format for the frontend
    const studioData = {
      id: studio.id,
      username: studio.users?.username, // Use actual username for URLs
      display_name: studio.users?.display_name, // Use actual display name
      email: studio.users?.email,
      email_verified: studio.users?.email_verified ?? false,
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
      x: studio.x_url || '',
      linkedin: studio.linkedin_url || '',
      soundcloud: studio.soundcloud_url || '',
      vimeo: studio.vimeo_url || '',
      bluesky: studio.bluesky_url || '',
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
      email_verified: studioData.email_verified,
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
        x: studioData.x,
        linkedin: studioData.linkedin,
        soundcloud: studioData.soundcloud,
        vimeo: studioData.vimeo,
        bluesky: studioData.bluesky,
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
        membership_tier: studio.users?.membership_tier || 'BASIC',
        auto_renew: studio.users?.auto_renew ?? false,
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

    return NextResponse.json({ profile, tierLimits });

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
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.email === 'admin@mpdee.co.uk' || 
                    session?.user?.username === 'VoiceoverGuy' || 
                    session?.user?.role === 'ADMIN';
    
    if (!session || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request
    const studioId = (await params).id;
    const body = await request.json();

    // 3. Verify studio exists
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

    // 4. Build user updates (simple fields)
    const { buildUserUpdate, buildStudioUpdate, buildProfileUpdate } = await import('@/lib/admin/studios/update/field-mapping');
    let userUpdateData = buildUserUpdate(body);
    
    // 5. Handle email change (complex validation + verification flow)
    const { prepareEmailChange } = await import('@/lib/admin/studios/update/email');
    const { userUpdates: emailUpdates, verificationData } = await prepareEmailChange(
      body,
      existingStudio.users?.email,
      existingStudio.user_id,
      body.display_name ?? existingStudio.users?.display_name ?? 'User',
      getBaseUrl(request)
    );
    userUpdateData = { ...userUpdateData, ...emailUpdates };
    
    // 6. Build studio & profile updates
    let studioUpdateData = buildStudioUpdate(body);
    const profileUpdateData = buildProfileUpdate(body);
    
    // 7. Handle geocoding (complex conditional logic)
    const { maybeGeocodeStudioAddress } = await import('@/lib/admin/studios/update/geocoding');
    const geocodeUpdates = await maybeGeocodeStudioAddress(existingStudio, body);
    studioUpdateData = { ...studioUpdateData, ...geocodeUpdates };
    
    // 8. Validate featured status transition (max 6 limit)
    if (body._meta?.featured !== undefined) {
      const isFeatured = body._meta.featured === '1' || body._meta.featured === true || body._meta.featured === 1;
      const { validateFeaturedTransition } = await import('@/lib/admin/studios/update/featured');
      const validation = await validateFeaturedTransition(
        studioId,
        isFeatured,
        existingStudio.is_featured || false,
        body._meta?.featured_expires_at
      );
      
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: validation.status });
      }
    }

    // 9. Merge all studio_profiles updates
    const allStudioProfileUpdates = {
      ...studioUpdateData,
      ...profileUpdateData
    };

    if (Object.keys(allStudioProfileUpdates).length > 0) {
      allStudioProfileUpdates.updated_at = new Date();
    }

    logger.log('[Admin Update] Studio updates:', JSON.stringify(allStudioProfileUpdates, null, 2));

    // 10. Execute transaction
    const { handleMembershipExpiryUpdate, handleStudioTypesUpdate, handleCustomMetaTitleUpdate } = 
      await import('@/lib/admin/studios/update/transaction');
    
    await prisma.$transaction(async (tx) => {
      // Update user
      if (Object.keys(userUpdateData).length > 0) {
        await tx.users.update({
          where: { id: existingStudio.user_id },
          data: userUpdateData
        });
      }

      // Update studio_profiles
      if (Object.keys(allStudioProfileUpdates).length > 0) {
        await tx.studio_profiles.update({
          where: { id: studioId },
          data: allStudioProfileUpdates
        });
      }

      // Update studio types
      await handleStudioTypesUpdate(tx, studioId, body.studioTypes);

      // Handle membership expiry
      const currentSubscription = await tx.subscriptions.findFirst({
        where: { user_id: existingStudio.user_id },
        orderBy: { created_at: 'desc' }
      });
      
      await handleMembershipExpiryUpdate(tx, {
        userId: existingStudio.user_id,
        studioId,
        newExpiryValue: body._meta?.membership_expires_at,
        currentSubscription,
        skipStatusUpdate: body.status !== undefined,
      });

      // Handle custom meta title
      await handleCustomMetaTitleUpdate(tx, existingStudio.user_id, body._meta?.custom_meta_title);
    });

    // 11. Send verification email if needed
    let emailSendResult: { sent: boolean; error?: string } | null = null;
    if (verificationData) {
      try {
        await sendVerificationEmail(
          verificationData.email,
          verificationData.displayName,
          verificationData.verificationUrl
        );
        emailSendResult = { sent: true };
      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
        console.error('[Admin Update] Failed to send verification email:', emailError);
        emailSendResult = { sent: false, error: errorMessage };
      }
    }

    // 12. Fetch updated coordinates and build response
    const updatedStudio = await prisma.studio_profiles.findUnique({
      where: { id: studioId },
      select: {
        latitude: true,
        longitude: true,
        full_address: true,
        city: true,
      },
    });

    const response: any = { 
      success: true,
      message: 'Studio profile updated successfully',
      coordinates: {
        latitude: updatedStudio?.latitude ? parseFloat(updatedStudio.latitude.toString()) : null,
        longitude: updatedStudio?.longitude ? parseFloat(updatedStudio.longitude.toString()) : null,
      },
      full_address: updatedStudio?.full_address || null,
      city: updatedStudio?.city || null,
    };

    if (emailSendResult) {
      response.verificationEmail = emailSendResult;
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Update studio error:', error);
    
    // Handle special error codes
    if (error.message === 'EMAIL_IN_USE') {
      return NextResponse.json({ 
        error: 'Email address is already in use by another account' 
      }, { status: 400 });
    }
    
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
    
    // Check if user is admin using multiple criteria
    const isAdmin = session?.user?.email === 'admin@mpdee.co.uk' || 
                    session?.user?.username === 'VoiceoverGuy' || 
                    session?.user?.role === 'ADMIN';
    
    if (!session || !isAdmin) {
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
