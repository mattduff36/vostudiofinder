import { Metadata } from 'next';
import { requireRole } from '@/lib/auth-guards';
import { Role, UserStatus } from '@prisma/client';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Admin Dashboard - VoiceoverStudioFinder',
  description: 'Manage users, studios, reviews, and platform settings',
};

export default async function AdminPage() {
  // Ensure user has admin permissions
  await requireRole(Role.ADMIN);

  // Fetch dashboard statistics
  const [
    totalUsers,
    totalStudios,
    activeStudios,
    verifiedStudios,
    featuredStudios,
    activeUsers30d,
    totalPayments,
    totalPaymentAmount,
    recentPaymentAmount,
    pendingReservations,
    expiredReservations,
    totalIssues,
    openIssues,
    totalSuggestions,
    openSuggestions,
  ] = await Promise.all([
    // Total registered users
    db.users.count(),
    
    // Total studio profiles (1:1 with users who have studios)
    db.studio_profiles.count(),
    
    // Active studios
    db.studio_profiles.count({ where: { status: 'ACTIVE' } }),
    
    // Verified studios
    db.studio_profiles.count({ where: { is_verified: true } }),
    
    // Featured studios
    db.studio_profiles.count({ where: { is_featured: true } }),
    
    // Active users in last 30 days (based on updated_at)
    db.users.count({
      where: {
        updated_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    
    // Total payments count
    db.payments.count(),
    
    // Total payment amount (sum of all succeeded payments in pence)
    db.payments.aggregate({
      where: { status: 'SUCCEEDED' },
      _sum: { amount: true },
    }).then(result => result._sum.amount || 0),
    
    // Recent payment amount (last 30 days, succeeded payments in pence)
    db.payments.aggregate({
      where: {
        status: 'SUCCEEDED',
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      _sum: { amount: true },
    }).then(result => result._sum.amount || 0),
    
    // Pending reservations
    db.users.count({ where: { status: UserStatus.PENDING } }),
    
    // Expired reservations
    db.users.count({ where: { status: UserStatus.EXPIRED } }),
    
    // Total issues
    db.support_tickets.count({ where: { type: 'ISSUE' } }),
    
    // Open issues
    db.support_tickets.count({
      where: {
        type: 'ISSUE',
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
      },
    }),
    
    // Total suggestions
    db.support_tickets.count({ where: { type: 'SUGGESTION' } }),
    
    // Open suggestions
    db.support_tickets.count({
      where: {
        type: 'SUGGESTION',
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
      },
    }),
  ]);

  // Fetch recent activity data
  const [
    recentUsers,
    recentPayments,
    recentStudios,
    recentReviews,
    usersWithCustomConnections,
    customConnectionsList,
  ] = await Promise.all([
    // Recent users (last 20) with studio info
    db.users.findMany({
      take: 20,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        status: true,
        created_at: true,
        studio_profiles: {
          select: {
            id: true,
            name: true,
            city: true,
            status: true,
            is_verified: true,
            is_featured: true,
          },
        },
      },
    }),

    // Recent payments (last 15) with user info
    db.payments.findMany({
      take: 15,
      orderBy: { created_at: 'desc' },
      where: { status: 'SUCCEEDED' },
      select: {
        id: true,
        amount: true,
        currency: true,
        created_at: true,
        users: {
          select: {
            id: true,
            username: true,
            display_name: true,
          },
        },
      },
    }),

    // Recent studio updates (last 15)
    db.studio_profiles.findMany({
      take: 15,
      orderBy: { updated_at: 'desc' },
      select: {
        id: true,
        name: true,
        city: true,
        status: true,
        is_verified: true,
        is_featured: true,
        updated_at: true,
        created_at: true,
        users: {
          select: {
            username: true,
            display_name: true,
          },
        },
      },
    }),

    // Recent reviews (last 10)
    db.reviews.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        rating: true,
        content: true,
        created_at: true,
        studio_profiles: {
          select: {
            name: true,
          },
        },
        users_reviews_reviewer_idTousers: {
          select: {
            username: true,
            display_name: true,
          },
        },
      },
    }),

    // Studios with custom connections
    db.studio_profiles.findMany({
      where: {
        custom_connection_methods: {
          isEmpty: false,
        },
      },
      select: {
        custom_connection_methods: true,
        name: true,
        updated_at: true,
        users: {
          select: {
            username: true,
            display_name: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
      take: 20,
    }),

    // Get all unique custom connection methods
    db.studio_profiles.findMany({
      where: {
        custom_connection_methods: {
          isEmpty: false,
        },
      },
      select: {
        custom_connection_methods: true,
      },
    }),
  ]);

  // Aggregate custom connections
  const customConnectionsMap = new Map<string, number>();
  customConnectionsList.forEach(profile => {
    profile.custom_connection_methods.forEach(method => {
      if (method && method.trim()) {
        customConnectionsMap.set(method.trim(), (customConnectionsMap.get(method.trim()) || 0) + 1);
      }
    });
  });
  const customConnectionsStats = Array.from(customConnectionsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const stats = {
    totalUsers,
    totalStudios,
    activeStudios,
    verifiedStudios,
    featuredStudios,
    activeUsers30d,
    totalPayments,
    totalPaymentAmount,
    recentPaymentAmount,
    pendingReservations,
    totalReservations: pendingReservations + expiredReservations,
    totalIssues,
    openIssues,
    totalSuggestions,
    openSuggestions,
  };

  return (
    <AdminDashboard 
      stats={stats}
      recentActivity={{
        users: recentUsers,
        payments: recentPayments,
        studios: recentStudios,
        reviews: recentReviews,
        customConnections: usersWithCustomConnections,
        customConnectionsStats,
      }}
    />
  );
}
