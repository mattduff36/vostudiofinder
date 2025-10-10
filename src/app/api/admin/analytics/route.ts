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
      recentActivity
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
      db.contact.groupBy({
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
      })
    ]);

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
      }))
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

