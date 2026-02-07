import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateCompletionStats } from '@/lib/utils/profile-completion';

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
          x_url: true,
          linkedin_url: true,
          instagram_url: true,
          youtube_url: true,
          tiktok_url: true,
          threads_url: true,
          soundcloud_url: true,
          connection1: true,
          connection2: true,
          connection3: true,
          connection4: true,
          connection5: true,
          connection6: true,
          connection7: true,
          connection8: true,
          connection9: true,
          connection10: true,
          connection11: true,
          connection12: true,
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
              membership_tier: true,
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

    // Apply lazy enforcement using shared enforcement logic
    const { computeEnforcementDecisions, applyEnforcementDecisions } = await import('@/lib/subscriptions/enforcement');
    const decisions = computeEnforcementDecisions(studios);
    const { statusUpdates, unfeaturedUpdates } = await applyEnforcementDecisions(decisions);
    
    if (statusUpdates > 0) {
      console.log(`🔄 Updated ${statusUpdates} studio statuses based on membership expiry`);
    }
    if (unfeaturedUpdates > 0) {
      console.log(`🔄 Unfeatured ${unfeaturedUpdates} expired featured studios`);
    }

    // Serialize Decimal fields and calculate profile completion
    let serializedStudios = studios.map(studio => {
      // Calculate profile completion using the shared calculator
      const completionData = {
        user: {
          username: studio.users.username || '',
          display_name: studio.users.display_name || '',
          email: studio.users.email || '',
          avatar_url: studio.users.avatar_url,
        },
        profile: {
          short_about: studio.short_about,
          about: studio.about,
          phone: studio.phone,
          location: studio.location,
          website_url: studio.website_url,
          equipment_list: studio.equipment_list,
          services_offered: studio.services_offered,
          rate_tier_1: studio.rate_tier_1,
          facebook_url: studio.facebook_url,
          x_url: studio.x_url,
          linkedin_url: studio.linkedin_url,
          instagram_url: studio.instagram_url,
          youtube_url: studio.youtube_url,
          tiktok_url: studio.tiktok_url,
          threads_url: studio.threads_url,
          soundcloud_url: studio.soundcloud_url,
          connection1: studio.connection1,
          connection2: studio.connection2,
          connection3: studio.connection3,
          connection4: studio.connection4,
          connection5: studio.connection5,
          connection6: studio.connection6,
          connection7: studio.connection7,
          connection8: studio.connection8,
          connection9: studio.connection9,
          connection10: studio.connection10,
          connection11: studio.connection11,
          connection12: studio.connection12,
        },
        studio: {
          name: studio.name,
          studio_types: studio.studio_studio_types?.map((st: any) => st.studio_type) || [],
          images: studio.studio_images || [],
          website_url: studio.website_url,
        },
      };
      
      const profileCompletion = calculateCompletionStats(completionData).overall.percentage;
      
      // Get membership expiry from subscription
      const latestSubscription = studio.users.subscriptions[0];
      const membershipExpiresAt = latestSubscription?.current_period_end || null;
      
      return {
        ...studio,
        status: studio.status,
        latitude: studio.latitude ? Number(studio.latitude) : null,
        longitude: studio.longitude ? Number(studio.longitude) : null,
        profile_completion: profileCompletion,
        last_login: studio.users.last_login,
        membership_expires_at: membershipExpiresAt,
        membership_tier: studio.users.membership_tier || 'BASIC',
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
