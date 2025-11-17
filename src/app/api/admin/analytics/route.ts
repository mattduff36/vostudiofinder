import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all analytics data in parallel
    const [
      // Basic counts
      totalUsers,
      totalStudios,
      totalReviews,
      totalContacts,
      
      // Studio metrics
      activeStudios,
      verifiedStudios,
      studiosWithProfiles,
      studiosByStatus,
      
      // User metrics
      usersByRole,
      usersWithProfiles,
      
      // Review metrics
      reviewStats,
      topRatedStudios,
      
      // Contact metrics
      acceptedContacts,
      contactsByStatus,
      
      // Profile data
      allProfiles,
      
      // Time-based data
      firstUser,
      latestUser,
      recentStudios,
      recentUsers,
      
    ] = await Promise.all([
      // Basic counts
      db.users.count(),
      db.studios.count(),
      db.reviews.count(),
      db.contacts.count(),
      
      // Studio metrics
      db.studios.count({ where: { status: 'ACTIVE' } }),
      db.studios.count({ where: { is_verified: true } }),
      db.studios.count({ where: { users: { user_profiles: { isNot: null } } } }),
      db.studios.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      
      // User metrics
      db.users.groupBy({
        by: ['role'],
        _count: { role: true }
      }),
      db.user_profiles.count(),
      
      // Review metrics
      db.reviews.aggregate({
        _avg: { rating: true },
        _count: { id: true }
      }),
      db.studios.findMany({
        take: 10,
        where: {
          reviews: {
            some: {}
          }
        },
        select: {
          id: true,
          name: true,
          status: true,
          is_verified: true,
          _count: {
            select: { reviews: true }
          },
          reviews: {
            select: { rating: true }
          }
        }
      }),
      
      // Contact metrics
      db.contacts.count({ where: { accepted: 1 } }),
      db.contacts.groupBy({
        by: ['accepted'],
        _count: { accepted: true }
      }),
      
      // Profile data for connection analysis
      db.user_profiles.findMany({
        select: {
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
          custom_connection_methods: true,
          location: true,
          rate_tier_1: true,
          rate_tier_2: true,
          rate_tier_3: true,
        }
      }),
      
      // Time-based data
      db.users.findFirst({ 
        orderBy: { created_at: 'asc' },
        select: { created_at: true }
      }),
      db.users.findFirst({ 
        orderBy: { created_at: 'desc' },
        select: { created_at: true }
      }),
      db.studios.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          created_at: true,
          is_verified: true
        }
      }),
      db.users.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          display_name: true,
          username: true,
          created_at: true,
          role: true
        }
      }),
    ]);

    // Process connection methods data
    const connectionMethodCounts: { [key: string]: number } = {
      connection1: 0,
      connection2: 0,
      connection3: 0,
      connection4: 0,
      connection5: 0,
      connection6: 0,
      connection7: 0,
      connection8: 0,
      connection9: 0,
      connection10: 0,
      connection11: 0,
      connection12: 0,
    };
    
    const customMethodCounts: { [key: string]: number } = {};
    const locationCounts: { [key: string]: number } = {};
    let profilesWithRates = 0;
    let totalRateTier1 = 0;
    let totalRateTier2 = 0;
    let totalRateTier3 = 0;

    allProfiles.forEach(profile => {
      // Count standard connection methods
      for (let i = 1; i <= 12; i++) {
        const connKey = `connection${i}` as keyof typeof profile;
        if (profile[connKey] === '1') {
          connectionMethodCounts[`connection${i}`]++;
        }
      }
      
      // Count custom connection methods
      profile.custom_connection_methods?.forEach(method => {
        if (method && method.trim()) {
          const normalized = method.trim();
          customMethodCounts[normalized] = (customMethodCounts[normalized] || 0) + 1;
        }
      });
      
      // Count locations
      if (profile.location) {
        const loc = profile.location.trim();
        if (loc) {
          locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        }
      }
      
      // Calculate rate averages
      if (profile.rate_tier_1 || profile.rate_tier_2 || profile.rate_tier_3) {
        profilesWithRates++;
        if (profile.rate_tier_1) totalRateTier1 += parseFloat(profile.rate_tier_1);
        if (profile.rate_tier_2) totalRateTier2 += parseFloat(profile.rate_tier_2);
        if (profile.rate_tier_3) totalRateTier3 += parseFloat(profile.rate_tier_3);
      }
    });

    // Get top custom methods
    const topCustomMethods = Object.entries(customMethodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([method, count]) => ({ method, count }));

    // Get top locations
    const topLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([location, count]) => ({ location, count }));

    // Calculate top rated studios
    const studiosWithAvgRating = topRatedStudios
      .map(studio => ({
        id: studio.id,
        name: studio.name,
        status: studio.status,
        is_verified: studio.is_verified,
        review_count: studio._count.reviews,
        avg_rating: studio.reviews.length > 0
          ? studio.reviews.reduce((sum, r) => sum + r.rating, 0) / studio.reviews.length
          : 0
      }))
      .sort((a, b) => b.avg_rating - a.avg_rating)
      .slice(0, 10);

    // Connection method labels
    const connectionLabels: { [key: string]: string } = {
      connection1: 'Source Connect',
      connection2: 'Source Connect Now',
      connection3: 'Phone Patch',
      connection4: 'Session Link Pro',
      connection5: 'Zoom or Teams',
      connection6: 'Cleanfeed',
      connection7: 'Riverside',
      connection8: 'Google Hangouts',
      connection9: 'ipDTL',
      connection10: 'SquadCast',
      connection11: 'Zencastr',
      connection12: 'Other (See profile)',
    };

    const standardConnectionMethods = Object.entries(connectionMethodCounts)
      .map(([id, count]) => ({
        id,
        label: connectionLabels[id],
        count
      }))
      .sort((a, b) => b.count - a.count);

    // Build response
    const analyticsData = {
      overview: {
        total_users: totalUsers,
        total_studios: totalStudios,
        total_reviews: totalReviews,
        total_contacts: totalContacts,
        active_studios: activeStudios,
        verified_studios: verifiedStudios,
        studios_with_profiles: studiosWithProfiles,
        users_with_profiles: usersWithProfiles,
        accepted_contacts: acceptedContacts,
        avg_rating: reviewStats._avg.rating || 0,
        first_user_date: firstUser?.created_at?.toISOString() || null,
        latest_user_date: latestUser?.created_at?.toISOString() || null,
      },
      studios: {
        by_status: studiosByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        top_rated: studiosWithAvgRating,
        recent: recentStudios.map(studio => ({
          id: studio.id,
          name: studio.name,
          status: studio.status,
          is_verified: studio.is_verified,
          created_at: studio.created_at.toISOString()
        }))
      },
      users: {
        by_role: usersByRole.map(item => ({
          role: item.role,
          count: item._count.role
        })),
        recent: recentUsers.map(user => ({
          id: user.id,
          name: user.display_name || user.username || 'Unknown',
          role: user.role,
          created_at: user.created_at.toISOString()
        }))
      },
      contacts: {
        by_status: contactsByStatus.map(item => ({
          status: item.accepted === 1 ? 'Accepted' : 'Pending',
          accepted: item.accepted,
          count: item._count.accepted
        })),
        total: totalContacts,
        accepted: acceptedContacts,
        pending: totalContacts - acceptedContacts,
        acceptance_rate: totalContacts > 0 
          ? Math.round((acceptedContacts / totalContacts) * 100) 
          : 0
      },
      connection_methods: {
        standard: standardConnectionMethods,
        custom: topCustomMethods,
        total_users_with_custom: Object.keys(customMethodCounts).length > 0 
          ? Object.values(customMethodCounts).reduce((sum, count) => sum + count, 0)
          : 0,
        unique_custom_methods: Object.keys(customMethodCounts).length
      },
      geographic: {
        top_locations: topLocations,
        total_locations: Object.keys(locationCounts).length,
        studios_with_location: Object.values(locationCounts).reduce((sum, count) => sum + count, 0)
      },
      rates: {
        profiles_with_rates: profilesWithRates,
        avg_tier_1: profilesWithRates > 0 ? Math.round(totalRateTier1 / profilesWithRates) : 0,
        avg_tier_2: profilesWithRates > 0 ? Math.round(totalRateTier2 / profilesWithRates) : 0,
        avg_tier_3: profilesWithRates > 0 ? Math.round(totalRateTier3 / profilesWithRates) : 0,
      }
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Admin analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

