import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Overview statistics
    const [
      total_users,
      total_studios,
      active_studios,
      verified_studios,
      featured_studios,
      premium_studios,
      users_with_studios,
    ] = await Promise.all([
      db.users.count(),
      db.studio_profiles.count(),
      db.studio_profiles.count({ where: { status: 'ACTIVE' } }),
      db.studio_profiles.count({ where: { is_verified: true } }),
      db.studio_profiles.count({ where: { is_featured: true } }),
      db.studio_profiles.count({ where: { is_premium: true } }),
      db.studio_profiles.count(),
    ]);

    // User roles breakdown
    const user_roles_raw = await db.users.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    });

    const user_roles = user_roles_raw.map(r => ({
      role: r.role,
      count: r._count.role,
    }));

    // Studio status breakdown
    const studio_status_raw = await db.studio_profiles.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const studio_status = studio_status_raw.map(s => ({
      status: s.status,
      count: s._count.status,
    }));

    // Connection methods usage
    const studios = await db.studio_profiles.findMany({
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
      },
    });

    // Count connection methods
    const connectionCounts: Record<string, number> = {};
    const customConnectionCounts: Record<string, number> = {};

    studios.forEach(studio => {
      // Standard connections
      [
        studio.connection1, studio.connection2, studio.connection3, studio.connection4,
        studio.connection5, studio.connection6, studio.connection7, studio.connection8,
        studio.connection9, studio.connection10, studio.connection11, studio.connection12,
      ].forEach(conn => {
        if (conn) {
          connectionCounts[conn] = (connectionCounts[conn] || 0) + 1;
        }
      });

      // Custom connections
      if (studio.custom_connection_methods) {
        studio.custom_connection_methods.forEach(method => {
          if (method) {
            customConnectionCounts[method] = (customConnectionCounts[method] || 0) + 1;
          }
        });
      }
    });

    const connection_methods = Object.entries(connectionCounts)
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);

    const custom_connections = Object.entries(customConnectionCounts)
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);

    // Geographic distribution (by city)
    const geographic_data = await db.studio_profiles.groupBy({
      by: ['city'],
      _count: {
        city: true,
      },
      where: {
        city: {
          not: '',
        },
      },
    });

    const geographic = geographic_data
      .map(g => ({
        location: g.city,
        count: g._count.city,
      }))
      .sort((a, b) => b.count - a.count);

    // Recent studios
    const recent_studios = await db.studio_profiles.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        is_verified: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
    });

    // Recent users
    const recent_users = await db.users.findMany({
      select: {
        id: true,
        username: true,
        display_name: true,
        role: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
    });

    return NextResponse.json({
      overview: {
        total_users,
        total_studios,
        active_studios,
        verified_studios,
        featured_studios,
        premium_studios,
        users_with_studios,
      },
      user_roles,
      studio_status,
      connection_methods,
      custom_connections,
      geographic,
      recent_studios,
      recent_users,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
