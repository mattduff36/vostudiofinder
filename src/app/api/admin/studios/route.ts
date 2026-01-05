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
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

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

    // Build orderBy clause based on sortBy parameter
    let orderBy: any = { updated_at: 'desc' }; // default
    
    const validSortFields: Record<string, any> = {
      'name': { name: sortOrder },
      'owner': { users: { display_name: sortOrder } },
      'status': { status: sortOrder },
      'updated_at': { updated_at: sortOrder },
      'is_profile_visible': { is_profile_visible: sortOrder },
      'is_verified': { is_verified: sortOrder },
      'is_featured': { is_featured: sortOrder },
      'last_login': { users: { last_login: sortOrder } },
      'profile_completion': { updated_at: sortOrder }, // Will sort on client after calculation
    };

    if (sortBy && validSortFields[sortBy]) {
      orderBy = validSortFields[sortBy];
    }

    // For profile_completion sorting, we need to fetch all studios first, then sort and paginate
    const shouldFetchAll = sortBy === 'profile_completion';
    
    // Get studio profiles with pagination (or all if sorting by profile_completion)
    const [studios, total] = await Promise.all([
      db.studio_profiles.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          short_about: true,
          about: true,
          phone: true,
          location: true,
          equipment_list: true,
          services_offered: true,
          website_url: true,
          facebook_url: true,
          twitter_url: true,
          linkedin_url: true,
          instagram_url: true,
          youtube_url: true,
          vimeo_url: true,
          soundcloud_url: true,
          connection1: true,
          connection2: true,
          connection3: true,
          connection4: true,
          connection5: true,
          connection6: true,
          connection7: true,
          connection8: true,
          rate_tier_1: true,
          status: true,
          is_verified: true,
          is_premium: true,
          is_featured: true,
          featured_until: true,
          is_spotlight: true,
          is_profile_visible: true,
          created_at: true,
          updated_at: true,
          latitude: true,
          longitude: true,
          users: {
            select: {
              display_name: true,
              email: true,
              username: true,
              avatar_url: true,
              created_at: true,
              updated_at: true,
              last_login: true,
              subscriptions: {
                orderBy: { created_at: 'desc' },
                take: 1,
                select: {
                  id: true,
                  current_period_end: true,
                  status: true,
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
            select: {
              id: true,
            }
          },
        },
        orderBy: shouldFetchAll ? { updated_at: 'desc' } : orderBy,
        // Don't apply pagination if we need to sort by profile_completion
        ...(shouldFetchAll ? {} : { take: limit, skip: offset })
      }),
      db.studio_profiles.count({ where })
    ]);

    // Apply lazy enforcement and serialize Decimal fields (skip for admin accounts)
    const now = new Date();
    const studiosToUpdate: { id: string; status: 'ACTIVE' | 'INACTIVE' }[] = [];
    const studiosToUnfeature: string[] = [];

    // First pass: identify studios that need status updates (exclude admins)
    studios.forEach(studio => {
      const isAdminAccount = studio.users.email === 'admin@mpdee.co.uk' || studio.users.email === 'guy@voiceoverguy.co.uk';
      
      if (isAdminAccount) {
        // Ensure admin studios are always ACTIVE
        if (studio.status !== 'ACTIVE') {
          studiosToUpdate.push({ id: studio.id, status: 'ACTIVE' });
        }
      } else {
        // For non-admin accounts, enforce based on membership expiry
        const latestSubscription = studio.users.subscriptions[0];
        if (latestSubscription?.current_period_end) {
          const isExpired = latestSubscription.current_period_end < now;
          const desiredStatus = isExpired ? 'INACTIVE' : 'ACTIVE';
          
          if (studio.status !== desiredStatus) {
            studiosToUpdate.push({ id: studio.id, status: desiredStatus });
          }
        }
      }
      
      // Check for expired featured status
      if (studio.is_featured && studio.featured_until && studio.featured_until < now) {
        studiosToUnfeature.push(studio.id);
      }
    });

    // Batch update studios that need status changes
    if (studiosToUpdate.length > 0) {
      await Promise.all(
        studiosToUpdate.map(({ id, status }) =>
          db.studio_profiles.update({
            where: { id },
            data: { status, updated_at: now }
          })
        )
      );
      console.log(`🔄 Updated ${studiosToUpdate.length} studio statuses based on membership expiry`);
    }
    
    // Batch unfeature expired featured studios
    if (studiosToUnfeature.length > 0) {
      await db.studio_profiles.updateMany({
        where: { id: { in: studiosToUnfeature } },
        data: { is_featured: false, updated_at: now }
      });
      console.log(`🔄 Unfeatured ${studiosToUnfeature.length} expired featured studios`);
    }

    // Serialize Decimal fields and calculate profile completion
    let serializedStudios = studios.map(studio => {
      // Calculate profile completion - only include defined values
      const profileData: any = {
        username: studio.users.username,
        display_name: studio.users.display_name,
        email: studio.users.email,
        studio_name: studio.name,
        studio_types_count: studio.studio_studio_types?.length || 0,
        images_count: studio.studio_images?.length || 0,
      };
      
      // Add optional fields only if they exist
      if (studio.short_about) profileData.short_about = studio.short_about;
      if (studio.about) profileData.about = studio.about;
      if (studio.phone) profileData.phone = studio.phone;
      if (studio.location) profileData.location = studio.location;
      if (studio.website_url) profileData.website_url = studio.website_url;
      if (studio.equipment_list) profileData.equipment_list = studio.equipment_list;
      if (studio.services_offered) profileData.services_offered = studio.services_offered;
      if (studio.users.avatar_url) profileData.avatar_url = studio.users.avatar_url;
      if (studio.rate_tier_1) profileData.rate_tier_1 = studio.rate_tier_1;
      if (studio.facebook_url) profileData.facebook_url = studio.facebook_url;
      if (studio.twitter_url) profileData.twitter_url = studio.twitter_url;
      if (studio.linkedin_url) profileData.linkedin_url = studio.linkedin_url;
      if (studio.instagram_url) profileData.instagram_url = studio.instagram_url;
      if (studio.youtube_url) profileData.youtube_url = studio.youtube_url;
      if (studio.vimeo_url) profileData.vimeo_url = studio.vimeo_url;
      if (studio.soundcloud_url) profileData.soundcloud_url = studio.soundcloud_url;
      if (studio.connection1) profileData.connection1 = studio.connection1;
      if (studio.connection2) profileData.connection2 = studio.connection2;
      if (studio.connection3) profileData.connection3 = studio.connection3;
      if (studio.connection4) profileData.connection4 = studio.connection4;
      if (studio.connection5) profileData.connection5 = studio.connection5;
      if (studio.connection6) profileData.connection6 = studio.connection6;
      if (studio.connection7) profileData.connection7 = studio.connection7;
      if (studio.connection8) profileData.connection8 = studio.connection8;
      
      const profileCompletion = calculateProfileCompletion(profileData);
      
      // Get membership expiry from subscription
      const latestSubscription = studio.users.subscriptions[0];
      const membershipExpiresAt = latestSubscription?.current_period_end || null;
      
      // Apply status update from enforcement
      const statusUpdate = studiosToUpdate.find(s => s.id === studio.id);
      const effectiveStatus = statusUpdate ? statusUpdate.status : studio.status;
      
      return {
        ...studio,
        status: effectiveStatus,
        latitude: studio.latitude ? Number(studio.latitude) : null,
        longitude: studio.longitude ? Number(studio.longitude) : null,
        profile_completion: profileCompletion,
        last_login: studio.users.last_login,
        membership_expires_at: membershipExpiresAt,
      };
    });

    // Sort by profile completion if requested (since it's calculated, not in DB)
    if (sortBy === 'profile_completion') {
      serializedStudios.sort((a, b) => {
        const aCompletion = a.profile_completion || 0;
        const bCompletion = b.profile_completion || 0;
        return sortOrder === 'asc' 
          ? aCompletion - bCompletion 
          : bCompletion - aCompletion;
      });
      
      // Now apply pagination to the sorted results
      serializedStudios = serializedStudios.slice(offset, offset + limit);
    }

    const hasMore = offset + limit < total;

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
