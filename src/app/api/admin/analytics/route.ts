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

    // Get analytics data
    const [
      totalUsers,
      activeUsers,
      totalStudios,
      activeStudios,
      verifiedStudios,
      totalConnections,
      activeConnections,
      totalFaqs,
      firstUser,
      latestUser,
      topStudios,
      usersByStatus,
      connectionsByStatus,
      recentActivity,
      customConnectionMethods
    ] = await Promise.all([
      // User counts
      db.users.count(),
      db.users.count({ where: { role: { not: 'ADMIN' } } }),
      
      // Studio counts
      db.studios.count(),
      db.studios.count({ where: { status: 'ACTIVE' } }),
      db.studios.count({ where: { is_verified: true } }),
      
      // Connection counts
      db.contacts.count(),
      db.contacts.count({ where: { accepted: 1 } }),
      
      // FAQ count
      db.faq.count(),
      
      // User dates
      db.users.findFirst({ 
        orderBy: { created_at: 'asc' },
        select: { created_at: true }
      }),
      db.users.findFirst({ 
        orderBy: { created_at: 'desc' },
        select: { created_at: true }
      }),
      
      // Top studios by connections
      db.studios.findMany({
        take: 10,
        orderBy: { updated_at: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          _count: {
            select: {
              reviews: true
            }
          }
        }
      }),
      
      // User status distribution
      db.users.groupBy({
        by: ['role'],
        _count: { role: true }
      }),
      
      // Connection status distribution
      db.contacts.groupBy({
        by: ['accepted'],
        _count: { accepted: true }
      }),
      
      // Recent activity
      db.users.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          display_name: true,
          created_at: true,
          role: true
        }
      }),
      
      // Custom connection methods
      db.user_profiles.findMany({
        where: {
          custom_connection_methods: {
            isEmpty: false
          }
        },
        select: {
          custom_connection_methods: true
        }
      })
    ]);

    // Process custom connection methods
    const methodCounts: { [key: string]: number } = {};
    customConnectionMethods.forEach(profile => {
      profile.custom_connection_methods?.forEach(method => {
        if (method && method.trim()) {
          const normalizedMethod = method.trim();
          methodCounts[normalizedMethod] = (methodCounts[normalizedMethod] || 0) + 1;
        }
      });
    });

    // Sort by count and get top 10
    const topCustomMethods = Object.entries(methodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([method, count]) => ({ method, count }));

    const analyticsData = {
      overview: {
        users: {
          total_users: totalUsers,
          active_users: activeUsers,
          pending_users: totalUsers - activeUsers,
          first_user_date: firstUser?.created_at?.toISOString() || null,
          latest_user_date: latestUser?.created_at?.toISOString() || null
        },
        studios: {
          total_studios: totalStudios,
          active_studios: activeStudios,
          verified_studios: verifiedStudios
        },
        connections: {
          total_connections: totalConnections,
          active_connections: activeConnections,
          pending_connections: totalConnections - activeConnections
        },
        venues: {
          total_venues: 0, // Placeholder - no venues table yet
          venues_with_coords: 0
        },
        faqs: {
          total_faqs: totalFaqs,
          answered_faqs: totalFaqs // All FAQs are considered answered
        },
        custom_methods: {
          total_users_with_custom: customConnectionMethods.length,
          unique_methods: Object.keys(methodCounts).length,
          top_methods: topCustomMethods
        }
      },
      topStudios: topStudios.map(studio => ({
        id: studio.id,
        name: studio.name,
        connection_count: studio._count.reviews,
        status: studio.status
      })),
      distributions: {
        usersByStatus: usersByStatus.map(item => ({
          status: item.role,
          count: item._count.role
        })),
        connectionsByStatus: connectionsByStatus.map(item => ({
          accepted: item.accepted,
          count: item._count.accepted
        }))
      },
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        name: activity.display_name || 'Unknown User',
        date: activity.created_at.toISOString(),
        status: activity.role
      })),
      customConnectionMethods: topCustomMethods
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

