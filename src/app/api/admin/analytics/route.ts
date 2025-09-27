import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

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
      db.user.count(),
      db.user.count({ where: { role: { not: 'ADMIN' } } }),
      
      // Studio counts
      db.studio.count(),
      db.studio.count({ where: { status: 'ACTIVE' } }),
      db.studio.count({ where: { isVerified: true } }),
      
      // Connection counts
      db.contact.count(),
      db.contact.count({ where: { accepted: 1 } }),
      
      // FAQ count
      db.faq.count(),
      
      // User dates
      db.user.findFirst({ 
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      }),
      db.user.findFirst({ 
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      }),
      
      // Top studios by connections
      db.studio.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' },
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
      db.user.groupBy({
        by: ['role'],
        _count: { role: true }
      }),
      
      // Connection status distribution
      db.contact.groupBy({
        by: ['accepted'],
        _count: { accepted: true }
      }),
      
      // Recent activity
      db.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          displayName: true,
          createdAt: true,
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
          first_user_date: firstUser?.createdAt?.toISOString() || null,
          latest_user_date: latestUser?.createdAt?.toISOString() || null
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
        name: activity.displayName || 'Unknown User',
        date: activity.createdAt.toISOString(),
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
